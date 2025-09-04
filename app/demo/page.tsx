'use client'

import { useEffect, useState } from 'react'
import { useSetAtom } from 'jotai'
import Decimal from 'decimal.js'
import { currenciesAtom, exchangeRatesAtom } from '@/lib/atoms/currency'
import { accountsAtom } from '@/lib/atoms/accounts'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AccountCreateDialog } from '@/components/accounts/AccountCreateDialog'
import { CurrencyConverter } from '@/components/currency/CurrencyConverter'
import { ExchangeRatesList } from '@/components/currency/ExchangeRatesList'
import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// デモ用のサンプルデータ
const DEMO_CURRENCIES = [
  { code: 'JPY', symbol: '¥', name: '日本円', decimals: 0, isActive: true },
  { code: 'USD', symbol: '$', name: '米ドル', decimals: 2, isActive: true },
  { code: 'EUR', symbol: '€', name: 'ユーロ', decimals: 2, isActive: true },
  { code: 'GBP', symbol: '£', name: 'イギリスポンド', decimals: 2, isActive: true },
  { code: 'AUD', symbol: 'A$', name: 'オーストラリアドル', decimals: 2, isActive: true },
  { code: 'CAD', symbol: 'C$', name: 'カナダドル', decimals: 2, isActive: true },
]

const DEMO_EXCHANGE_RATES = [
  { id: '1', fromCurrency: 'USD', toCurrency: 'JPY', rate: new Decimal(150.25), timestamp: new Date(), source: 'Demo' },
  { id: '2', fromCurrency: 'EUR', toCurrency: 'JPY', rate: new Decimal(162.80), timestamp: new Date(), source: 'Demo' },
  { id: '3', fromCurrency: 'GBP', toCurrency: 'JPY', rate: new Decimal(185.50), timestamp: new Date(), source: 'Demo' },
  { id: '4', fromCurrency: 'AUD', toCurrency: 'JPY', rate: new Decimal(98.75), timestamp: new Date(), source: 'Demo' },
  { id: '5', fromCurrency: 'CAD', toCurrency: 'JPY', rate: new Decimal(108.20), timestamp: new Date(), source: 'Demo' },
  { id: '6', fromCurrency: 'JPY', toCurrency: 'USD', rate: new Decimal(0.00666), timestamp: new Date(), source: 'Demo' },
  { id: '7', fromCurrency: 'JPY', toCurrency: 'EUR', rate: new Decimal(0.00614), timestamp: new Date(), source: 'Demo' },
]

const DEMO_ACCOUNTS = [
  {
    id: 'demo-1',
    name: 'メイン普通預金',
    type: 'CHECKING' as const,
    balance: 1250000,
    currency: 'JPY',
    isActive: true,
    description: '給与振込・日常利用',
    userId: 'demo-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    fixedDepositRate: null,
    fixedDepositMaturity: null,
    currencyRef: { symbol: '¥' }
  },
  {
    id: 'demo-2',
    name: '貯蓄口座',
    type: 'SAVINGS' as const,
    balance: 3500000,
    currency: 'JPY',
    isActive: true,
    description: '将来のための貯蓄',
    userId: 'demo-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    fixedDepositRate: null,
    fixedDepositMaturity: null,
    currencyRef: { symbol: '¥' }
  },
  {
    id: 'demo-3',
    name: 'USD Account',
    type: 'CHECKING' as const,
    balance: 2500,
    currency: 'USD',
    isActive: true,
    description: '海外投資用',
    userId: 'demo-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    fixedDepositRate: null,
    fixedDepositMaturity: null,
    currencyRef: { symbol: '$' }
  },
  {
    id: 'demo-4',
    name: '定期預金',
    type: 'FIXED_DEPOSIT' as const,
    balance: 5000000,
    currency: 'JPY',
    isActive: true,
    description: '1年満期定期預金',
    userId: 'demo-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    fixedDepositRate: 0.5,
    fixedDepositMaturity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    currencyRef: { symbol: '¥' }
  },
  {
    id: 'demo-5',
    name: '現金',
    type: 'CASH' as const,
    balance: 50000,
    currency: 'JPY',
    isActive: true,
    description: '手元現金',
    userId: 'demo-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    fixedDepositRate: null,
    fixedDepositMaturity: null,
    currencyRef: { symbol: '¥' }
  },
]

export default function DemoPage() {
  const [mounted, setMounted] = useState(false)
  const setCurrencies = useSetAtom(currenciesAtom)
  const setExchangeRates = useSetAtom(exchangeRatesAtom)
  const setAccounts = useSetAtom(accountsAtom)

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setMounted(true)
  }, [])

  // デモデータの読み込み
  useEffect(() => {
    if (mounted) {
      setCurrencies(DEMO_CURRENCIES)
      setExchangeRates(DEMO_EXCHANGE_RATES)
      setAccounts(DEMO_ACCOUNTS as any)
    }
  }, [mounted, setCurrencies, setExchangeRates, setAccounts])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold">kiBoアプリ - Phase 4 デモ</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-sm text-muted-foreground">
                デモモード（認証なし）
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Phase 4: 通貨・口座管理システム</h2>
            <p className="text-muted-foreground">
              多通貨対応の資産管理機能のデモンストレーション
            </p>
            <div className="mt-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-600 dark:text-yellow-200">
              これはデモデータです。実際のデータベースには接続されていません。
            </div>
          </div>

          {/* 概要カード */}
          <OverviewCards />

          {/* メインコンテンツグリッド */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 口座一覧 */}
            <div className="relative">
              <AccountsList
                onCreateAccount={() => {}}
                onAccountSelect={(id) => alert(`口座ID: ${id} が選択されました`)}
              />
              {/* 口座作成ボタンをオーバーレイ */}
              <div className="absolute top-6 right-6">
                <AccountCreateDialog />
              </div>
            </div>

            {/* 通貨変換 */}
            <CurrencyConverter />
          </div>

          {/* 為替レート一覧 */}
          <ExchangeRatesList
            onRefresh={() => alert('デモモードでは更新できません')}
            showPopularOnly={false}
          />

          {/* Phase 4 機能一覧 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">✅ 実装済み機能</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 多通貨対応（10通貨）</li>
                <li>• 口座管理（4種類）</li>
                <li>• 為替レート管理</li>
                <li>• リアルタイム通貨変換</li>
                <li>• 定期預金管理</li>
                <li>• 資産統計表示</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">🛠 技術スタック</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Next.js 15 + React 19</li>
                <li>• Prisma + PostgreSQL</li>
                <li>• Jotai 状態管理</li>
                <li>• Decimal.js 高精度計算</li>
                <li>• shadcn/ui コンポーネント</li>
                <li>• better-auth 認証</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">📊 Phase 4 成果</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• APIエンドポイント: 8個</li>
                <li>• UIコンポーネント: 10個</li>
                <li>• 状態管理atoms: 30個</li>
                <li>• ユーティリティ: 15個</li>
                <li>• TypeScript型定義: 完全</li>
              </ul>
            </div>
          </div>

          {/* アクセス情報 */}
          <div className="mt-8 p-4 rounded-lg border bg-muted/50">
            <h3 className="font-semibold mb-2">🔗 アクセス可能なページ</h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">デモページ: </span>
                <span className="font-mono">http://localhost:3000/demo</span>
              </div>
              <div>
                <span className="text-muted-foreground">ログインページ: </span>
                <span className="font-mono">http://localhost:3000/login</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}