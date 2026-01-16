import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/types/auth'
import type { Prisma } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { z } from 'zod'

const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  categoryId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

/**
 * GET /api/budgets
 * ユーザーの予算一覧を取得
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
    const activeOnly = searchParams.get('active') !== 'false'
    const categoryId = searchParams.get('categoryId')
    const includeSpent = searchParams.get('includeSpent') === 'true'

    const user = session.user as SessionUser
    const whereClause: Prisma.BudgetWhereInput = {
      userId: user.id,
    }

    if (activeOnly) {
      whereClause.isActive = true
    }

    if (categoryId) {
      whereClause.categoryId = categoryId
    }

    const budgets = await prisma.budget.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            type: true,
          },
        },
      },
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
    })

    // 支出額を含める場合は、各予算に対して実際の支出額を計算
    if (includeSpent) {
      const budgetsWithSpent = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await prisma.transaction.aggregate({
            where: {
              userId: user.id,
              categoryId: budget.categoryId,
              type: 'EXPENSE',
              date: {
                gte: budget.startDate,
                lte: budget.endDate,
              },
            },
            _sum: {
              amount: true,
            },
          })

          return {
            ...budget,
            spent: spent._sum.amount ? Number(spent._sum.amount) : 0,
            remaining: Number(budget.amount) - (spent._sum.amount ? Number(spent._sum.amount) : 0),
            percentUsed: spent._sum.amount
              ? Math.round((Number(spent._sum.amount) / Number(budget.amount)) * 100)
              : 0,
          }
        })
      )

      return Response.json({
        success: true,
        data: budgetsWithSpent,
      })
    }

    return Response.json({
      success: true,
      data: budgets,
    })
  } catch (error) {
    console.error('Failed to fetch budgets:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/budgets
 * 新しい予算を作成
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createBudgetSchema.parse(body)

    const user = session.user as SessionUser

    // カテゴリが存在するかチェック
    const category = await prisma.category.findFirst({
      where: {
        id: validatedData.categoryId,
        userId: user.id,
      },
    })

    if (!category) {
      return Response.json({ error: 'Category not found' }, { status: 404 })
    }

    // 同じカテゴリで重複する期間の予算がないかチェック
    const overlappingBudget = await prisma.budget.findFirst({
      where: {
        userId: user.id,
        categoryId: validatedData.categoryId,
        isActive: true,
        OR: [
          {
            startDate: { lte: new Date(validatedData.startDate) },
            endDate: { gte: new Date(validatedData.startDate) },
          },
          {
            startDate: { lte: new Date(validatedData.endDate) },
            endDate: { gte: new Date(validatedData.endDate) },
          },
          {
            startDate: { gte: new Date(validatedData.startDate) },
            endDate: { lte: new Date(validatedData.endDate) },
          },
        ],
      },
    })

    if (overlappingBudget) {
      return Response.json(
        { error: 'A budget for this category already exists for the specified period' },
        { status: 409 }
      )
    }

    const budget = await prisma.budget.create({
      data: {
        name: validatedData.name,
        amount: new Decimal(validatedData.amount),
        currency: validatedData.currency,
        categoryId: validatedData.categoryId,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        userId: user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            type: true,
          },
        },
      },
    })

    return Response.json({ success: true, data: budget }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to create budget:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
