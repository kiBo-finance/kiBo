import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import Decimal from 'decimal.js'

const GetStatsSchema = z.object({
  period: z.enum(['week', 'month', 'year']).optional().default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  currency: z.string().optional(),
  accountId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = GetStatsSchema.parse(params)

    // 期間の設定
    let startDate: Date
    let endDate: Date

    if (validatedParams.startDate && validatedParams.endDate) {
      startDate = new Date(validatedParams.startDate)
      endDate = new Date(validatedParams.endDate)
    } else {
      endDate = new Date()
      
      switch (validatedParams.period) {
        case 'week':
          startDate = new Date()
          startDate.setDate(endDate.getDate() - 7)
          break
        case 'year':
          startDate = new Date()
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        case 'month':
        default:
          startDate = new Date()
          startDate.setMonth(endDate.getMonth() - 1)
          break
      }
    }

    // フィルタ条件の構築
    const where: any = {
      userId: (session.user as any).id,
      date: {
        gte: startDate,
        lte: endDate
      }
    }

    if (validatedParams.currency) {
      where.currency = validatedParams.currency
    }

    if (validatedParams.accountId) {
      where.accountId = validatedParams.accountId
    }

    // 統計データの並列取得
    const [
      totalIncome,
      totalExpense,
      transactionCount,
      categoryBreakdown,
      dailyTrends,
      topCategories,
      accountBreakdown
    ] = await Promise.all([
      // 総収入
      prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'INCOME'
        },
        _sum: {
          amount: true
        }
      }),

      // 総支出
      prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'EXPENSE'
        },
        _sum: {
          amount: true
        }
      }),

      // 取引数
      prisma.transaction.count({ where }),

      // カテゴリ別内訳
      prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where,
        _sum: {
          amount: true
        },
        _count: true
      }),

      // 日別推移
      prisma.$queryRaw`
        SELECT 
          DATE(date) as date,
          type,
          SUM(amount) as amount,
          COUNT(*) as count
        FROM transactions
        WHERE user_id = ${(session.user as any).id}
          AND date >= ${startDate}
          AND date <= ${endDate}
          ${validatedParams.currency ? Prisma.sql`AND currency = ${validatedParams.currency}` : Prisma.empty}
          ${validatedParams.accountId ? Prisma.sql`AND account_id = ${validatedParams.accountId}` : Prisma.empty}
        GROUP BY DATE(date), type
        ORDER BY date DESC
      `,

      // トップカテゴリ（支出）
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          ...where,
          type: 'EXPENSE',
          categoryId: {
            not: null
          }
        },
        _sum: {
          amount: true
        },
        orderBy: {
          _sum: {
            amount: 'desc'
          }
        },
        take: 10
      }),

      // 口座別内訳
      prisma.transaction.groupBy({
        by: ['accountId'],
        where,
        _sum: {
          amount: true
        },
        _count: true
      })
    ])

    // カテゴリ情報を取得
    const categoryIds = [...new Set([
      ...categoryBreakdown.map(item => item.categoryId).filter(Boolean),
      ...topCategories.map(item => item.categoryId).filter(Boolean)
    ])] as string[]

    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        userId: (session.user as any).id
      }
    })

    const categoryMap = new Map(categories.map(cat => [cat.id, cat]))

    // 口座情報を取得
    const accountIds = accountBreakdown.map(item => item.accountId)
    const accounts = await prisma.appAccount.findMany({
      where: {
        id: { in: accountIds },
        userId: (session.user as any).id
      },
      include: {
        currencyRef: true
      }
    })

    const accountMap = new Map(accounts.map(acc => [acc.id, acc]))

    // データを整形
    const formattedCategoryBreakdown = categoryBreakdown.map(item => ({
      categoryId: item.categoryId,
      category: item.categoryId ? categoryMap.get(item.categoryId) : null,
      type: item.type,
      amount: item._sum.amount?.toString() || '0',
      count: item._count
    }))

    const formattedTopCategories = topCategories.map(item => ({
      categoryId: item.categoryId,
      category: categoryMap.get(item.categoryId!),
      amount: item._sum.amount?.toString() || '0'
    })).filter(item => item.category)

    const formattedAccountBreakdown = accountBreakdown.map(item => ({
      accountId: item.accountId,
      account: accountMap.get(item.accountId),
      amount: item._sum.amount?.toString() || '0',
      count: item._count
    }))

    // 日別推移のデータ整形
    const formattedDailyTrends = (dailyTrends as any[]).map(item => ({
      date: item.date,
      type: item.type,
      amount: item.amount?.toString() || '0',
      count: parseInt(item.count) || 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalIncome: totalIncome._sum.amount?.toString() || '0',
          totalExpense: totalExpense._sum.amount?.toString() || '0',
          netIncome: new Decimal(totalIncome._sum.amount || 0)
            .minus(new Decimal(totalExpense._sum.amount || 0))
            .toString(),
          transactionCount,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        },
        breakdown: {
          byCategory: formattedCategoryBreakdown,
          byAccount: formattedAccountBreakdown,
          topExpenseCategories: formattedTopCategories
        },
        trends: {
          daily: formattedDailyTrends
        }
      }
    })

  } catch (error) {
    console.error('Transaction stats error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '統計データの取得に失敗しました' },
      { status: 500 }
    )
  }
}