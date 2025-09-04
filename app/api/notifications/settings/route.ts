import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const NotificationSettingsSchema = z.object({
  type: z.enum(['DISABLED', 'WEBHOOK', 'EMAIL']),
  webhookUrl: z.string().url().optional(),
  webhookType: z.enum(['SLACK', 'DISCORD']).optional(),
  scheduledTransactionReminders: z.boolean().default(true),
  overdueTransactions: z.boolean().default(true),
  budgetAlerts: z.boolean().default(true),
  isActive: z.boolean().default(true)
})

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

    const settings = await prisma.notificationSettings.findMany({
      where: {
        userId: (session.user as any).id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Notification settings fetch error:', error)
    return NextResponse.json(
      { error: '通知設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = NotificationSettingsSchema.parse(body)

    // Webhook設定の場合の追加バリデーション
    if (validatedData.type === 'WEBHOOK') {
      if (!validatedData.webhookUrl || !validatedData.webhookType) {
        return NextResponse.json(
          { error: 'Webhook通知にはWebhook URLとタイプが必要です' },
          { status: 400 }
        )
      }

      // Webhook URLの形式チェック
      try {
        const url = new URL(validatedData.webhookUrl)
        if (validatedData.webhookType === 'SLACK' && !url.hostname.includes('hooks.slack.com')) {
          return NextResponse.json(
            { error: '有効なSlack Webhook URLを入力してください' },
            { status: 400 }
          )
        }
        if (validatedData.webhookType === 'DISCORD' && !url.hostname.includes('discord.com')) {
          return NextResponse.json(
            { error: '有効なDiscord Webhook URLを入力してください' },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: '有効なWebhook URLを入力してください' },
          { status: 400 }
        )
      }
    }

    // 既存の同じタイプの設定があるかチェック
    const existingSettings = await prisma.notificationSettings.findFirst({
      where: {
        userId: (session.user as any).id,
        type: validatedData.type
      }
    })

    let settings
    if (existingSettings) {
      // 更新
      settings = await prisma.notificationSettings.update({
        where: {
          id: existingSettings.id
        },
        data: {
          webhookUrl: validatedData.webhookUrl,
          webhookType: validatedData.webhookType,
          scheduledTransactionReminders: validatedData.scheduledTransactionReminders,
          overdueTransactions: validatedData.overdueTransactions,
          budgetAlerts: validatedData.budgetAlerts,
          isActive: validatedData.isActive
        }
      })
    } else {
      // 新規作成
      settings = await prisma.notificationSettings.create({
        data: {
          userId: (session.user as any).id,
          type: validatedData.type,
          webhookUrl: validatedData.webhookUrl,
          webhookType: validatedData.webhookType,
          scheduledTransactionReminders: validatedData.scheduledTransactionReminders,
          overdueTransactions: validatedData.overdueTransactions,
          budgetAlerts: validatedData.budgetAlerts,
          isActive: validatedData.isActive
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Notification settings save error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '通知設定の保存に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const settingsId = searchParams.get('id')

    if (!settingsId) {
      return NextResponse.json(
        { error: '設定IDが必要です' },
        { status: 400 }
      )
    }

    // 所有者確認
    const settings = await prisma.notificationSettings.findFirst({
      where: {
        id: settingsId,
        userId: (session.user as any).id
      }
    })

    if (!settings) {
      return NextResponse.json(
        { error: '指定された通知設定が見つかりません' },
        { status: 404 }
      )
    }

    await prisma.notificationSettings.delete({
      where: { id: settingsId }
    })

    return NextResponse.json({
      success: true,
      message: '通知設定が削除されました'
    })

  } catch (error) {
    console.error('Notification settings delete error:', error)
    return NextResponse.json(
      { error: '通知設定の削除に失敗しました' },
      { status: 500 }
    )
  }
}