import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/types/auth'
import Decimal from 'decimal.js'
import { z } from 'zod'

// Extract ID from URL path
function getIdFromUrl(request: Request): string | null {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]
  return id ? id : null
}

const UpdateScheduledTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  description: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  endDate: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
  reminderDays: z.number().int().min(0).max(30).optional(),
  notes: z.string().optional(),
})

const ExecuteScheduledTransactionSchema = z.object({
  executeDate: z.string().datetime().optional(),
  createRecurring: z.boolean().default(true), // 繰り返し取引の場合、次の予定を作成するか
})

export async function GET(request: Request) {
  try {
    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const user = session.user as SessionUser

    const scheduledTransaction = await prisma.scheduledTransaction.findFirst({
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
        category: true,
        currencyRef: true,
      },
    })

    if (!scheduledTransaction) {
      return Response.json({ error: '予定取引が見つかりません' }, { status: 404 })
    }

    // Decimalフィールドを文字列に変換
    const formattedTransaction = {
      ...scheduledTransaction,
      amount: scheduledTransaction.amount.toString(),
      account: {
        ...scheduledTransaction.account,
        balance: scheduledTransaction.account.balance.toString(),
      },
    }

    return Response.json({
      success: true,
      data: formattedTransaction,
    })
  } catch (error) {
    console.error('Scheduled transaction fetch error:', error)
    return Response.json({ error: '予定取引の取得に失敗しました' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // 既存の予定取引を取得
    const existingTransaction = await prisma.scheduledTransaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingTransaction) {
      return Response.json({ error: '予定取引が見つかりません' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = UpdateScheduledTransactionSchema.parse(body)

    // バリデーション: 繰り返し設定の場合は頻度が必要
    if (
      validatedData.isRecurring === true &&
      !validatedData.frequency &&
      !existingTransaction.frequency
    ) {
      return Response.json({ error: '繰り返し取引には頻度の設定が必要です' }, { status: 400 })
    }

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

    // 予定取引を更新
    const updatedTransaction = await prisma.scheduledTransaction.update({
      where: { id: id },
      data: {
        ...(validatedData.amount && { amount: new Decimal(validatedData.amount) }),
        ...(validatedData.currency && { currency: validatedData.currency }),
        ...(validatedData.type && { type: validatedData.type }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.accountId && { accountId: validatedData.accountId }),
        ...(validatedData.categoryId !== undefined && { categoryId: validatedData.categoryId }),
        ...(validatedData.dueDate && { dueDate: new Date(validatedData.dueDate) }),
        ...(validatedData.frequency !== undefined && { frequency: validatedData.frequency }),
        ...(validatedData.endDate !== undefined && {
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        }),
        ...(validatedData.isRecurring !== undefined && { isRecurring: validatedData.isRecurring }),
        ...(validatedData.status && {
          status: validatedData.status,
          ...(validatedData.status === 'COMPLETED' && { completedAt: new Date() }),
          ...(validatedData.status === 'PENDING' && { completedAt: null }),
        }),
        ...(validatedData.reminderDays !== undefined && {
          reminderDays: validatedData.reminderDays,
        }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
      include: {
        account: {
          include: {
            currencyRef: true,
          },
        },
        category: true,
        currencyRef: true,
      },
    })

    // Decimalフィールドを文字列に変換
    const formattedTransaction = {
      ...updatedTransaction,
      amount: updatedTransaction.amount.toString(),
      account: {
        ...updatedTransaction.account,
        balance: updatedTransaction.account.balance.toString(),
      },
    }

    return Response.json({
      success: true,
      data: formattedTransaction,
    })
  } catch (error) {
    console.error('Scheduled transaction update error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return Response.json({ error: '予定取引の更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // 既存の予定取引を取得
    const existingTransaction = await prisma.scheduledTransaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingTransaction) {
      return Response.json({ error: '予定取引が見つかりません' }, { status: 404 })
    }

    // 予定取引を削除
    await prisma.scheduledTransaction.delete({
      where: { id: id },
    })

    return Response.json({
      success: true,
      message: '予定取引が削除されました',
    })
  } catch (error) {
    console.error('Scheduled transaction delete error:', error)
    return Response.json({ error: '予定取引の削除に失敗しました' }, { status: 500 })
  }
}

// 予定取引の実行（実際の取引に変換）
export async function POST(request: Request) {
  try {
    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = ExecuteScheduledTransactionSchema.parse(body)
    const user = session.user as SessionUser

    // 既存の予定取引を取得
    const scheduledTransaction = await prisma.scheduledTransaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!scheduledTransaction) {
      return Response.json({ error: '予定取引が見つかりません' }, { status: 404 })
    }

    if (scheduledTransaction.status === 'COMPLETED') {
      return Response.json({ error: 'この予定取引は既に実行済みです' }, { status: 400 })
    }

    const executeDate = validatedData.executeDate ? new Date(validatedData.executeDate) : new Date()

    const result = await prisma.$transaction(async (prisma) => {
      // 実際の取引を作成
      const transaction = await prisma.transaction.create({
        data: {
          amount: scheduledTransaction.amount,
          currency: scheduledTransaction.currency,
          type: scheduledTransaction.type,
          description: `${scheduledTransaction.description} (予定取引実行)`,
          date: executeDate,
          accountId: scheduledTransaction.accountId,
          categoryId: scheduledTransaction.categoryId,
          userId: scheduledTransaction.userId,
          notes: scheduledTransaction.notes,
          attachments: [],
          tags: ['scheduled-transaction'],
        },
        include: {
          account: {
            include: {
              currencyRef: true,
            },
          },
          category: true,
          currencyRef: true,
        },
      })

      // 口座残高の更新
      let balanceChange = scheduledTransaction.amount
      if (scheduledTransaction.type === 'EXPENSE') {
        balanceChange = balanceChange.negated()
      }

      await prisma.appAccount.update({
        where: { id: scheduledTransaction.accountId },
        data: {
          balance: {
            increment: balanceChange.toNumber(),
          },
        },
      })

      // 予定取引のステータスを完了に更新
      const updatedScheduledTransaction = await prisma.scheduledTransaction.update({
        where: { id: id },
        data: {
          status: 'COMPLETED',
          completedAt: executeDate,
        },
      })

      // 繰り返し取引の場合、次の予定を作成
      let nextScheduledTransaction = null
      if (
        scheduledTransaction.isRecurring &&
        validatedData.createRecurring &&
        scheduledTransaction.frequency
      ) {
        const nextDueDate = calculateNextDueDate(
          scheduledTransaction.dueDate,
          scheduledTransaction.frequency
        )

        // 終了日チェック
        if (!scheduledTransaction.endDate || nextDueDate <= scheduledTransaction.endDate) {
          nextScheduledTransaction = await prisma.scheduledTransaction.create({
            data: {
              amount: scheduledTransaction.amount,
              currency: scheduledTransaction.currency,
              type: scheduledTransaction.type,
              description: scheduledTransaction.description,
              accountId: scheduledTransaction.accountId,
              categoryId: scheduledTransaction.categoryId,
              userId: scheduledTransaction.userId,
              dueDate: nextDueDate,
              frequency: scheduledTransaction.frequency,
              endDate: scheduledTransaction.endDate,
              isRecurring: true,
              reminderDays: scheduledTransaction.reminderDays,
              notes: scheduledTransaction.notes,
            },
          })
        }
      }

      return {
        transaction: {
          ...transaction,
          amount: transaction.amount.toString(),
          exchangeRate: transaction.exchangeRate?.toString(),
          baseCurrencyAmount: transaction.baseCurrencyAmount?.toString(),
          account: {
            ...transaction.account,
            balance: transaction.account.balance.toString(),
          },
        },
        scheduledTransaction: updatedScheduledTransaction,
        nextScheduledTransaction,
      }
    })

    return Response.json({
      success: true,
      message: '予定取引が実行されました',
      data: result,
    })
  } catch (error) {
    console.error('Scheduled transaction execution error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return Response.json({ error: '予定取引の実行に失敗しました' }, { status: 500 })
  }
}

// 次の実行日を計算するヘルパー関数
function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate)

  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    default:
      throw new Error(`Invalid frequency: ${frequency}`)
  }

  return nextDate
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
