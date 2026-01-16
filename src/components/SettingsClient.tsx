'use client'

import { CurrencySelect } from '@/components/currency/CurrencySelect'
import { ExchangeRatesList } from '@/components/currency/ExchangeRatesList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  currenciesAtom,
  baseCurrencyAtom,
  changeBaseCurrencyAtom,
  exchangeRatesAtom,
  setExchangeRateUpdateTimeAtom,
  currencyFormatPreferencesAtom,
} from '@/lib/atoms/currency'
import { useAtomValue, useSetAtom } from 'jotai'
import { Settings, Globe, RefreshCw, Bell, ExternalLink } from 'lucide-react'
import { Link } from 'waku/router/client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function SettingsClient() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const currencies = useAtomValue(currenciesAtom)
  const baseCurrency = useAtomValue(baseCurrencyAtom)
  const changeBaseCurrency = useSetAtom(changeBaseCurrencyAtom)
  const setCurrencies = useSetAtom(currenciesAtom)
  const setExchangeRates = useSetAtom(exchangeRatesAtom)
  const setExchangeRateUpdateTime = useSetAtom(setExchangeRateUpdateTimeAtom)
  const formatPreferences = useAtomValue(currencyFormatPreferencesAtom)
  const setFormatPreferences = useSetAtom(currencyFormatPreferencesAtom)

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        // ユーザー設定を取得（サーバーから基準通貨を同期）
        const userSettingsRes = await fetch('/api/user/settings')
        if (userSettingsRes.ok) {
          const userSettings = await userSettingsRes.json()
          if (userSettings.baseCurrency) {
            changeBaseCurrency(userSettings.baseCurrency)
          }
        }

        // 通貨データ取得
        const currenciesRes = await fetch('/api/currencies')
        if (currenciesRes.ok) {
          const currencies = await currenciesRes.json()
          setCurrencies(currencies)
        }

        // 為替レート取得
        const ratesRes = await fetch('/api/exchange-rates?latest=true')
        if (ratesRes.ok) {
          const rates = await ratesRes.json()
          setExchangeRates(rates)
        }
      } catch (error) {
        console.error('Failed to load settings data:', error)
      }
    }

    loadData()
  }, [setCurrencies, setExchangeRates, changeBaseCurrency])

  const handleBaseCurrencyChange = async (newCurrency: string) => {
    setIsSaving(true)

    try {
      // サーバーに保存
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseCurrency: newCurrency }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update settings')
      }

      // ローカル状態を更新
      changeBaseCurrency(newCurrency)
      toast.success('基準通貨を更新しました')
    } catch (error) {
      console.error('Failed to update base currency:', error)
      toast.error('基準通貨の更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRefreshRates = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/exchange-rates?latest=true')
      if (response.ok) {
        const rates = await response.json()
        setExchangeRates(rates)
        setExchangeRateUpdateTime()
      }
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormatPreferenceChange = (key: string, value: string | boolean) => {
    setFormatPreferences({
      ...formatPreferences,
      [key]: value,
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">設定</h2>
        <p className="text-muted-foreground">アプリケーションの設定を管理します</p>
      </div>

      {/* 通貨設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            通貨設定
          </CardTitle>
          <CardDescription>基準通貨や表示形式を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基準通貨 */}
          <div className="space-y-2">
            <Label htmlFor="base-currency">基準通貨</Label>
            <div className="flex items-center gap-4">
              <CurrencySelect
                value={baseCurrency}
                onValueChange={handleBaseCurrencyChange}
                className="w-64"
                disabled={isSaving}
              />
              {isSaving && <span className="text-sm text-muted-foreground">保存中...</span>}
            </div>
            <p className="text-sm text-muted-foreground">
              総資産の計算や統計表示に使用される通貨です
            </p>
          </div>

          {/* 表示形式設定 */}
          <div className="space-y-4">
            <h3 className="font-medium">表示形式</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-symbols">通貨記号を表示</Label>
                <p className="text-sm text-muted-foreground">
                  金額の前に通貨記号（\u00a5、$など）を表示します
                </p>
              </div>
              <Switch
                id="show-symbols"
                checked={formatPreferences.showSymbols}
                onCheckedChange={(checked) => handleFormatPreferenceChange('showSymbols', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-codes">通貨コードを表示</Label>
                <p className="text-sm text-muted-foreground">
                  金額の後に通貨コード（JPY、USDなど）を表示します
                </p>
              </div>
              <Switch
                id="show-codes"
                checked={formatPreferences.showCodes}
                onCheckedChange={(checked) => handleFormatPreferenceChange('showCodes', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale">地域設定</Label>
              <Select
                value={formatPreferences.locale}
                onValueChange={(value) => handleFormatPreferenceChange('locale', value)}
              >
                <SelectTrigger id="locale" className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja-JP">日本（日本語）</SelectItem>
                  <SelectItem value="en-US">アメリカ（英語）</SelectItem>
                  <SelectItem value="en-GB">イギリス（英語）</SelectItem>
                  <SelectItem value="zh-CN">中国（中国語）</SelectItem>
                  <SelectItem value="ko-KR">韓国（韓国語）</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">数値や日付の表示形式に影響します</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 為替レート */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                為替レート管理
              </CardTitle>
              <CardDescription>最新の為替レートを確認・更新できます</CardDescription>
            </div>
            <Button onClick={handleRefreshRates} disabled={isLoading} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ExchangeRatesList
            compact
            showPopularOnly={false}
            onRefresh={handleRefreshRates}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* 通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知設定
          </CardTitle>
          <CardDescription>SlackやDiscordに予定取引のリマインダーを送信する設定</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Webhook通知</p>
              <p className="text-sm text-muted-foreground">
                Slack、Discordに予定取引のリマインダーや期限切れ通知を送信
              </p>
            </div>
            <Link to={"/dashboard/settings/notifications" as any}>
              <Button variant="outline" className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                設定を開く
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* その他の設定（将来的に追加） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            その他の設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            今後、セキュリティ設定、データエクスポートなどの機能が追加される予定です。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
