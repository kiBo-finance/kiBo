import { auth } from '../../../../lib/auth'
import { WebhookNotificationService } from '../../../../lib/notifications/webhook-service'
import type { SessionUser } from '../../../../lib/types/auth'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { webhookUrl, webhookType } = await request.json()

    if (!webhookUrl || !webhookType) {
      return Response.json({ error: 'Webhook URL and type are required' }, { status: 400 })
    }

    const user = session.user as SessionUser

    // テスト用の通知ペイロードを作成
    const testPayload = {
      title: 'kiBoアプリ テスト通知',
      message: 'Webhook設定のテストが正常に完了しました。通知システムが正しく動作しています。',
      username: user.name || 'テストユーザー',
      scheduledTransactions: [
        {
          description: 'テスト予定取引',
          amount: 1000,
          currency: 'JPY',
          dueDate: new Date().toISOString(),
          type: 'EXPENSE' as const,
        },
      ],
    }

    // Webhookを送信
    const success = await WebhookNotificationService.sendWebhookNotification(
      webhookUrl,
      webhookType as 'SLACK' | 'DISCORD',
      testPayload
    )

    if (success) {
      return Response.json({
        success: true,
        message: 'Test notification sent successfully',
      })
    } else {
      return Response.json({ error: 'Failed to send test notification' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error sending test notification:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
