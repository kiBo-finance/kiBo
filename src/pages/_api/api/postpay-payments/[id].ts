import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { PostpayPaymentStatus, Prisma } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { z } from 'zod'

const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'PAID', 'OVERDUE']).optional(),
  paidAt: z.string().datetime().optional(),
  paidAmount: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/postpay-payments/[id]
 * 特定のポストペイ支払いを取得
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payment = await prisma.postpayPayment.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
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

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }

    return Response.json(payment)
  } catch (error) {
    console.error('Failed to fetch postpay payment:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/postpay-payments/[id]
 * ポストペイ支払いを更新
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePaymentSchema.parse(body)

    // 支払いの存在確認
    const existingPayment = await prisma.postpayPayment.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingPayment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }

    // 更新データを構築
    const updateData: Prisma.PostpayPaymentUpdateInput = {}

    if (validatedData.status) {
      updateData.status = validatedData.status as PostpayPaymentStatus

      // PAIDに変更した場合、支払い日を自動設定
      if (validatedData.status === 'PAID' && !validatedData.paidAt) {
        updateData.paidAt = new Date()
        if (!validatedData.paidAmount) {
          updateData.paidAmount = existingPayment.chargeAmount
        }
      }
    }

    if (validatedData.paidAt) {
      updateData.paidAt = new Date(validatedData.paidAt)
    }

    if (validatedData.paidAmount !== undefined) {
      updateData.paidAmount = new Decimal(validatedData.paidAmount)
    }

    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate)
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    const updatedPayment = await prisma.postpayPayment.update({
      where: { id: params.id },
      data: updateData,
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

    return Response.json(updatedPayment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to update postpay payment:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/postpay-payments/[id]
 * ポストペイ支払いを削除
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 支払いの存在確認
    const existingPayment = await prisma.postpayPayment.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingPayment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 })
    }

    await prisma.postpayPayment.delete({
      where: { id: params.id },
    })

    return Response.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    console.error('Failed to delete postpay payment:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
