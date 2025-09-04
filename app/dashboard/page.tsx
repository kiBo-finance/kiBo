'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { 
  currenciesAtom, 
  exchangeRatesAtom,
  setExchangeRateUpdateTimeAtom 
} from '@/lib/atoms/currency'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useCards } from '@/lib/hooks/useCards'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AccountCreateDialog } from '@/components/accounts/AccountCreateDialog'
import { CurrencyConverter } from '@/components/currency/CurrencyConverter'
import { ExchangeRatesList } from '@/components/currency/ExchangeRatesList'
import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { ScheduledTransactionsOverview } from '@/components/dashboard/ScheduledTransactionsOverview'

export default function DashboardPage() {
  const setCurrencies = useSetAtom(currenciesAtom)
  const setExchangeRates = useSetAtom(exchangeRatesAtom)
  const setExchangeRateUpdateTime = useSetAtom(setExchangeRateUpdateTimeAtom)
  
  // Use custom hooks for accounts and cards
  const { accounts, refreshAccounts } = useAccounts()
  const { cards, refreshCards } = useCards()

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
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
          setExchangeRateUpdateTime()
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      }
    }

    loadData()
  }, [setCurrencies, setExchangeRates, setExchangeRateUpdateTime])

  const handleRefreshRates = async () => {
    try {
      const ratesRes = await fetch('/api/exchange-rates?latest=true')
      if (ratesRes.ok) {
        const rates = await ratesRes.json()
        setExchangeRates(rates)
        setExchangeRateUpdateTime()
      }
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error)
    }
  }

  const handleCreateAccount = async (account: any) => {
    // アカウントが作成されたら、データを再読み込み
    await refreshAccounts()
  }

  const handleAccountSelect = (accountId: string) => {
    window.location.href = `/dashboard/accounts/${accountId}`
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <p className="text-muted-foreground">
          あなたの資産状況を一目で確認できます
        </p>
      </div>

      {/* 概要カード */}
      <OverviewCards />

      {/* メインコンテンツ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 口座一覧 */}
        <div className="relative">
          <AccountsList
            onAccountSelect={handleAccountSelect}
            compact
          />
          {/* 口座作成ボタンをオーバーレイ */}
          <div className="absolute top-3 right-3">
            <AccountCreateDialog 
              onAccountCreated={handleCreateAccount}
              trigger={
                <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:bg-accent hover:text-accent-foreground h-6 w-6 p-0 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                </button>
              }
            />
          </div>
        </div>

        {/* 予定取引概要 */}
        <ScheduledTransactionsOverview />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 通貨変換 */}
        <CurrencyConverter />
        
        {/* スペース確保用（将来的にはレポートなど） */}
        <div></div>
      </div>

      {/* 為替レート */}
      <ExchangeRatesList
        onRefresh={handleRefreshRates}
        showPopularOnly
      />
    </div>
  )
}