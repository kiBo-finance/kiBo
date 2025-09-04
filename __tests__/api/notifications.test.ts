/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST, GET, DELETE } from '@/app/api/notifications/settings/route'
import { POST as SEND_REMINDERS } from '@/app/api/notifications/send-reminders/route'
import { prisma } from '@/lib/db'
import { WebhookNotificationService } from '@/lib/notifications/webhook-service'
import { ReminderService } from '@/lib/notifications/reminder-service'

// Mock global Request if not available
if (typeof global.Request === 'undefined') {
  const { Request } = require('node-fetch')
  global.Request = Request
}

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/db', () => ({
  prisma: {
    notificationSettings: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notificationLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    scheduledTransaction: {
      findMany: jest.fn(),
      update: jest.fn(),
    }
  }
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve({}))
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockAuth = {
  api: {
    getSession: jest.fn()
  }
}

require('@/lib/auth').auth = mockAuth

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com'
}

const mockSession = {
  user: mockUser
}

const mockNotificationSettings = {
  id: 'settings-1',
  userId: 'user-1',
  type: 'WEBHOOK',
  webhookUrl: 'https://hooks.slack.com/services/test/webhook/url',
  webhookType: 'SLACK',
  scheduledTransactionReminders: true,
  overdueTransactions: true,
  budgetAlerts: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('/api/notifications/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.api.getSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/notifications/settings', () => {
    it('should fetch notification settings successfully', async () => {
      ;(prisma.notificationSettings.findMany as jest.Mock).mockResolvedValue([mockNotificationSettings])

      const request = new NextRequest('http://localhost:3000/api/notifications/settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].webhookType).toBe('SLACK')
    })

    it('should require authentication', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications/settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })
  })

  describe('POST /api/notifications/settings', () => {
    it('should create webhook notification settings successfully', async () => {
      ;(prisma.notificationSettings.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.notificationSettings.create as jest.Mock).mockResolvedValue(mockNotificationSettings)

      const request = new NextRequest('http://localhost:3000/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WEBHOOK',
          webhookUrl: 'https://hooks.slack.com/services/test/webhook/url',
          webhookType: 'SLACK',
          scheduledTransactionReminders: true,
          overdueTransactions: true,
          budgetAlerts: true,
          isActive: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.webhookType).toBe('SLACK')
      expect(prisma.notificationSettings.create).toHaveBeenCalled()
    })

    it('should update existing settings', async () => {
      ;(prisma.notificationSettings.findFirst as jest.Mock).mockResolvedValue(mockNotificationSettings)
      ;(prisma.notificationSettings.update as jest.Mock).mockResolvedValue({
        ...mockNotificationSettings,
        webhookType: 'DISCORD'
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WEBHOOK',
          webhookUrl: 'https://discord.com/api/webhooks/test/url',
          webhookType: 'DISCORD',
          scheduledTransactionReminders: true,
          overdueTransactions: true,
          budgetAlerts: true,
          isActive: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.notificationSettings.update).toHaveBeenCalled()
    })

    it('should validate webhook settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WEBHOOK',
          // Missing webhookUrl and webhookType
          scheduledTransactionReminders: true,
          overdueTransactions: true,
          budgetAlerts: true,
          isActive: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Webhook通知にはWebhook URLとタイプが必要です')
    })

    it('should validate Slack webhook URL format', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WEBHOOK',
          webhookUrl: 'https://invalid-url.com/webhook',
          webhookType: 'SLACK',
          scheduledTransactionReminders: true,
          overdueTransactions: true,
          budgetAlerts: true,
          isActive: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('有効なSlack Webhook URLを入力してください')
    })

    it('should validate Discord webhook URL format', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WEBHOOK',
          webhookUrl: 'https://invalid-url.com/webhook',
          webhookType: 'DISCORD',
          scheduledTransactionReminders: true,
          overdueTransactions: true,
          budgetAlerts: true,
          isActive: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('有効なDiscord Webhook URLを入力してください')
    })
  })

  describe('DELETE /api/notifications/settings', () => {
    it('should delete notification settings successfully', async () => {
      ;(prisma.notificationSettings.findFirst as jest.Mock).mockResolvedValue(mockNotificationSettings)
      ;(prisma.notificationSettings.delete as jest.Mock).mockResolvedValue(mockNotificationSettings)

      const request = new NextRequest('http://localhost:3000/api/notifications/settings?id=settings-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('通知設定が削除されました')
      expect(prisma.notificationSettings.delete).toHaveBeenCalledWith({
        where: { id: 'settings-1' }
      })
    })

    it('should reject deleting non-owned settings', async () => {
      ;(prisma.notificationSettings.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications/settings?id=other-settings', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定された通知設定が見つかりません')
    })
  })
})

describe('WebhookNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendSlackNotification', () => {
    it('should send Slack notification successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const result = await WebhookNotificationService.sendSlackNotification(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです',
          color: '#36a64f'
        }
      )

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('テスト通知')
        })
      )
    })

    it('should handle Slack API error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await WebhookNotificationService.sendSlackNotification(
        'https://hooks.slack.com/services/invalid/webhook/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Slack API error: 404 Not Found')
    })
  })

  describe('sendDiscordNotification', () => {
    it('should send Discord notification successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const result = await WebhookNotificationService.sendDiscordNotification(
        'https://discord.com/api/webhooks/test/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです',
          color: '#36a64f'
        }
      )

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('テスト通知')
        })
      )
    })

    it('should handle Discord API error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      const result = await WebhookNotificationService.sendDiscordNotification(
        'https://discord.com/api/webhooks/invalid/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Discord API error: 400 Bad Request')
    })
  })
})

describe('/api/notifications/send-reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.api.getSession.mockResolvedValue(mockSession)
  })

  describe('POST /api/notifications/send-reminders', () => {
    it('should process notifications with API key authentication', async () => {
      // Mock ReminderService.processAllNotifications
      jest.spyOn(ReminderService, 'processAllNotifications').mockResolvedValueOnce({
        reminders: { processed: 2, sent: 2 },
        overdue: { processed: 1 }
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-reminders', {
        method: 'POST',
        headers: { 'x-api-key': 'your-notification-api-key-for-cron-jobs' }
      })

      // Mock environment variable
      process.env.NOTIFICATION_API_KEY = 'your-notification-api-key-for-cron-jobs'

      const response = await SEND_REMINDERS(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('通知処理が完了しました')
      expect(ReminderService.processAllNotifications).toHaveBeenCalled()
    })

    it('should process notifications with session authentication', async () => {
      jest.spyOn(ReminderService, 'processAllNotifications').mockResolvedValueOnce({
        reminders: { processed: 1, sent: 1 },
        overdue: { processed: 0 }
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-reminders', {
        method: 'POST'
      })

      const response = await SEND_REMINDERS(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(ReminderService.processAllNotifications).toHaveBeenCalled()
    })

    it('should reject unauthorized requests', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications/send-reminders', {
        method: 'POST'
      })

      const response = await SEND_REMINDERS(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })
  })
})