import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // 設定が存在し、ユーザーのものかチェック
    const existingSettings = await prisma.notificationSettings.findFirst({
      where: {
        id,
        userId: (session.user as any).id
      }
    })

    if (!existingSettings) {
      return NextResponse.json(
        { error: 'Notification settings not found' },
        { status: 404 }
      )
    }

    // 設定を削除
    await prisma.notificationSettings.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Notification settings deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification settings' },
      { status: 500 }
    )
  }
}