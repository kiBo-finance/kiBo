import { auth } from '../../../lib/auth'
import { prisma } from '../../../lib/db'
import type { SessionUser } from '../../../lib/types/auth'
import type { Prisma, ScheduledStatus, TransactionType } from '@prisma/client'
import Decimal from 'decimal.js'
import { z } from 'zod'

const CreateScheduledTransactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.string(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  description: z.string(),
  accountId: z.string(),
  categoryId: z.string().optional(),
  dueDate: z.string().datetime(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  endDate: z.string().datetime().optional(),
  isRecurring: z.boolean().default(false),
  reminderDays: z.number().int().min(0).max(30).default(1),
  notes: z.string().optional(),
})

const GetScheduledTransactionsSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val))
    .optional()
    .default(() => 1),
  limit: z
    .string()
    .transform((val) => parseInt(val))
    .optional()
    .default(() => 20),
  status: z.enum(['PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isRecurring: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
})

const UpdateStatusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED']),
  executeTransaction: z.boolean().default(false), // COMPLETED時に実際の取引を作成するか
})

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateScheduledTransactionSchema.parse(body)

    // バリデーション: 繰り返し設定の場合は頻度が必要
    if (validatedData.isRecurring && !validatedData.frequency) {
      return Response.json({ error: '繰り返し取引には頻度の設定が必要です' }, { status: 400 })
    }

    // バリデーション: 繰り返し設定の場合は終了日が必要（または無期限）
    if (validatedData.isRecurring && validatedData.frequency && !validatedData.endDate) {
      return Response.json(
        { error: '繰り返し取引には終了日の設定が推奨されます' },
        { status: 400 }
      )
    }

    // 通貨の存在確認
    const currency = await prisma.currency.findUnique({
      where: { code: validatedData.currency },
    })

    if (!currency) {
      return Response.json({ error: '無効な通貨コードです' }, { status: 400 })
    }

    const user = session.user as SessionUser

    // 口座の存在確認と所有者チェック
    const account = await prisma.appAccount.findFirst({
      where: {
        id: validatedData.accountId,
        userId: user.id,
      },
    })

    if (!account) {
      return Response.json({ error: '指定された口座が見つかりません' }, { status: 404 })
    }

    // カテゴリの存在確認（指定されている場合）
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

    // 予定取引作成
    const scheduledTransaction = await prisma.scheduledTransaction.create({
      data: {
        amount: new Decimal(validatedData.amount),
        currency: validatedData.currency,
        type: validatedData.type,
        description: validatedData.description,
        accountId: validatedData.accountId,
        categoryId: validatedData.categoryId,
        userId: user.id,
        dueDate: new Date(validatedData.dueDate),
        frequency: validatedData.frequency,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        isRecurring: validatedData.isRecurring,
        reminderDays: validatedData.reminderDays,
        notes: validatedData.notes,
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

    return Response.json({
      success: true,
      data: {
        ...scheduledTransaction,
        amount: scheduledTransaction.amount.toString(),
        account: {
          ...scheduledTransaction.account,
          balance: scheduledTransaction.account.balance.toString(),
        },
      },
    })
  } catch (error) {
    console.error('Scheduled transaction creation error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return Response.json({ error: '予定取引の作成に失敗しました' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    const validatedParams = GetScheduledTransactionsSchema.parse(params)
    const user = session.user as SessionUser

    // フィルタ条件の構築
    const where: Prisma.ScheduledTransactionWhereInput = {
      userId: user.id,
    }

    if (validatedParams.status) {
      where.status = validatedParams.status as ScheduledStatus
    }

    if (validatedParams.type) {
      where.type = validatedParams.type as TransactionType
    }

    if (validatedParams.accountId) {
      where.accountId = validatedParams.accountId
    }

    if (validatedParams.categoryId) {
      where.categoryId = validatedParams.categoryId
    }

    if (validatedParams.isRecurring !== undefined) {
      where.isRecurring = validatedParams.isRecurring
    }

    if (validatedParams.startDate || validatedParams.endDate) {
      const dueDateFilter: { gte?: Date; lte?: Date } = {}
      if (validatedParams.startDate) {
        dueDateFilter.gte = new Date(validatedParams.startDate)
      }
      if (validatedParams.endDate) {
        dueDateFilter.lte = new Date(validatedParams.endDate)
      }
      where.dueDate = dueDateFilter
    }

    // ページネーション設定
    const skip = (validatedParams.page - 1) * validatedParams.limit
    const take = validatedParams.limit

    // 予定取引取得
    const [scheduledTransactions, totalCount] = await Promise.all([
      prisma.scheduledTransaction.findMany({
        where,
        include: {
          account: {
            include: {
              currencyRef: true,
            },
          },
          category: true,
          currencyRef: true,
        },
        orderBy: [
          { status: 'asc' }, // PENDINGを最初に
          { dueDate: 'asc' },
        ],
        skip,
        take,
      }),
      prisma.scheduledTransaction.count({ where }),
    ])

    // Decimalフィールドを文字列に変換
    const formattedTransactions = scheduledTransactions.map((transaction) => ({
      ...transaction,
      amount: transaction.amount.toString(),
      account: {
        ...transaction.account,
        balance: transaction.account.balance.toString(),
      },
    }))

    // 期限切れのステータス更新（バックグラウンドで実行）
    const now = new Date()
    prisma.scheduledTransaction
      .updateMany({
        where: {
          userId: user.id,
          status: 'PENDING',
          dueDate: {
            lt: now,
          },
        },
        data: {
          status: 'OVERDUE',
        },
      })
      .catch(console.error)

    return Response.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedParams.limit),
      },
    })
  } catch (error) {
    console.error('Scheduled transactions fetch error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return Response.json({ error: '予定取引の取得に失敗しました' }, { status: 500 })
  }
}

// 一括ステータス更新エンドポイント
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, ...statusData } = body
    const validatedStatus = UpdateStatusSchema.parse(statusData)
    const user = session.user as SessionUser

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: '更新対象のIDが指定されていません' }, { status: 400 })
    }

    // 対象の予定取引を取得
    const scheduledTransactions = await prisma.scheduledTransaction.findMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
      include: {
        account: true,
      },
    })

    if (scheduledTransactions.length !== ids.length) {
      return Response.json({ error: '一部の予定取引が見つかりません' }, { status: 404 })
    }

    const results = []

    // トランザクションで実行
    for (const scheduledTx of scheduledTransactions) {
      const result = await prisma.$transaction(async (prisma) => {
        // ステータス更新
        const updatedTx = await prisma.scheduledTransaction.update({
          where: { id: scheduledTx.id },
          data: {
            status: validatedStatus.status,
            ...(validatedStatus.status === 'COMPLETED' && { completedAt: new Date() }),
            isReminderSent: false, // リマインダーフラグをリセット
          },
        })

        // COMPLETEDかつ取引実行が指定されている場合、実際の取引を作成
        if (validatedStatus.status === 'COMPLETED' && validatedStatus.executeTransaction) {
          const transaction = await prisma.transaction.create({
            data: {
              amount: scheduledTx.amount,
              currency: scheduledTx.currency,
              type: scheduledTx.type,
              description: `${scheduledTx.description} (予定取引実行)`,
              date: new Date(),
              accountId: scheduledTx.accountId,
              categoryId: scheduledTx.categoryId,
              userId: scheduledTx.userId,
              notes: scheduledTx.notes,
              attachments: [],
              tags: ['scheduled-transaction'],
            },
          })

          // 口座残高の更新
          let balanceChange = scheduledTx.amount
          if (scheduledTx.type === 'EXPENSE') {
            balanceChange = balanceChange.negated()
          }

          await prisma.appAccount.update({
            where: { id: scheduledTx.accountId },
            data: {
              balance: {
                increment: balanceChange.toNumber(),
              },
            },
          })

          return { scheduledTransaction: updatedTx, transaction }
        }

        return { scheduledTransaction: updatedTx }
      })

      results.push(result)
    }

    return Response.json({
      success: true,
      message: `${results.length}件の予定取引が更新されました`,
      data: results,
    })
  } catch (error) {
    console.error('Scheduled transactions batch update error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return Response.json({ error: '予定取引の更新に失敗しました' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
