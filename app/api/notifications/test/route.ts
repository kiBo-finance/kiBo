import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WebhookNotificationService } from '@/lib/notifications/webhook-service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { webhookUrl, webhookType } = await request.json()

    if (!webhookUrl || !webhookType) {
      return NextResponse.json(
        { error: 'Webhook URL and type are required' },
        { status: 400 }
      )
    }

    // テスト用の通知ペイロードを作成
    const testPayload = {
      title: 'kiBoアプリ テスト通知',
      message: 'Webhook設定のテストが正常に完了しました。通知システムが正しく動作しています。',
      username: (session.user as any).name || 'テストユーザー',
      scheduledTransactions: [
        {
          description: 'テスト予定取引',
          amount: 1000,
          currency: 'JPY',
          dueDate: new Date().toISOString(),
          type: 'EXPENSE' as const
        }
      ]
    }

    // Webhookを送信
    const success = await WebhookNotificationService.sendWebhookNotification(
      webhookUrl,
      webhookType as 'SLACK' | 'DISCORD',
      testPayload
    )

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send test notification' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}