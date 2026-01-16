import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createCurrencySchema = z.object({
  code: z.string().length(3).toUpperCase(),
  symbol: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  decimals: z.number().int().min(0).max(8),
  isActive: z.boolean().default(true),
})

/**
 * GET /api/currencies
 * 利用可能な通貨一覧を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const currencies = await prisma.currency.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ code: 'asc' }],
    })

    return Response.json(currencies)
  } catch (error) {
    console.error('Failed to fetch currencies:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/currencies
 * 新しい通貨を追加（管理者権限が必要）
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (!session.user.isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createCurrencySchema.parse(body)

    // 既存の通貨コードチェック
    const existingCurrency = await prisma.currency.findUnique({
      where: { code: validatedData.code },
    })

    if (existingCurrency) {
      return Response.json({ error: 'Currency code already exists' }, { status: 409 })
    }

    const currency = await prisma.currency.create({
      data: validatedData,
    })

    return Response.json(currency, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to create currency:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
