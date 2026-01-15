import { auth } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'
import { CardService } from '../../../../lib/services/card-service'
import type { SessionUser } from '../../../../lib/types/auth'
import { z } from 'zod'

// Extract ID from URL path
function getIdFromUrl(request: Request): string | null {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]
  return id ? id : null
}

const UpdateCardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  brand: z.string().optional(),
  creditLimit: z.number().positive().optional(),
  billingDate: z.number().min(1).max(31).optional(),
  paymentDate: z.number().min(1).max(31).optional(),
  balance: z.number().min(0).optional(),
  linkedAccountId: z.string().optional(),
  autoTransferEnabled: z.boolean().optional(),
  minBalance: z.number().min(0).optional(),
  monthlyLimit: z.number().positive().optional(),
  settlementDay: z.number().min(1).max(31).optional(),
  expiryDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  isActive: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    const card = await CardService.getCardDetail(user.id, id)

    return Response.json({
      success: true,
      data: card,
    })
  } catch (error) {
    console.error('Failed to fetch card:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch card' },
      { status: 404 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateCardSchema.parse(body)
    const user = session.user as SessionUser

    const card = await CardService.updateCard(user.id, id, validatedData)

    return Response.json({
      success: true,
      data: card,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to update card:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update card' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const userId = user.id

    // カードの存在確認
    const card = await prisma.card.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 })
    }

    // 関連する取引があるかチェック
    const transactionCount = await prisma.transaction.count({
      where: { cardId: id },
    })

    if (transactionCount > 0) {
      // 取引がある場合は非アクティブ化
      await prisma.card.update({
        where: { id },
        data: { isActive: false },
      })

      return Response.json({
        success: true,
        message: 'Card deactivated (has existing transactions)',
      })
    } else {
      // 取引がない場合は削除
      await prisma.card.delete({
        where: { id },
      })

      return Response.json({
        success: true,
        message: 'Card deleted successfully',
      })
    }
  } catch (error) {
    console.error('Failed to delete card:', error)
    return Response.json({ error: 'Failed to delete card' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
