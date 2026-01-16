import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/types/auth'
import { Decimal } from 'decimal.js'
import { z } from 'zod'

const updateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  categoryId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

interface RouteParams {
  id: string
}

/**
 * GET /api/budgets/[id]
 * 予算の詳細を取得
 */
export async function GET(request: Request, params: RouteParams): Promise<Response> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { id } = params

    const budget = await prisma.budget.findFirst({
      where: {
        id,
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

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 })
    }

    // 実際の支出額を計算
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

    // 関連する取引を取得
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    })

    const spentAmount = spent._sum.amount ? Number(spent._sum.amount) : 0

    return Response.json({
      success: true,
      data: {
        ...budget,
        spent: spentAmount,
        remaining: Number(budget.amount) - spentAmount,
        percentUsed: spentAmount
          ? Math.round((spentAmount / Number(budget.amount)) * 100)
          : 0,
        recentTransactions: transactions,
      },
    })
  } catch (error) {
    console.error('Failed to fetch budget:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/budgets/[id]
 * 予算を更新
 */
export async function PATCH(request: Request, params: RouteParams): Promise<Response> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { id } = params

    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingBudget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateBudgetSchema.parse(body)

    // カテゴリが変更された場合は存在確認
    if (validatedData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: validatedData.categoryId,
          userId: user.id,
        },
      })

      if (!category) {
        return Response.json({ error: 'Category not found' }, { status: 404 })
      }
    }

    const updateData: Record<string, unknown> = {}

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.amount !== undefined) updateData.amount = new Decimal(validatedData.amount)
    if (validatedData.currency !== undefined) updateData.currency = validatedData.currency
    if (validatedData.categoryId !== undefined) updateData.categoryId = validatedData.categoryId
    if (validatedData.startDate !== undefined)
      updateData.startDate = new Date(validatedData.startDate)
    if (validatedData.endDate !== undefined) updateData.endDate = new Date(validatedData.endDate)
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
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

    return Response.json({ success: true, data: budget })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to update budget:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/budgets/[id]
 * 予算を削除
 */
export async function DELETE(request: Request, params: RouteParams): Promise<Response> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { id } = params

    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingBudget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 })
    }

    await prisma.budget.delete({
      where: { id },
    })

    return Response.json({ success: true, message: 'Budget deleted successfully' })
  } catch (error) {
    console.error('Failed to delete budget:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
