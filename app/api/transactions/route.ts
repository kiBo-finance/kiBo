import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Decimal from 'decimal.js'
import { z } from 'zod'

const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.string(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  description: z.string(),
  date: z.string().datetime(),
  accountId: z.string(),
  cardId: z.string().optional(),
  categoryId: z.string().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyAmount: z.number().optional(),
  attachments: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

const GetTransactionsSchema = z.object({
  page: z.string().transform(val => parseInt(val)).optional().default(() => 1),
  limit: z.string().transform(val => parseInt(val)).optional().default(() => 20),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  currency: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = CreateTransactionSchema.parse(body)

    // 通貨の存在確認
    const currency = await prisma.currency.findUnique({
      where: { code: validatedData.currency }
    })

    if (!currency) {
      return NextResponse.json(
        { error: '無効な通貨コードです' },
        { status: 400 }
      )
    }

    // 口座の存在確認と所有者チェック
    const account = await prisma.appAccount.findFirst({
      where: {
        id: validatedData.accountId,
        userId: (session.user as any).id
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: '指定された口座が見つかりません' },
        { status: 404 }
      )
    }

    // カードの存在確認（指定されている場合）
    if (validatedData.cardId) {
      const card = await prisma.card.findFirst({
        where: {
          id: validatedData.cardId,
          userId: (session.user as any).id
        }
      })

      if (!card) {
        return NextResponse.json(
          { error: '指定されたカードが見つかりません' },
          { status: 404 }
        )
      }
    }

    // カテゴリの存在確認（指定されている場合）
    if (validatedData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: validatedData.categoryId,
          userId: (session.user as any).id
        }
      })

      if (!category) {
        return NextResponse.json(
          { error: '指定されたカテゴリが見つかりません' },
          { status: 404 }
        )
      }
    }

    // 取引作成
    const transaction = await prisma.transaction.create({
      data: {
        amount: new Decimal(validatedData.amount),
        currency: validatedData.currency,
        type: validatedData.type,
        description: validatedData.description,
        date: new Date(validatedData.date),
        accountId: validatedData.accountId,
        cardId: validatedData.cardId,
        categoryId: validatedData.categoryId,
        userId: (session.user as any).id,
        exchangeRate: validatedData.exchangeRate ? new Decimal(validatedData.exchangeRate) : null,
        baseCurrencyAmount: validatedData.baseCurrencyAmount ? new Decimal(validatedData.baseCurrencyAmount) : null,
        attachments: validatedData.attachments,
        tags: validatedData.tags,
        notes: validatedData.notes,
      },
      include: {
        account: {
          include: {
            currencyRef: true
          }
        },
        card: true,
        category: true,
        currencyRef: true,
      }
    })

    // 口座残高の更新
    let balanceChange = new Decimal(validatedData.amount)
    
    if (validatedData.type === 'EXPENSE') {
      balanceChange = balanceChange.negated()
    }

    await prisma.appAccount.update({
      where: { id: validatedData.accountId },
      data: {
        balance: {
          increment: balanceChange.toNumber()
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...transaction,
        amount: transaction.amount.toString(),
        exchangeRate: transaction.exchangeRate?.toString(),
        baseCurrencyAmount: transaction.baseCurrencyAmount?.toString(),
      }
    })

  } catch (error) {
    console.error('Transaction creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '取引の作成に失敗しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validatedParams = GetTransactionsSchema.parse(params)

    // フィルタ条件の構築
    const where: any = {
      userId: (session.user as any).id
    }

    if (validatedParams.type) {
      where.type = validatedParams.type
    }

    if (validatedParams.accountId) {
      where.accountId = validatedParams.accountId
    }

    if (validatedParams.categoryId) {
      where.categoryId = validatedParams.categoryId
    }

    if (validatedParams.currency) {
      where.currency = validatedParams.currency
    }

    if (validatedParams.startDate || validatedParams.endDate) {
      where.date = {}
      if (validatedParams.startDate) {
        where.date.gte = new Date(validatedParams.startDate)
      }
      if (validatedParams.endDate) {
        where.date.lte = new Date(validatedParams.endDate)
      }
    }

    if (validatedParams.search) {
      where.OR = [
        { description: { contains: validatedParams.search, mode: 'insensitive' } },
        { notes: { contains: validatedParams.search, mode: 'insensitive' } },
        { tags: { has: validatedParams.search } }
      ]
    }

    // ページネーション設定
    const skip = (validatedParams.page - 1) * validatedParams.limit
    const take = validatedParams.limit

    // 取引取得
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            include: {
              currencyRef: true
            }
          },
          card: true,
          category: true,
          currencyRef: true,
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take,
      }),
      prisma.transaction.count({ where })
    ])

    // Decimalフィールドを文字列に変換
    const formattedTransactions = transactions.map(transaction => ({
      ...transaction,
      amount: transaction.amount.toString(),
      exchangeRate: transaction.exchangeRate?.toString(),
      baseCurrencyAmount: transaction.baseCurrencyAmount?.toString(),
      account: {
        ...transaction.account,
        balance: transaction.account.balance.toString()
      }
    }))

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedParams.limit)
      }
    })

  } catch (error) {
    console.error('Transaction fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '取引の取得に失敗しました' },
      { status: 500 }
    )
  }
}