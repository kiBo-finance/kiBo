import { auth } from '../../../lib/auth'
import { prisma } from '../../../lib/db'
import type { SessionUser } from '../../../lib/types/auth'
import type { AccountType, Prisma } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { z } from 'zod'

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['CASH', 'CHECKING', 'SAVINGS', 'FIXED_DEPOSIT']),
  currency: z.string().length(3).toUpperCase(),
  balance: z.number().default(0),
  description: z.string().max(500).optional(),
  fixedDepositRate: z.number().min(0).max(100).optional(),
  fixedDepositMaturity: z.string().datetime().optional(),
})

/**
 * GET /api/accounts
 * ユーザーの口座一覧を取得
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'
    const type = searchParams.get('type')
    const currency = searchParams.get('currency')

    const user = session.user as SessionUser
    const whereClause: Prisma.AppAccountWhereInput = {
      userId: user.id,
    }

    if (activeOnly) {
      whereClause.isActive = true
    }

    if (type) {
      whereClause.type = type as AccountType
    }

    if (currency) {
      whereClause.currency = currency.toUpperCase()
    }

    const accounts = await prisma.appAccount.findMany({
      where: whereClause,
      include: {
        currencyRef: {
          select: { name: true, symbol: true, decimals: true },
        },
        _count: {
          select: {
            transactions: true,
            cards: true,
            scheduledTx: true,
          },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    return Response.json(accounts)
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/accounts
 * 新しい口座を作成
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAccountSchema.parse(body)

    // 通貨が存在するかチェック
    const currency = await prisma.currency.findUnique({
      where: { code: validatedData.currency },
    })

    if (!currency) {
      return Response.json(
        { error: `Currency ${validatedData.currency} not found` },
        { status: 400 }
      )
    }

    // 定期預金の場合は金利と満期日が必要
    if (validatedData.type === 'FIXED_DEPOSIT') {
      if (!validatedData.fixedDepositRate || !validatedData.fixedDepositMaturity) {
        return Response.json(
          { error: 'Fixed deposit rate and maturity date are required for FIXED_DEPOSIT type' },
          { status: 400 }
        )
      }
    }

    const user = session.user as SessionUser

    // 同名の口座が既に存在するかチェック
    const existingAccount = await prisma.appAccount.findFirst({
      where: {
        userId: user.id,
        name: validatedData.name,
        isActive: true,
      },
    })

    if (existingAccount) {
      return Response.json({ error: 'Account with this name already exists' }, { status: 409 })
    }

    const account = await prisma.appAccount.create({
      data: {
        ...validatedData,
        balance: new Decimal(validatedData.balance),
        fixedDepositRate: validatedData.fixedDepositRate
          ? new Decimal(validatedData.fixedDepositRate)
          : null,
        fixedDepositMaturity: validatedData.fixedDepositMaturity
          ? new Date(validatedData.fixedDepositMaturity)
          : null,
        userId: user.id,
      },
      include: {
        currencyRef: {
          select: { name: true, symbol: true, decimals: true },
        },
      },
    })

    return Response.json(account, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to create account:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Make this API route dynamic
export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
