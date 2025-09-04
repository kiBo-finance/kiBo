import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { CardService } from '@/lib/services/card-service'
import { z } from 'zod'

const PaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().min(1),
  categoryId: z.string().optional(),
  date: z.string().datetime().optional()
})

export async function POST(
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
    const validatedData = PaymentSchema.parse(body)

    const transaction = await CardService.processCardPayment(
      (session.user as any).id,
      id,
      validatedData.amount,
      validatedData.currency,
      validatedData.description,
      validatedData.categoryId
    )

    return NextResponse.json({
      success: true,
      data: transaction
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Card payment failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment failed' },
      { status: 400 }
    )
  }
}