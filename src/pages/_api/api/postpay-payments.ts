import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { PostpayPaymentStatus, Prisma } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { z } from 'zod'

const createPaymentSchema = z.object({
  cardId: z.string(),
  chargeAmount: z.number().positive(),
  currency: z.string().length(3),
  chargeDate: z.string().datetime(),
  description: z.string().min(1),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
})

const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'PAID', 'OVERDUE']).optional(),
  paidAt: z.string().datetime().optional(),
  paidAmount: z.number().positive().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/postpay-payments
 * ポストペイ支払い一覧を取得
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
    const cardId = searchParams.get('cardId')
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    const whereClause: Prisma.PostpayPaymentWhereInput = {
      userId: session.user.id,
    }

    if (cardId) {
      whereClause.cardId = cardId
    }

    if (status) {
      whereClause.status = status as PostpayPaymentStatus
    }

    // 今後の支払い（期限が今日以降のPENDINGまたはSCHEDULED）
    if (upcoming) {
      whereClause.status = undefined
      whereClause.dueDate = { gte: new Date() }
    }

    const payments = await prisma.postpayPayment.findMany({
      where: whereClause,
      include: {
        card: {
          select: {
            id: true,
            name: true,
            type: true,
            brand: true,
            lastFourDigits: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    return Response.json(payments)
  } catch (error) {
    console.error('Failed to fetch postpay payments:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/postpay-payments
 * 新しいポストペイ支払いを登録
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // カードの存在確認とPOSTPAYタイプ確認
    const card = await prisma.card.findFirst({
      where: {
        id: validatedData.cardId,
        userId: session.user.id,
      },
    })

    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 })
    }

    if (card.type !== 'POSTPAY') {
      return Response.json(
        { error: 'This card is not a postpay card' },
        { status: 400 }
      )
    }

    // 通貨の存在確認
    const currency = await prisma.currency.findUnique({
      where: { code: validatedData.currency },
    })

    if (!currency) {
      return Response.json({ error: 'Currency not found' }, { status: 400 })
    }

    const payment = await prisma.postpayPayment.create({
      data: {
        cardId: validatedData.cardId,
        userId: session.user.id,
        chargeAmount: new Decimal(validatedData.chargeAmount),
        currency: validatedData.currency,
        chargeDate: new Date(validatedData.chargeDate),
        description: validatedData.description,
        dueDate: new Date(validatedData.dueDate),
        notes: validatedData.notes,
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            type: true,
            brand: true,
            lastFourDigits: true,
          },
        },
      },
    })

    return Response.json(payment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to create postpay payment:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
