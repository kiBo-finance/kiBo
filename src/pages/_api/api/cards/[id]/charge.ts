import { auth } from '../../../../lib/auth'
import { CardService } from '../../../../lib/services/card-service'
import type { SessionUser } from '../../../../lib/types/auth'
import { z } from 'zod'

const ChargeSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = ChargeSchema.parse(body)
    const user = session.user as SessionUser

    await CardService.chargePrepaidCard(
      user.id,
      id,
      validatedData.amount,
      validatedData.fromAccountId
    )

    return Response.json({
      success: true,
      message: 'Card charged successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Card charge failed:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Charge failed' },
      { status: 400 }
    )
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
