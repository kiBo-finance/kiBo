import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { SessionUser } from '@/lib/types/auth'

function getIdFromUrl(request: Request): string | null {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]
  return id && id !== 'settings' ? id : null
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = getIdFromUrl(request)
    if (!id) {
      return Response.json({ error: 'Settings ID is required' }, { status: 400 })
    }

    const user = session.user as SessionUser

    // 設定が存在し、ユーザーのものかチェック
    const existingSettings = await prisma.notificationSettings.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingSettings) {
      return Response.json({ error: 'Notification settings not found' }, { status: 404 })
    }

    // 設定を削除
    await prisma.notificationSettings.delete({
      where: { id },
    })

    return Response.json({
      success: true,
      message: 'Notification settings deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting notification settings:', error)
    return Response.json({ error: 'Failed to delete notification settings' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
