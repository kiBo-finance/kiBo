import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Decimal } from 'decimal.js'

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['CASH', 'CHECKING', 'SAVINGS', 'FIXED_DEPOSIT']),
  currency: z.string().length(3).toUpperCase(),
  balance: z.number().default(0),
  description: z.string().max(500).optional(),
  fixedDepositRate: z.number().min(0).max(100).optional(),
  fixedDepositMaturity: z.string().datetime().optional()
})

const updateAccountSchema = createAccountSchema.partial().extend({
  isActive: z.boolean().optional()
})

/**
 * GET /api/accounts
 * ユーザーの口座一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'
    const type = searchParams.get('type')
    const currency = searchParams.get('currency')
    
    let whereClause: any = {
      userId: (session.user as any).id
    }
    
    if (activeOnly) {
      whereClause.isActive = true
    }
    
    if (type) {
      whereClause.type = type
    }
    
    if (currency) {
      whereClause.currency = currency.toUpperCase()
    }
    
    const accounts = await prisma.appAccount.findMany({
      where: whereClause,
      include: {
        currencyRef: {
          select: { name: true, symbol: true, decimals: true }
        },
        _count: {
          select: { 
            transactions: true,
            cards: true,
            scheduledTx: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })
    
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/accounts
 * 新しい口座を作成
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAccountSchema.parse(body)
    
    // 通貨が存在するかチェック
    const currency = await prisma.currency.findUnique({
      where: { code: validatedData.currency }
    })
    
    if (!currency) {
      return NextResponse.json(
        { error: `Currency ${validatedData.currency} not found` },
        { status: 400 }
      )
    }
    
    // 定期預金の場合は金利と満期日が必要
    if (validatedData.type === 'FIXED_DEPOSIT') {
      if (!validatedData.fixedDepositRate || !validatedData.fixedDepositMaturity) {
        return NextResponse.json(
          { error: 'Fixed deposit rate and maturity date are required for FIXED_DEPOSIT type' },
          { status: 400 }
        )
      }
    }
    
    // 同名の口座が既に存在するかチェック
    const existingAccount = await prisma.appAccount.findFirst({
      where: {
        userId: (session.user as any).id,
        name: validatedData.name,
        isActive: true
      }
    })
    
    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account with this name already exists' },
        { status: 409 }
      )
    }
    
    const account = await prisma.appAccount.create({
      data: {
        ...validatedData,
        balance: new Decimal(validatedData.balance),
        fixedDepositRate: validatedData.fixedDepositRate ? new Decimal(validatedData.fixedDepositRate) : null,
        fixedDepositMaturity: validatedData.fixedDepositMaturity ? new Date(validatedData.fixedDepositMaturity) : null,
        userId: (session.user as any).id
      },
      include: {
        currencyRef: {
          select: { name: true, symbol: true, decimals: true }
        }
      }
    })
    
    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Failed to create account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}