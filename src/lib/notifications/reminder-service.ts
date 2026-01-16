import { WebhookNotificationService, NotificationPayload } from './webhook-service'
import { prisma } from '../db'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Decimal from 'decimal.js'
import type { TransactionType } from '@prisma/client'
import { reminderLogger } from '../logger'

/**
 * Interface for scheduled transaction with included relations for notifications
 */
interface ScheduledTransactionWithRelations {
  id: string
  amount: Decimal
  currency: string
  type: TransactionType
  description: string
  dueDate: Date
  reminderDays: number
  isReminderSent: boolean
  notes: string | null
  userId: string
  user: {
    notificationSettings: Array<{
      webhookUrl: string | null
      webhookType: 'SLACK' | 'DISCORD' | null
    }>
  }
  account: {
    name: string
    currencyRef: {
      symbol: string
      decimals: number
    } | null
  }
  category: {
    name: string
  } | null
  currencyRef: {
    symbol: string
    decimals: number
  } | null
}

export class ReminderService {
  /**
   * リマインダーが必要な予定取引を取得
   */
  static async getPendingReminders() {
    const now = new Date()

    const scheduledTransactions = await prisma.scheduledTransaction.findMany({
      where: {
        status: 'PENDING',
        isReminderSent: false,
        dueDate: {
          gte: now, // 期日がまだ来ていない
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30日以内
        },
      },
      include: {
        user: {
          include: {
            notificationSettings: {
              where: {
                type: 'WEBHOOK',
                isActive: true,
                scheduledTransactionReminders: true,
              },
            },
          },
        },
        account: {
          include: {
            currencyRef: true,
          },
        },
        category: true,
        currencyRef: true,
      },
    })

    // reminderDaysに基づいてフィルタリング
    const remindersToSend = scheduledTransactions.filter((transaction) => {
      const reminderDate = new Date(transaction.dueDate)
      reminderDate.setDate(reminderDate.getDate() - transaction.reminderDays)

      return now >= reminderDate
    })

    return remindersToSend
  }

  /**
   * 期限切れの予定取引を取得
   */
  static async getOverdueTransactions() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    return await prisma.scheduledTransaction.findMany({
      where: {
        status: 'OVERDUE',
        updatedAt: {
          gte: yesterday, // 昨日以降にOVERDUEになったもの
        },
      },
      include: {
        user: {
          include: {
            notificationSettings: {
              where: {
                type: 'WEBHOOK',
                isActive: true,
                overdueTransactions: true,
              },
            },
          },
        },
        account: {
          include: {
            currencyRef: true,
          },
        },
        category: true,
        currencyRef: true,
      },
    })
  }

  /**
   * 予定取引リマインダーメッセージを生成
   */
  static generateReminderMessage(transaction: ScheduledTransactionWithRelations): NotificationPayload {
    const decimals = transaction.currencyRef?.decimals ?? 0
    const amount = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: transaction.currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(new Decimal(transaction.amount.toString()).toNumber())

    const dueDate = format(new Date(transaction.dueDate), 'yyyy年MM月dd日 (EEEE)', { locale: ja })
    const daysUntilDue = Math.ceil(
      (new Date(transaction.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    const urgencyColor = daysUntilDue <= 1 ? '#ff4444' : daysUntilDue <= 3 ? '#ffaa44' : '#36a64f'

    let urgencyMessage = ''
    if (daysUntilDue === 0) {
      urgencyMessage = '⚠️ 本日が期日です'
    } else if (daysUntilDue === 1) {
      urgencyMessage = '⚠️ 明日が期日です'
    } else {
      urgencyMessage = `📅 あと${daysUntilDue}日`
    }

    const transactionTypeIcons: Record<TransactionType, string> = {
      INCOME: '💰',
      EXPENSE: '💸',
      TRANSFER: '🔄',
    }
    const transactionTypeIcon = transactionTypeIcons[transaction.type] || '📋'

    return {
      title: `${transactionTypeIcon} ${transaction.description} のリマインダー`,
      message: `${urgencyMessage}\n\n**金額:** ${amount}\n**期日:** ${dueDate}\n**口座:** ${transaction.account.name}${transaction.category ? `\n**カテゴリ:** ${transaction.category.name}` : ''}${transaction.notes ? `\n**メモ:** ${transaction.notes}` : ''}`,
      color: urgencyColor,
      fields: [
        {
          name: '金額',
          value: amount,
          inline: true,
        },
        {
          name: '期日',
          value: dueDate,
          inline: true,
        },
        {
          name: '口座',
          value: transaction.account.name,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 期限切れ通知メッセージを生成
   */
  static generateOverdueMessage(transaction: ScheduledTransactionWithRelations): NotificationPayload {
    const decimals = transaction.currencyRef?.decimals ?? 0
    const amount = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: transaction.currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(new Decimal(transaction.amount.toString()).toNumber())

    const dueDate = format(new Date(transaction.dueDate), 'yyyy年MM月dd日', { locale: ja })
    const daysOverdue = Math.ceil(
      (new Date().getTime() - new Date(transaction.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    const transactionTypeIcons: Record<TransactionType, string> = {
      INCOME: '💰',
      EXPENSE: '💸',
      TRANSFER: '🔄',
    }
    const transactionTypeIcon = transactionTypeIcons[transaction.type] || '📋'

    return {
      title: `🚨 ${transaction.description} が期限切れです`,
      message: `**期限切れ:** ${daysOverdue}日経過\n**期日:** ${dueDate}\n**金額:** ${amount}\n**口座:** ${transaction.account.name}\n\n早急に処理をお願いします。`,
      color: '#ff4444',
      fields: [
        {
          name: '金額',
          value: amount,
          inline: true,
        },
        {
          name: '期限切れ',
          value: `${daysOverdue}日経過`,
          inline: true,
        },
        {
          name: '口座',
          value: transaction.account.name,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * リマインダー通知を送信
   */
  static async sendReminders() {
    reminderLogger.debug('Checking for reminder notifications...')

    const reminders = await this.getPendingReminders()

    for (const transaction of reminders) {
      if (!transaction.user.notificationSettings.length) {
        continue
      }

      const settings = transaction.user.notificationSettings[0]

      if (!settings.webhookUrl || !settings.webhookType) {
        continue
      }

      try {
        // 通知ログを作成
        const log = await WebhookNotificationService.createNotificationLog({
          userId: transaction.userId,
          type: 'WEBHOOK',
          webhookType: settings.webhookType,
          title: `${transaction.description} のリマインダー`,
          message: `期日まであと${Math.ceil((new Date(transaction.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}日`,
          scheduledTransactionId: transaction.id,
        })

        // 通知メッセージを生成
        const payload = this.generateReminderMessage(transaction)

        // Webhook通知を送信
        const result = await WebhookNotificationService.sendWebhookNotification(
          settings.webhookUrl,
          settings.webhookType,
          payload
        )

        if (result.success) {
          // 送信成功
          await WebhookNotificationService.updateNotificationLog(log.id, 'SENT')

          // リマインダー送信済みフラグを更新
          await prisma.scheduledTransaction.update({
            where: { id: transaction.id },
            data: { isReminderSent: true },
          })

          reminderLogger.debug(`Reminder sent for transaction: ${transaction.description}`)
        } else {
          // 送信失敗
          await WebhookNotificationService.updateNotificationLog(log.id, 'FAILED', result.error)
          reminderLogger.error(
            `Failed to send reminder for transaction: ${transaction.description}`,
            result.error
          )
        }
      } catch (error) {
        reminderLogger.error(
          `Error processing reminder for transaction: ${transaction.description}`,
          error
        )
      }
    }

    return {
      processed: reminders.length,
      sent: reminders.filter(async (transaction) => {
        // ここで実際に送信されたものをカウントするロジックを実装
        return true
      }).length,
    }
  }

  /**
   * 期限切れ通知を送信
   */
  static async sendOverdueNotifications() {
    reminderLogger.debug('Checking for overdue notifications...')

    const overdueTransactions = await this.getOverdueTransactions()

    for (const transaction of overdueTransactions) {
      if (!transaction.user.notificationSettings.length) {
        continue
      }

      const settings = transaction.user.notificationSettings[0]

      if (!settings.webhookUrl || !settings.webhookType) {
        continue
      }

      try {
        // 重複通知を防ぐため、同じ取引の期限切れ通知が今日送信済みかチェック
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const existingLog = await prisma.notificationLog.findFirst({
          where: {
            scheduledTransactionId: transaction.id,
            title: { contains: '期限切れ' },
            createdAt: { gte: today },
            status: 'SENT',
          },
        })

        if (existingLog) {
          continue // 今日既に送信済み
        }

        // 通知ログを作成
        const log = await WebhookNotificationService.createNotificationLog({
          userId: transaction.userId,
          type: 'WEBHOOK',
          webhookType: settings.webhookType,
          title: `${transaction.description} が期限切れです`,
          message: '早急に処理をお願いします',
          scheduledTransactionId: transaction.id,
        })

        // 通知メッセージを生成
        const payload = this.generateOverdueMessage(transaction)

        // Webhook通知を送信
        const result = await WebhookNotificationService.sendWebhookNotification(
          settings.webhookUrl,
          settings.webhookType,
          payload
        )

        if (result.success) {
          // 送信成功
          await WebhookNotificationService.updateNotificationLog(log.id, 'SENT')
          reminderLogger.debug(`Overdue notification sent for transaction: ${transaction.description}`)
        } else {
          // 送信失敗
          await WebhookNotificationService.updateNotificationLog(log.id, 'FAILED', result.error)
          reminderLogger.error(
            `Failed to send overdue notification for transaction: ${transaction.description}`,
            result.error
          )
        }
      } catch (error) {
        reminderLogger.error(
          `Error processing overdue notification for transaction: ${transaction.description}`,
          error
        )
      }
    }

    return {
      processed: overdueTransactions.length,
    }
  }

  /**
   * 全ての通知処理を実行（メイン関数）
   */
  static async processAllNotifications() {
    reminderLogger.debug('Starting notification processing...')

    const reminderResults = await this.sendReminders()
    const overdueResults = await this.sendOverdueNotifications()

    reminderLogger.debug(`Notification processing complete: Reminders=${reminderResults.processed}, Overdue=${overdueResults.processed}`)

    return {
      reminders: reminderResults,
      overdue: overdueResults,
    }
  }
}
