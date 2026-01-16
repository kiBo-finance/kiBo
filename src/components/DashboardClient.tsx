'use client'

import { AccountCreateDialog } from '@/components/accounts/AccountCreateDialog'
import { AccountsList } from '@/components/accounts/AccountsList'
import { CurrencyConverter } from '@/components/currency/CurrencyConverter'
import { ExchangeRatesList } from '@/components/currency/ExchangeRatesList'
import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { ScheduledTransactionsOverview } from '@/components/dashboard/ScheduledTransactionsOverview'
import { PostpayPaymentsOverview } from '@/components/postpay/PostpayPaymentsOverview'
import {
  currenciesAtom,
  exchangeRatesAtom,
  setExchangeRateUpdateTimeAtom,
} from '@/lib/atoms/currency'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useCards } from '@/lib/hooks/useCards'
import type { AppAccount } from '@prisma/client'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'

export function DashboardClient() {
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

  const handleCreateAccount = async (_account: AppAccount) => {
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
        <p className="text-muted-foreground">あなたの資産状況を一目で確認できます</p>
      </div>

      {/* 概要カード */}
      <OverviewCards />

      {/* メインコンテンツ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 口座一覧 */}
        <AccountsList
          onAccountSelect={handleAccountSelect}
          compact
          createTrigger={
            <AccountCreateDialog
              onAccountCreated={handleCreateAccount}
              trigger={
                <button className="inline-flex h-6 w-6 cursor-pointer items-center justify-center whitespace-nowrap rounded p-0 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                </button>
              }
            />
          }
        />

        {/* 予定取引概要 */}
        <ScheduledTransactionsOverview />
      </div>

      {/* ポストペイ支払い概要 */}
      <PostpayPaymentsOverview />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 通貨変換 */}
        <CurrencyConverter />

        {/* スペース確保用（将来的にはレポートなど） */}
        <div></div>
      </div>

      {/* 為替レート */}
      <ExchangeRatesList onRefresh={handleRefreshRates} showPopularOnly />
    </div>
  )
}
