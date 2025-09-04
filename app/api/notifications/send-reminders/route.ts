import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { ReminderService } from '@/lib/notifications/reminder-service'

// 認証が必要（管理者または特定のAPIキー）
export async function POST(request: NextRequest) {
  try {
    // APIキーまたは管理者認証をチェック
    const apiKey = request.headers.get('x-api-key')
    const expectedApiKey = process.env.NOTIFICATION_API_KEY
    
    if (expectedApiKey && apiKey === expectedApiKey) {
      // APIキーでの認証成功
    } else {
      // セッション認証をチェック
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session?.user) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        )
      }
    }

    // 通知処理を実行
    const results = await ReminderService.processAllNotifications()

    return NextResponse.json({
      success: true,
      message: '通知処理が完了しました',
      data: results
    })

  } catch (error) {
    console.error('Notification processing error:', error)
    return NextResponse.json(
      { error: '通知処理に失敗しました' },
      { status: 500 }
    )
  }
}

// 手動実行用のGETエンドポイント（開発・テスト用）
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 通知処理を実行
    const results = await ReminderService.processAllNotifications()

    return NextResponse.json({
      success: true,
      message: '通知処理が手動実行されました',
      data: results
    })

  } catch (error) {
    console.error('Manual notification processing error:', error)
    return NextResponse.json(
      { error: '手動通知処理に失敗しました' },
      { status: 500 }
    )
  }
}