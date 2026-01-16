import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/types/auth'
import type { TransactionType } from '@prisma/client'

/**
 * GET /api/reports
 * レポート用の集計データを取得
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') as 'summary' | 'category' | 'monthly' | 'account' | null

    const user = session.user as SessionUser

    // デフォルトの期間：今月
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const dateFilter = {
      gte: startDate ? new Date(startDate) : defaultStart,
      lte: endDate ? new Date(endDate) : defaultEnd,
    }

    // タイプに応じてデータを取得
    switch (type) {
      case 'category':
        return await getCategoryReport(user.id, dateFilter)
      case 'monthly':
        return await getMonthlyReport(user.id)
      case 'account':
        return await getAccountReport(user.id, dateFilter)
      case 'summary':
      default:
        return await getSummaryReport(user.id, dateFilter)
    }
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function getSummaryReport(
  userId: string,
  dateFilter: { gte: Date; lte: Date }
): Promise<Response> {
  // 収入合計
  const income = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'INCOME',
      date: dateFilter,
    },
    _sum: { amount: true },
    _count: true,
  })

  // 支出合計
  const expense = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'EXPENSE',
      date: dateFilter,
    },
    _sum: { amount: true },
    _count: true,
  })

  // 振替合計
  const transfer = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'TRANSFER',
      date: dateFilter,
    },
    _sum: { amount: true },
    _count: true,
  })

  // 口座別残高
  const accounts = await prisma.appAccount.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      currency: true,
    },
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

  // 予算達成状況
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lte: dateFilter.lte },
      endDate: { gte: dateFilter.gte },
    },
    include: {
      category: { select: { name: true, color: true } },
    },
  })

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (budget) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          date: dateFilter,
        },
        _sum: { amount: true },
      })

      return {
        ...budget,
        spent: spent._sum.amount ? Number(spent._sum.amount) : 0,
        percentUsed: spent._sum.amount
          ? Math.round((Number(spent._sum.amount) / Number(budget.amount)) * 100)
          : 0,
      }
    })
  )

  return Response.json({
    success: true,
    data: {
      period: {
        start: dateFilter.gte.toISOString(),
        end: dateFilter.lte.toISOString(),
      },
      income: {
        total: income._sum.amount ? Number(income._sum.amount) : 0,
        count: income._count,
      },
      expense: {
        total: expense._sum.amount ? Number(expense._sum.amount) : 0,
        count: expense._count,
      },
      transfer: {
        total: transfer._sum.amount ? Number(transfer._sum.amount) : 0,
        count: transfer._count,
      },
      netIncome:
        (income._sum.amount ? Number(income._sum.amount) : 0) -
        (expense._sum.amount ? Number(expense._sum.amount) : 0),
      totalBalance,
      accounts,
      budgets: budgetsWithSpent,
    },
  })
}

async function getCategoryReport(
  userId: string,
  dateFilter: { gte: Date; lte: Date }
): Promise<Response> {
  // カテゴリ別支出
  const categoryExpenses = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'EXPENSE',
      date: dateFilter,
      categoryId: { not: null },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: {
      _sum: { amount: 'desc' },
    },
  })

  // カテゴリ情報を取得
  const categoryIds = categoryExpenses.map((e) => e.categoryId).filter(Boolean) as string[]
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, color: true, icon: true },
  })

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const expensesByCategory = categoryExpenses.map((e) => ({
    category: e.categoryId ? categoryMap.get(e.categoryId) : null,
    total: e._sum.amount ? Number(e._sum.amount) : 0,
    count: e._count,
  }))

  // カテゴリ別収入
  const categoryIncomes = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'INCOME',
      date: dateFilter,
      categoryId: { not: null },
    },
    _sum: { amount: true },
    _count: true,
    orderBy: {
      _sum: { amount: 'desc' },
    },
  })

  const incomeCategoryIds = categoryIncomes.map((e) => e.categoryId).filter(Boolean) as string[]
  const incomeCategories = await prisma.category.findMany({
    where: { id: { in: incomeCategoryIds } },
    select: { id: true, name: true, color: true, icon: true },
  })

  const incomeCategoryMap = new Map(incomeCategories.map((c) => [c.id, c]))

  const incomesByCategory = categoryIncomes.map((e) => ({
    category: e.categoryId ? incomeCategoryMap.get(e.categoryId) : null,
    total: e._sum.amount ? Number(e._sum.amount) : 0,
    count: e._count,
  }))

  // 未分類の取引
  const uncategorizedExpense = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'EXPENSE',
      date: dateFilter,
      categoryId: null,
    },
    _sum: { amount: true },
    _count: true,
  })

  return Response.json({
    success: true,
    data: {
      period: {
        start: dateFilter.gte.toISOString(),
        end: dateFilter.lte.toISOString(),
      },
      expenses: expensesByCategory,
      incomes: incomesByCategory,
      uncategorizedExpense: {
        total: uncategorizedExpense._sum.amount ? Number(uncategorizedExpense._sum.amount) : 0,
        count: uncategorizedExpense._count,
      },
    },
  })
}

async function getMonthlyReport(userId: string): Promise<Response> {
  // 過去12ヶ月のデータを取得
  const now = new Date()
  const months: Array<{
    year: number
    month: number
    income: number
    expense: number
    netIncome: number
  }> = []

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    const income = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'INCOME',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    })

    const expense = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    })

    const incomeAmount = income._sum.amount ? Number(income._sum.amount) : 0
    const expenseAmount = expense._sum.amount ? Number(expense._sum.amount) : 0

    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      income: incomeAmount,
      expense: expenseAmount,
      netIncome: incomeAmount - expenseAmount,
    })
  }

  // 平均値を計算
  const totalIncome = months.reduce((sum, m) => sum + m.income, 0)
  const totalExpense = months.reduce((sum, m) => sum + m.expense, 0)

  return Response.json({
    success: true,
    data: {
      months,
      averages: {
        income: Math.round(totalIncome / 12),
        expense: Math.round(totalExpense / 12),
        netIncome: Math.round((totalIncome - totalExpense) / 12),
      },
    },
  })
}

async function getAccountReport(
  userId: string,
  dateFilter: { gte: Date; lte: Date }
): Promise<Response> {
  // 口座一覧
  const accounts = await prisma.appAccount.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      currency: true,
    },
  })

  // 口座別の収支
  const accountStats = await Promise.all(
    accounts.map(async (account) => {
      const income = await prisma.transaction.aggregate({
        where: {
          userId,
          accountId: account.id,
          type: 'INCOME',
          date: dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      })

      const expense = await prisma.transaction.aggregate({
        where: {
          userId,
          accountId: account.id,
          type: 'EXPENSE',
          date: dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      })

      return {
        account,
        income: {
          total: income._sum.amount ? Number(income._sum.amount) : 0,
          count: income._count,
        },
        expense: {
          total: expense._sum.amount ? Number(expense._sum.amount) : 0,
          count: expense._count,
        },
        netFlow:
          (income._sum.amount ? Number(income._sum.amount) : 0) -
          (expense._sum.amount ? Number(expense._sum.amount) : 0),
      }
    })
  )

  return Response.json({
    success: true,
    data: {
      period: {
        start: dateFilter.gte.toISOString(),
        end: dateFilter.lte.toISOString(),
      },
      accounts: accountStats,
    },
  })
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
