import { auth } from '../../../lib/auth'
import { prisma } from '../../../lib/db'
import type { SessionUser } from '../../../lib/types/auth'
import Decimal from 'decimal.js'
import { z } from 'zod'

const UpdateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
  categoryId: z.string().optional(),
  exchangeRate: z.number().optional(),
  baseCurrencyAmount: z.number().optional(),
  attachments: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const user = session.user as SessionUser

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
      include: {
        account: {
          include: {
            currencyRef: true,
          },
        },
        card: true,
        category: true,
        currencyRef: true,
      },
    })

    if (!transaction) {
      return Response.json({ error: '取引が見つかりません' }, { status: 404 })
    }

    // Decimalフィールドを文字列に変換
    const formattedTransaction = {
      ...transaction,
      amount: transaction.amount.toString(),
      exchangeRate: transaction.exchangeRate?.toString(),
      baseCurrencyAmount: transaction.baseCurrencyAmount?.toString(),
      account: {
        ...transaction.account,
        balance: transaction.account.balance.toString(),
      },
    }

    return Response.json({
      success: true,
      data: formattedTransaction,
    })
  } catch (error) {
    console.error('Transaction fetch error:', error)
    return Response.json({ error: '取引の取得に失敗しました' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // 既存の取引を取得
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingTransaction) {
      return Response.json({ error: '取引が見つかりません' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = UpdateTransactionSchema.parse(body)

    // 通貨の存在確認（変更される場合）
    if (validatedData.currency) {
      const currency = await prisma.currency.findUnique({
        where: { code: validatedData.currency },
      })

      if (!currency) {
        return Response.json({ error: '無効な通貨コードです' }, { status: 400 })
      }
    }

    // 口座の存在確認と所有者チェック（変更される場合）
    if (validatedData.accountId) {
      const account = await prisma.appAccount.findFirst({
        where: {
          id: validatedData.accountId,
          userId: user.id,
        },
      })

      if (!account) {
        return Response.json({ error: '指定された口座が見つかりません' }, { status: 404 })
      }
    }

    // カードの存在確認（変更される場合）
    if (validatedData.cardId) {
      const card = await prisma.card.findFirst({
        where: {
          id: validatedData.cardId,
          userId: user.id,
        },
      })

      if (!card) {
        return Response.json({ error: '指定されたカードが見つかりません' }, { status: 404 })
      }
    }

    // カテゴリの存在確認（変更される場合）
    if (validatedData.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: validatedData.categoryId,
          userId: user.id,
        },
      })

      if (!category) {
        return Response.json({ error: '指定されたカテゴリが見つかりません' }, { status: 404 })
      }
    }

    // 口座残高の調整（金額、タイプ、口座が変更される場合）
    const oldAmount = existingTransaction.amount
    const oldType = existingTransaction.type
    const oldAccountId = existingTransaction.accountId

    const newAmount = validatedData.amount ? new Decimal(validatedData.amount) : oldAmount
    const newType = validatedData.type || oldType
    const newAccountId = validatedData.accountId || oldAccountId

    // 古い取引の影響を取り消し
    let oldBalanceChange = oldAmount
    if (oldType === 'EXPENSE') {
      oldBalanceChange = oldBalanceChange.negated()
    }

    // 新しい取引の影響を計算
    let newBalanceChange = newAmount
    if (newType === 'EXPENSE') {
      newBalanceChange = newBalanceChange.negated()
    }

    // トランザクションで取引更新と残高調整を実行
    const result = await prisma.$transaction(async (prisma) => {
      // 古い口座の残高を戻す
      await prisma.appAccount.update({
        where: { id: oldAccountId },
        data: {
          balance: {
            decrement: oldBalanceChange.toNumber(),
          },
        },
      })

      // 取引を更新
      const updatedTransaction = await prisma.transaction.update({
        where: { id: id },
        data: {
          ...(validatedData.amount && { amount: new Decimal(validatedData.amount) }),
          ...(validatedData.currency && { currency: validatedData.currency }),
          ...(validatedData.type && { type: validatedData.type }),
          ...(validatedData.description && { description: validatedData.description }),
          ...(validatedData.date && { date: new Date(validatedData.date) }),
          ...(validatedData.accountId && { accountId: validatedData.accountId }),
          ...(validatedData.cardId !== undefined && { cardId: validatedData.cardId }),
          ...(validatedData.categoryId !== undefined && { categoryId: validatedData.categoryId }),
          ...(validatedData.exchangeRate && {
            exchangeRate: new Decimal(validatedData.exchangeRate),
          }),
          ...(validatedData.baseCurrencyAmount && {
            baseCurrencyAmount: new Decimal(validatedData.baseCurrencyAmount),
          }),
          ...(validatedData.attachments && { attachments: validatedData.attachments }),
          ...(validatedData.tags && { tags: validatedData.tags }),
          ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
        },
        include: {
          account: {
            include: {
              currencyRef: true,
            },
          },
          card: true,
          category: true,
          currencyRef: true,
        },
      })

      // 新しい口座の残高に反映
      await prisma.appAccount.update({
        where: { id: newAccountId },
        data: {
          balance: {
            increment: newBalanceChange.toNumber(),
          },
        },
      })

      return updatedTransaction
    })

    // Decimalフィールドを文字列に変換
    const formattedTransaction = {
      ...result,
      amount: result.amount.toString(),
      exchangeRate: result.exchangeRate?.toString(),
      baseCurrencyAmount: result.baseCurrencyAmount?.toString(),
      account: {
        ...result.account,
        balance: result.account.balance.toString(),
      },
    }

    return Response.json({
      success: true,
      data: formattedTransaction,
    })
  } catch (error) {
    console.error('Transaction update error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return Response.json({ error: '取引の更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // 既存の取引を取得
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingTransaction) {
      return Response.json({ error: '取引が見つかりません' }, { status: 404 })
    }

    // 口座残高の調整を計算
    let balanceChange = existingTransaction.amount
    if (existingTransaction.type === 'EXPENSE') {
      balanceChange = balanceChange.negated()
    }

    // トランザクションで取引削除と残高調整を実行
    await prisma.$transaction(async (prisma) => {
      // 取引を削除
      await prisma.transaction.delete({
        where: { id: id },
      })

      // 口座残高を戻す
      await prisma.appAccount.update({
        where: { id: existingTransaction.accountId },
        data: {
          balance: {
            decrement: balanceChange.toNumber(),
          },
        },
      })
    })

    return Response.json({
      success: true,
      message: '取引が削除されました',
    })
  } catch (error) {
    console.error('Transaction delete error:', error)
    return Response.json({ error: '取引の削除に失敗しました' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
