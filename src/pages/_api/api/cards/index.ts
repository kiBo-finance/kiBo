import { auth } from '../../../../lib/auth'
import { CardService } from '../../../../lib/services/card-service'
import type { SessionUser } from '../../../../lib/types/auth'
import { CardType } from '@prisma/client'
import { z } from 'zod'

const CreateCardSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(CardType),
  brand: z.string().optional(),
  lastFourDigits: z.string().length(4),
  accountId: z.string(),

  // クレジットカード用
  creditLimit: z.number().positive().optional(),
  billingDate: z.number().min(1).max(31).optional(),
  paymentDate: z.number().min(1).max(31).optional(),

  // プリペイドカード用
  balance: z.number().min(0).optional(),

  // デビットカード用
  linkedAccountId: z.string().optional(),
  autoTransferEnabled: z.boolean().optional(),
  minBalance: z.number().min(0).optional(),

  // ポストペイカード用
  monthlyLimit: z.number().positive().optional(),
  settlementDay: z.number().min(1).max(31).optional(),

  expiryDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
})

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const user = session.user as SessionUser
    const cards = await CardService.getCards(user.id, includeInactive)

    return Response.json({
      success: true,
      data: cards,
    })
  } catch (error) {
    console.error('Failed to fetch cards:', error)
    return Response.json({ error: 'Failed to fetch cards' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateCardSchema.parse(body)

    // カードタイプ別のバリデーション
    switch (validatedData.type) {
      case 'CREDIT':
        if (!validatedData.creditLimit) {
          return Response.json(
            { error: 'Credit limit is required for credit cards' },
            { status: 400 }
          )
        }
        break

      case 'DEBIT':
        if (validatedData.autoTransferEnabled && !validatedData.linkedAccountId) {
          return Response.json(
            { error: 'Linked account is required when auto transfer is enabled' },
            { status: 400 }
          )
        }
        break

      case 'PREPAID':
        if (validatedData.balance === undefined) {
          validatedData.balance = 0 // デフォルト値設定
        }
        break

      case 'POSTPAY':
        if (!validatedData.monthlyLimit) {
          return Response.json(
            { error: 'Monthly limit is required for postpay cards' },
            { status: 400 }
          )
        }
        break
    }

    const user = session.user as SessionUser
    const card = await CardService.createCard(user.id, validatedData)

    return Response.json(
      {
        success: true,
        data: card,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to create card:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create card' },
      { status: 500 }
    )
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
