import { prisma } from '../db'
import { WebhookType, NotificationStatus } from '@prisma/client'

export interface NotificationPayload {
  title: string
  message: string
  color?: string
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  timestamp?: string
}

export interface SlackMessage {
  text: string
  blocks?: Array<{
    type: string
    text?: {
      type: string
      text: string
    }
    fields?: Array<{
      type: string
      text: string
    }>
  }>
  attachments?: Array<{
    color: string
    title: string
    text: string
    fields?: Array<{
      title: string
      value: string
      short: boolean
    }>
    footer?: string
    ts?: number
  }>
}

export interface DiscordMessage {
  content?: string
  embeds?: Array<{
    title: string
    description: string
    color: number
    fields?: Array<{
      name: string
      value: string
      inline?: boolean
    }>
    footer?: {
      text: string
    }
    timestamp?: string
  }>
}

export class WebhookNotificationService {
  /**
   * Slack Webhook通知を送信
   */
  static async sendSlackNotification(
    webhookUrl: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const slackMessage: SlackMessage = {
        text: payload.title,
        attachments: [
          {
            color: payload.color || '#36a64f',
            title: payload.title,
            text: payload.message,
            fields: payload.fields?.map((field) => ({
              title: field.name,
              value: field.value,
              short: field.inline || false,
            })),
            footer: 'kiBoアプリ',
            ts: payload.timestamp
              ? Math.floor(new Date(payload.timestamp).getTime() / 1000)
              : Math.floor(Date.now() / 1000),
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Slack notification error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Discord Webhook通知を送信
   */
  static async sendDiscordNotification(
    webhookUrl: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const discordMessage: DiscordMessage = {
        embeds: [
          {
            title: payload.title,
            description: payload.message,
            color: payload.color ? parseInt(payload.color.replace('#', ''), 16) : 0x36a64f,
            fields: payload.fields,
            footer: {
              text: 'kiBoアプリ',
            },
            timestamp: payload.timestamp || new Date().toISOString(),
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discordMessage),
      })

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status} ${response.statusText}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Discord notification error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Webhookタイプに応じて通知を送信
   */
  static async sendWebhookNotification(
    webhookUrl: string,
    webhookType: WebhookType,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    switch (webhookType) {
      case 'SLACK':
        return this.sendSlackNotification(webhookUrl, payload)
      case 'DISCORD':
        return this.sendDiscordNotification(webhookUrl, payload)
      default:
        return { success: false, error: 'Unsupported webhook type' }
    }
  }

  /**
   * 通知ログを作成
   */
  static async createNotificationLog({
    userId,
    type,
    webhookType,
    title,
    message,
    scheduledFor,
    scheduledTransactionId,
    budgetId,
  }: {
    userId: string
    type: 'WEBHOOK' | 'EMAIL'
    webhookType?: WebhookType
    title: string
    message: string
    scheduledFor?: Date
    scheduledTransactionId?: string
    budgetId?: string
  }) {
    return await prisma.notificationLog.create({
      data: {
        userId,
        type,
        webhookType,
        title,
        message,
        scheduledFor,
        scheduledTransactionId,
        budgetId,
        status: 'PENDING',
      },
    })
  }

  /**
   * 通知ログを更新
   */
  static async updateNotificationLog(
    logId: string,
    status: NotificationStatus,
    errorMessage?: string
  ) {
    return await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status,
        sentAt: status === 'SENT' ? new Date() : undefined,
        errorMessage,
        retryCount: status === 'FAILED' ? { increment: 1 } : undefined,
      },
    })
  }

  /**
   * 通知を実際に送信し、ログを更新
   */
  static async processNotification(logId: string) {
    const log = await prisma.notificationLog.findUnique({
      where: { id: logId },
    })

    if (!log) {
      await this.updateNotificationLog(logId, 'FAILED', 'Notification log not found')
      return
    }

    // Fetch notification settings separately via userId
    const notificationSettings = await prisma.notificationSettings.findMany({
      where: {
        userId: log.userId,
        type: 'WEBHOOK',
        isActive: true,
      },
    })

    if (!notificationSettings.length) {
      await this.updateNotificationLog(logId, 'FAILED', 'No active webhook settings found')
      return
    }

    const settings = notificationSettings[0]

    if (!settings.webhookUrl || !settings.webhookType) {
      await this.updateNotificationLog(logId, 'FAILED', 'Webhook URL or type not configured')
      return
    }

    const payload: NotificationPayload = {
      title: log.title,
      message: log.message,
      timestamp: new Date().toISOString(),
    }

    const result = await this.sendWebhookNotification(
      settings.webhookUrl,
      settings.webhookType,
      payload
    )

    if (result.success) {
      await this.updateNotificationLog(logId, 'SENT')
    } else {
      await this.updateNotificationLog(logId, 'FAILED', result.error)
    }
  }
}
