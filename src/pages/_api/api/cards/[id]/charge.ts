import { auth } from '../../../../../lib/auth'
import { CardService } from '../../../../../lib/services/card-service'
import type { SessionUser } from '../../../../../lib/types/auth'
import { z } from 'zod'

function getIdFromUrl(request: Request): string | null {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  // Find 'cards' index and get the next segment
  const cardsIndex = pathParts.indexOf('cards')
  if (cardsIndex !== -1 && cardsIndex + 1 < pathParts.length) {
    return pathParts[cardsIndex + 1]
  }
  return null
}

const ChargeSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string(),
})

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'Card ID is required' }, { status: 400 })
    }
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
