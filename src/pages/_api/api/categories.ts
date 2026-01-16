import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/types/auth'
import type { Prisma, TransactionType } from '@prisma/client'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  icon: z.string().max(50).default('tag'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  parentId: z.string().cuid().optional(),
})

/**
 * GET /api/categories
 * ユーザーのカテゴリ一覧を取得
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
    const type = searchParams.get('type') as TransactionType | null
    const parentOnly = searchParams.get('parentOnly') === 'true'

    const user = session.user as SessionUser
    const whereClause: Prisma.CategoryWhereInput = {
      userId: user.id,
    }

    if (activeOnly) {
      whereClause.isActive = true
    }

    if (type) {
      whereClause.type = type
    }

    if (parentOnly) {
      whereClause.parentId = null
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      include: {
        children: {
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            transactions: true,
            budgets: true,
          },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    return Response.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/categories
 * 新しいカテゴリを作成
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
    const validatedData = createCategorySchema.parse(body)

    const user = session.user as SessionUser

    // 親カテゴリが指定されている場合は存在確認
    if (validatedData.parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: validatedData.parentId,
          userId: user.id,
        },
      })

      if (!parentCategory) {
        return Response.json({ error: 'Parent category not found' }, { status: 404 })
      }

      // 親カテゴリと同じタイプである必要がある
      if (parentCategory.type !== validatedData.type) {
        return Response.json(
          { error: 'Subcategory must have the same type as parent category' },
          { status: 400 }
        )
      }
    }

    // 同名のカテゴリが存在するかチェック
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: validatedData.name,
        type: validatedData.type,
        parentId: validatedData.parentId || null,
        isActive: true,
      },
    })

    if (existingCategory) {
      return Response.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      )
    }

    const category = await prisma.category.create({
      data: {
        ...validatedData,
        userId: user.id,
      },
      include: {
        children: true,
      },
    })

    return Response.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to create category:', error)
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
