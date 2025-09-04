import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { CardService } from '@/lib/services/card-service'
import { prisma } from '@/lib/db'
import { z } from 'zod'

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
  expiryDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  isActive: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const card = await CardService.getCardDetail(
      (session.user as any).id,
      id
    )

    return NextResponse.json({
      success: true,
      data: card
    })

  } catch (error) {
    console.error('Failed to fetch card:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch card' },
      { status: 404 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = UpdateCardSchema.parse(body)

    const card = await CardService.updateCard(
      (session.user as any).id,
      id,
      validatedData
    )

    return NextResponse.json({
      success: true,
      data: card
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to update card:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update card' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const userId = (session.user as any).id

    // カードの存在確認
    const card = await prisma.card.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // 関連する取引があるかチェック
    const transactionCount = await prisma.transaction.count({
      where: { cardId: id }
    })

    if (transactionCount > 0) {
      // 取引がある場合は非アクティブ化
      await prisma.card.update({
        where: { id },
        data: { isActive: false }
      })

      return NextResponse.json({
        success: true,
        message: 'Card deactivated (has existing transactions)'
      })
    } else {
      // 取引がない場合は削除
      await prisma.card.delete({
        where: { id }
      })

      return NextResponse.json({
        success: true,
        message: 'Card deleted successfully'
      })
    }

  } catch (error) {
    console.error('Failed to delete card:', error)
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    )
  }
}