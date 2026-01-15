import { auth } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'
import { z } from 'zod'

function getCodeFromUrl(request: Request): string | null {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const code = pathParts[pathParts.length - 1]
  return code && code !== 'currencies' ? code : null
}

const updateCurrencySchema = z.object({
  symbol: z.string().min(1).max(10).optional(),
  name: z.string().min(1).max(100).optional(),
  decimals: z.number().int().min(0).max(8).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/currencies/[code]
 * 特定の通貨情報を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const code = getCodeFromUrl(request)
    if (!code) {
      return Response.json({ error: 'Currency code is required' }, { status: 400 })
    }

    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!currency) {
      return Response.json({ error: 'Currency not found' }, { status: 404 })
    }

    return Response.json(currency)
  } catch (error) {
    console.error('Failed to fetch currency:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/currencies/[code]
 * 通貨情報を更新（管理者権限が必要）
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const code = getCodeFromUrl(request)
    if (!code) {
      return Response.json({ error: 'Currency code is required' }, { status: 400 })
    }

    // TODO: 管理者権限チェックを実装
    // if (!session.user.isAdmin) {
    //   return Response.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!currency) {
      return Response.json({ error: 'Currency not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateCurrencySchema.parse(body)

    const updatedCurrency = await prisma.currency.update({
      where: { code: code.toUpperCase() },
      data: validatedData,
    })

    return Response.json(updatedCurrency)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to update currency:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/currencies/[code]
 * 通貨を削除（管理者権限が必要）
 * 注意: 使用中の通貨は削除できない
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const code = getCodeFromUrl(request)
    if (!code) {
      return Response.json({ error: 'Currency code is required' }, { status: 400 })
    }

    // TODO: 管理者権限チェックを実装
    // if (!session.user.isAdmin) {
    //   return Response.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!currency) {
      return Response.json({ error: 'Currency not found' }, { status: 404 })
    }

    // 使用中の通貨かチェック
    const usageCount = await prisma.$transaction([
      prisma.appAccount.count({ where: { currency: code.toUpperCase() } }),
      prisma.transaction.count({ where: { currency: code.toUpperCase() } }),
      prisma.scheduledTransaction.count({ where: { currency: code.toUpperCase() } }),
    ])

    const totalUsage = usageCount.reduce((sum, count) => sum + count, 0)

    if (totalUsage > 0) {
      return Response.json(
        { error: 'Cannot delete currency: it is currently in use' },
        { status: 409 }
      )
    }

    await prisma.currency.delete({
      where: { code: code.toUpperCase() },
    })

    return Response.json({ message: 'Currency deleted successfully' })
  } catch (error) {
    console.error('Failed to delete currency:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
