import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Decimal } from 'decimal.js'

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

    // 予定取引を取得
    const scheduledTransaction = await prisma.scheduledTransaction.findFirst({
      where: {
        id,
        userId: (session.user as any).id
      },
      include: {
        account: true,
        category: true
      }
    })

    if (!scheduledTransaction) {
      return NextResponse.json(
        { error: 'Scheduled transaction not found' },
        { status: 404 }
      )
    }

    // 既に完了済みの場合
    if (scheduledTransaction.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Transaction is already completed' },
        { status: 400 }
      )
    }

    // トランザクションを使用して、実際の取引を作成し、予定取引をアップデート
    const result = await prisma.$transaction(async (tx) => {
      // 実際の取引を作成
      const actualTransaction = await tx.transaction.create({
        data: {
          amount: scheduledTransaction.amount,
          currency: scheduledTransaction.currency,
          type: scheduledTransaction.type,
          description: `${scheduledTransaction.description} (予定実行)`,
          date: new Date(),
          accountId: scheduledTransaction.accountId,
          categoryId: scheduledTransaction.categoryId,
          userId: (session.user as any).id,
          notes: `予定取引ID: ${scheduledTransaction.id}${scheduledTransaction.notes ? '\n' + scheduledTransaction.notes : ''}`
        }
      })

      // 口座残高を更新
      const account = await tx.appAccount.findUnique({
        where: { id: scheduledTransaction.accountId }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      let balanceChange = new Decimal(scheduledTransaction.amount)
      if (scheduledTransaction.type === 'EXPENSE') {
        balanceChange = balanceChange.negated()
      }

      await tx.appAccount.update({
        where: { id: scheduledTransaction.accountId },
        data: {
          balance: {
            increment: balanceChange
          }
        }
      })

      // 予定取引のステータスを更新
      const updatedScheduledTransaction = await tx.scheduledTransaction.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        },
        include: {
          account: true,
          category: true
        }
      })

      // 定期実行の場合、次の予定取引を作成
      if (scheduledTransaction.isRecurring && scheduledTransaction.frequency) {
        const nextDueDate = getNextDueDate(
          new Date(scheduledTransaction.dueDate),
          scheduledTransaction.frequency
        )

        // 終了日をチェック
        const shouldCreateNext = !scheduledTransaction.endDate || 
          nextDueDate <= new Date(scheduledTransaction.endDate)

        if (shouldCreateNext) {
          await tx.scheduledTransaction.create({
            data: {
              amount: scheduledTransaction.amount,
              currency: scheduledTransaction.currency,
              type: scheduledTransaction.type,
              description: scheduledTransaction.description,
              dueDate: nextDueDate,
              frequency: scheduledTransaction.frequency,
              endDate: scheduledTransaction.endDate,
              isRecurring: true,
              accountId: scheduledTransaction.accountId,
              categoryId: scheduledTransaction.categoryId,
              userId: (session.user as any).id,
              reminderDays: scheduledTransaction.reminderDays,
              notes: scheduledTransaction.notes
            }
          })
        }
      }

      return {
        scheduledTransaction: updatedScheduledTransaction,
        actualTransaction
      }
    })

    return NextResponse.json({
      scheduledTransaction: result.scheduledTransaction,
      actualTransaction: result.actualTransaction,
      message: 'Transaction completed successfully'
    })

  } catch (error) {
    console.error('Error completing scheduled transaction:', error)
    return NextResponse.json(
      { error: 'Failed to complete transaction' },
      { status: 500 }
    )
  }
}

function getNextDueDate(currentDueDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDueDate)
  
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
      throw new Error(`Unsupported frequency: ${frequency}`)
  }
  
  return nextDate
}