'use client'

import { NotificationSettings } from './notifications/NotificationSettings'

export function NotificationsSettingsClient() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">通知設定</h2>
        <p className="text-muted-foreground">
          SlackやDiscordに予定取引のリマインダーを送信する設定を行います
        </p>
      </div>

      <NotificationSettings />
    </div>
  )
}
