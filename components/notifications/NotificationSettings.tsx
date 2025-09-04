'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell,
  BellOff,
  MessageSquare,
  Hash,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  TestTube,
  Trash2
} from 'lucide-react'

interface NotificationSettings {
  id?: string
  type: 'DISABLED' | 'WEBHOOK' | 'EMAIL'
  webhookUrl?: string
  webhookType?: 'SLACK' | 'DISCORD'
  scheduledTransactionReminders: boolean
  overdueTransactions: boolean
  budgetAlerts: boolean
  isActive: boolean
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings[]>([])
  const [currentSettings, setCurrentSettings] = useState<NotificationSettings>({
    type: 'DISABLED',
    scheduledTransactionReminders: true,
    overdueTransactions: true,
    budgetAlerts: true,
    isActive: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(Array.isArray(data) ? data : [])
        
        // Webhook設定があれば最初の設定をフォームに設定
        const settingsArray = Array.isArray(data) ? data : []
        const webhookSettings = settingsArray.find((s: NotificationSettings) => s.type === 'WEBHOOK')
        if (webhookSettings) {
          setCurrentSettings(webhookSettings)
        }
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
      setMessage({ type: 'error', text: '通知設定の読み込みに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentSettings)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: '通知設定を保存しました' })
        await loadSettings() // 設定を再読み込み
      } else {
        setMessage({ type: 'error', text: data.error || '保存に失敗しました' })
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error)
      setMessage({ type: 'error', text: '保存中にエラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  const testNotification = async () => {
    if (currentSettings.type !== 'WEBHOOK' || !currentSettings.webhookUrl) {
      setMessage({ type: 'error', text: 'Webhook通知が設定されていません' })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      // テスト用のペイロードで通知送信をテスト
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: currentSettings.webhookUrl,
          webhookType: currentSettings.webhookType
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'テスト通知を送信しました（実際のリマインダーがある場合）' })
      } else {
        setMessage({ type: 'error', text: data.error || 'テスト送信に失敗しました' })
      }
    } catch (error) {
      console.error('Failed to test notification:', error)
      setMessage({ type: 'error', text: 'テスト送信中にエラーが発生しました' })
    } finally {
      setTesting(false)
    }
  }

  const deleteSettings = async (settingsId: string) => {
    try {
      const response = await fetch(`/api/notifications/settings/${settingsId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '通知設定を削除しました' })
        await loadSettings()
        
        // 削除された設定が現在の設定の場合、リセット
        const deletedSettings = settings.find(s => s.id === settingsId)
        if (deletedSettings && currentSettings.id === settingsId) {
          setCurrentSettings({
            type: 'DISABLED',
            scheduledTransactionReminders: true,
            overdueTransactions: true,
            budgetAlerts: true,
            isActive: true
          })
        }
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || '削除に失敗しました' })
      }
    } catch (error) {
      console.error('Failed to delete notification settings:', error)
      setMessage({ type: 'error', text: '削除中にエラーが発生しました' })
    }
  }

  const getWebhookInstructions = (type: 'SLACK' | 'DISCORD') => {
    if (type === 'SLACK') {
      return (
        <div className="space-y-2">
          <h4 className="font-medium">Slack Webhook URL の取得方法:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Slack ワークスペースで「アプリ」を選択</li>
            <li>「Incoming Webhooks」アプリを追加</li>
            <li>通知を送信したいチャンネルを選択</li>
            <li>生成されたWebhook URLをコピー</li>
          </ol>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://api.slack.com/messaging/webhooks', '_blank')}
            className="cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Slack Webhooks ドキュメント
          </Button>
        </div>
      )
    } else {
      return (
        <div className="space-y-2">
          <h4 className="font-medium">Discord Webhook URL の取得方法:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Discordサーバーの設定を開く</li>
            <li>「連携サービス」→「ウェブフック」を選択</li>
            <li>「新しいウェブフック」を作成</li>
            <li>通知を送信したいチャンネルを選択</li>
            <li>「ウェブフックURLをコピー」</li>
          </ol>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://support.discord.com/hc/ja/articles/228383668', '_blank')}
            className="cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Discord Webhooks ガイド
          </Button>
        </div>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">通知設定を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* メッセージ表示 */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-green-200 bg-green-50 dark:bg-green-900/20'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {message.type === 'error' ? 'エラー' : '成功'}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">通知設定</TabsTrigger>
          <TabsTrigger value="logs">通知履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* 現在の設定状況 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知設定の状況
              </CardTitle>
              <CardDescription>
                現在アクティブな通知設定
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {settings.filter(s => s.isActive).map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {setting.type === 'WEBHOOK' && setting.webhookType === 'SLACK' && (
                        <MessageSquare className="h-5 w-5 text-green-600" />
                      )}
                      {setting.type === 'WEBHOOK' && setting.webhookType === 'DISCORD' && (
                        <Hash className="h-5 w-5 text-indigo-600" />
                      )}
                      {setting.type === 'DISABLED' && (
                        <BellOff className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <Badge variant={setting.type === 'DISABLED' ? 'secondary' : 'default'}>
                          {setting.type === 'WEBHOOK' ? `${setting.webhookType} Webhook` : '無効'}
                        </Badge>
                        {setting.webhookUrl && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {setting.webhookUrl.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setting.id && deleteSettings(setting.id)}
                      className="cursor-pointer text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {settings.filter(s => s.isActive).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    アクティブな通知設定がありません
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 新しい設定の追加/編集 */}
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>
                SlackやDiscordに予定取引のリマインダーを送信する設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 通知方法の選択 */}
              <div className="space-y-2">
                <Label>通知方法</Label>
                <Select
                  value={currentSettings.type}
                  onValueChange={(value: 'DISABLED' | 'WEBHOOK' | 'EMAIL') => 
                    setCurrentSettings({ ...currentSettings, type: value })
                  }
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISABLED">通知しない</SelectItem>
                    <SelectItem value="WEBHOOK">Webhook（Slack/Discord）</SelectItem>
                    <SelectItem value="EMAIL" disabled>メール（未実装）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Webhook設定 */}
              {currentSettings.type === 'WEBHOOK' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhookサービス</Label>
                    <Select
                      value={currentSettings.webhookType || ''}
                      onValueChange={(value: 'SLACK' | 'DISCORD') => 
                        setCurrentSettings({ ...currentSettings, webhookType: value })
                      }
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="サービスを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SLACK">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Slack
                          </div>
                        </SelectItem>
                        <SelectItem value="DISCORD">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Discord
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      type="url"
                      placeholder="https://hooks.slack.com/services/... または https://discord.com/api/webhooks/..."
                      value={currentSettings.webhookUrl || ''}
                      onChange={(e) => 
                        setCurrentSettings({ ...currentSettings, webhookUrl: e.target.value })
                      }
                    />
                  </div>

                  {/* 設定手順の表示 */}
                  {currentSettings.webhookType && (
                    <div className="p-4 bg-muted rounded-lg">
                      {getWebhookInstructions(currentSettings.webhookType)}
                    </div>
                  )}
                </div>
              )}

              {/* 通知対象の設定 */}
              <div className="space-y-4">
                <Label>通知対象</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>予定取引リマインダー</Label>
                      <p className="text-sm text-muted-foreground">
                        支払い期日が近づいた時の通知
                      </p>
                    </div>
                    <Switch
                      checked={currentSettings.scheduledTransactionReminders}
                      onCheckedChange={(checked) => 
                        setCurrentSettings({ ...currentSettings, scheduledTransactionReminders: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>期限切れ通知</Label>
                      <p className="text-sm text-muted-foreground">
                        期限を過ぎた予定取引の通知
                      </p>
                    </div>
                    <Switch
                      checked={currentSettings.overdueTransactions}
                      onCheckedChange={(checked) => 
                        setCurrentSettings({ ...currentSettings, overdueTransactions: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>予算アラート</Label>
                      <p className="text-sm text-muted-foreground">
                        予算超過時の通知（未実装）
                      </p>
                    </div>
                    <Switch
                      checked={currentSettings.budgetAlerts}
                      onCheckedChange={(checked) => 
                        setCurrentSettings({ ...currentSettings, budgetAlerts: checked })
                      }
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* 保存・テストボタン */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={saveSettings}
                  disabled={saving || currentSettings.type === 'WEBHOOK' && (!currentSettings.webhookUrl || !currentSettings.webhookType)}
                  className="cursor-pointer"
                >
                  {saving ? '保存中...' : '設定を保存'}
                </Button>
                
                {currentSettings.type === 'WEBHOOK' && currentSettings.webhookUrl && (
                  <Button
                    variant="outline"
                    onClick={testNotification}
                    disabled={testing}
                    className="cursor-pointer"
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    {testing ? 'テスト中...' : 'テスト送信'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>通知履歴</CardTitle>
              <CardDescription>
                送信された通知の履歴（未実装）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                通知履歴機能は今後実装予定です
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}