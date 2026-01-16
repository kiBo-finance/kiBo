import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  baseCurrency: z.string().length(3).optional(),
  name: z.string().min(1).max(100).optional(),
})

/**
 * GET /api/user/settings
 * 現在のユーザー設定を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        baseCurrency: true,
        isAdmin: true,
        createdAt: true,
      },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    return Response.json(user)
  } catch (error) {
    console.error('Failed to fetch user settings:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/user/settings
 * ユーザー設定を更新
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    // baseCurrencyが指定された場合、有効な通貨コードかチェック
    if (validatedData.baseCurrency) {
      const currency = await prisma.currency.findUnique({
        where: { code: validatedData.baseCurrency },
      })

      if (!currency) {
        return Response.json({ error: 'Invalid currency code' }, { status: 400 })
      }

      if (!currency.isActive) {
        return Response.json({ error: 'Currency is not active' }, { status: 400 })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        baseCurrency: true,
        isAdmin: true,
        createdAt: true,
      },
    })

    return Response.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to update user settings:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
