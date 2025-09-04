import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { CardService } from '@/lib/services/card-service'
import { z } from 'zod'

const ChargeSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string()
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
    const validatedData = ChargeSchema.parse(body)

    await CardService.chargePrepaidCard(
      (session.user as any).id,
      id,
      validatedData.amount,
      validatedData.fromAccountId
    )

    return NextResponse.json({
      success: true,
      message: 'Card charged successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Card charge failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Charge failed' },
      { status: 400 }
    )
  }
}