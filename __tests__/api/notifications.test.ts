import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'

// Create mock functions
const mockNotificationSettingsFindMany = mock(() => Promise.resolve([]))
const mockNotificationSettingsFindFirst = mock(() => Promise.resolve(null))
const mockNotificationSettingsCreate = mock(() => Promise.resolve({}))
const mockNotificationSettingsUpdate = mock(() => Promise.resolve({}))
const mockNotificationSettingsDelete = mock(() => Promise.resolve({}))
const mockNotificationLogCreate = mock(() => Promise.resolve({}))
const mockNotificationLogFindFirst = mock(() => Promise.resolve(null))
const mockNotificationLogUpdate = mock(() => Promise.resolve({}))
const mockScheduledTransactionFindMany = mock(() => Promise.resolve([]))
const mockScheduledTransactionUpdate = mock(() => Promise.resolve({}))
const mockGetSession = mock(() => Promise.resolve(null))
const mockHeaders = mock(() => Promise.resolve({}))

// Mock fetch globally
const mockFetch = mock(() =>
  Promise.resolve({
    ok: true,
    status: 200,
  })
)
globalThis.fetch = mockFetch as unknown as typeof fetch

// Mock dependencies before imports
mock.module('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

mock.module('~/lib/db', () => ({
  prisma: {
    notificationSettings: {
      findMany: mockNotificationSettingsFindMany,
      findFirst: mockNotificationSettingsFindFirst,
      create: mockNotificationSettingsCreate,
      update: mockNotificationSettingsUpdate,
      delete: mockNotificationSettingsDelete,
    },
    notificationLog: {
      create: mockNotificationLogCreate,
      findFirst: mockNotificationLogFindFirst,
      update: mockNotificationLogUpdate,
    },
    scheduledTransaction: {
      findMany: mockScheduledTransactionFindMany,
      update: mockScheduledTransactionUpdate,
    },
  },
}))

mock.module('next/headers', () => ({
  headers: mockHeaders,
}))

// Import after mocking
import { POST as SEND_REMINDERS } from '~/pages/_api/notifications/send-reminders'
import { POST, GET, DELETE } from '~/pages/_api/notifications/settings/index'
import { prisma } from '~/lib/db'
import { ReminderService } from '~/lib/notifications/reminder-service'
import { WebhookNotificationService } from '~/lib/notifications/webhook-service'
import { NextRequest } from 'next/server'

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
}

const mockSession = {
  user: mockUser,
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
  updatedAt: new Date(),
}

describe('/api/notifications/settings', () => {
  beforeEach(() => {
    mockNotificationSettingsFindMany.mockReset()
    mockNotificationSettingsFindFirst.mockReset()
    mockNotificationSettingsCreate.mockReset()
    mockNotificationSettingsUpdate.mockReset()
    mockNotificationSettingsDelete.mockReset()
    mockNotificationLogCreate.mockReset()
    mockNotificationLogFindFirst.mockReset()
    mockNotificationLogUpdate.mockReset()
    mockScheduledTransactionFindMany.mockReset()
    mockScheduledTransactionUpdate.mockReset()
    mockGetSession.mockReset()
    mockHeaders.mockReset()
    mockFetch.mockReset()
    mockGetSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/notifications/settings', () => {
    it('should fetch notification settings successfully', async () => {
      mockNotificationSettingsFindMany.mockResolvedValue([mockNotificationSettings])

      const request = new NextRequest('http://localhost:3000/api/notifications/settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].webhookType).toBe('SLACK')
    })

    it('should require authentication', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications/settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })
  })

  describe('POST /api/notifications/settings', () => {
    it('should create webhook notification settings successfully', async () => {
      mockNotificationSettingsFindFirst.mockResolvedValue(null)
      mockNotificationSettingsCreate.mockResolvedValue(mockNotificationSettings)

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
          isActive: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.webhookType).toBe('SLACK')
      expect(prisma.notificationSettings.create).toHaveBeenCalled()
    })

    it('should update existing settings', async () => {
      mockNotificationSettingsFindFirst.mockResolvedValue(mockNotificationSettings)
      mockNotificationSettingsUpdate.mockResolvedValue({
        ...mockNotificationSettings,
        webhookType: 'DISCORD',
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
          isActive: true,
        }),
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
          isActive: true,
        }),
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
          isActive: true,
        }),
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
          isActive: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('有効なDiscord Webhook URLを入力してください')
    })
  })

  describe('DELETE /api/notifications/settings', () => {
    it('should delete notification settings successfully', async () => {
      mockNotificationSettingsFindFirst.mockResolvedValue(mockNotificationSettings)
      mockNotificationSettingsDelete.mockResolvedValue(mockNotificationSettings)

      const request = new NextRequest(
        'http://localhost:3000/api/notifications/settings?id=settings-1',
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('通知設定が削除されました')
      expect(prisma.notificationSettings.delete).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
      })
    })

    it('should reject deleting non-owned settings', async () => {
      mockNotificationSettingsFindFirst.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/notifications/settings?id=other-settings',
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定された通知設定が見つかりません')
    })
  })
})

describe('WebhookNotificationService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('sendSlackNotification', () => {
    it('should send Slack notification successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await WebhookNotificationService.sendSlackNotification(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです',
          color: '#36a64f',
        }
      )

      expect(result.success).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('テスト通知'),
        })
      )
    })

    it('should handle Slack API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await WebhookNotificationService.sendSlackNotification(
        'https://hooks.slack.com/services/invalid/webhook/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです',
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Slack API error: 404 Not Found')
    })
  })

  describe('sendDiscordNotification', () => {
    it('should send Discord notification successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await WebhookNotificationService.sendDiscordNotification(
        'https://discord.com/api/webhooks/test/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです',
          color: '#36a64f',
        }
      )

      expect(result.success).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('テスト通知'),
        })
      )
    })

    it('should handle Discord API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const result = await WebhookNotificationService.sendDiscordNotification(
        'https://discord.com/api/webhooks/invalid/url',
        {
          title: 'テスト通知',
          message: 'これはテストメッセージです',
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Discord API error: 400 Bad Request')
    })
  })
})

describe('/api/notifications/send-reminders', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockGetSession.mockResolvedValue(mockSession)
  })

  describe('POST /api/notifications/send-reminders', () => {
    it('should process notifications with API key authentication', async () => {
      // Mock ReminderService.processAllNotifications
      const processAllNotificationsSpy = spyOn(
        ReminderService,
        'processAllNotifications'
      ).mockResolvedValueOnce({
        reminders: { processed: 2, sent: 2 },
        overdue: { processed: 1 },
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-reminders', {
        method: 'POST',
        headers: { 'x-api-key': 'your-notification-api-key-for-cron-jobs' },
      })

      // Mock environment variable
      process.env.NOTIFICATION_API_KEY = 'your-notification-api-key-for-cron-jobs'

      const response = await SEND_REMINDERS(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('通知処理が完了しました')
      expect(ReminderService.processAllNotifications).toHaveBeenCalled()

      processAllNotificationsSpy.mockRestore()
    })

    it('should process notifications with session authentication', async () => {
      const processAllNotificationsSpy = spyOn(
        ReminderService,
        'processAllNotifications'
      ).mockResolvedValueOnce({
        reminders: { processed: 1, sent: 1 },
        overdue: { processed: 0 },
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-reminders', {
        method: 'POST',
      })

      const response = await SEND_REMINDERS(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(ReminderService.processAllNotifications).toHaveBeenCalled()

      processAllNotificationsSpy.mockRestore()
    })

    it('should reject unauthorized requests', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications/send-reminders', {
        method: 'POST',
      })

      const response = await SEND_REMINDERS(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })
  })
})
