'use client'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  exchangeRatesAtom,
  baseCurrencyAtom,
  popularCurrencyPairsAtom,
  currencyMapAtom,
  exchangeRateLastUpdateAtom,
} from '../../lib/atoms/currency'
import { cn } from '../../lib/utils'
import { useAtomValue } from 'jotai'
import { TrendingUp, TrendingDown, RefreshCw, Clock } from 'lucide-react'

interface ExchangeRatesListProps {
  className?: string
  compact?: boolean
  showPopularOnly?: boolean
  onRefresh?: () => void
  isLoading?: boolean
}

export function ExchangeRatesList({
  className,
  compact = false,
  showPopularOnly = true,
  onRefresh,
  isLoading = false,
}: ExchangeRatesListProps) {
  const exchangeRates = useAtomValue(exchangeRatesAtom)
  const baseCurrency = useAtomValue(baseCurrencyAtom)
  const popularPairs = useAtomValue(popularCurrencyPairsAtom)
  const currencyMap = useAtomValue(currencyMapAtom)
  const lastUpdate = useAtomValue(exchangeRateLastUpdateAtom)

  // 表示する為替レートをフィルタリング
  const displayRates = showPopularOnly
    ? exchangeRates.filter((rate) => {
        const pair = `${rate.fromCurrency}-${rate.toCurrency}`
        return (
          popularPairs.includes(pair) ||
          rate.fromCurrency === baseCurrency ||
          rate.toCurrency === baseCurrency
        )
      })
    : exchangeRates

  // 通貨ペア別に最新レートのみ取得
  const latestRates = displayRates.reduce(
    (acc, rate) => {
      const key = `${rate.fromCurrency}-${rate.toCurrency}`
      if (!acc[key] || acc[key].timestamp < rate.timestamp) {
        acc[key] = rate
      }
      return acc
    },
    {} as Record<string, (typeof exchangeRates)[0]>
  )

  const latestRatesList = Object.values(latestRates).sort((a, b) => {
    // 基準通貨関連を上位に表示
    const aIsBase = a.fromCurrency === baseCurrency || a.toCurrency === baseCurrency
    const bIsBase = b.fromCurrency === baseCurrency || b.toCurrency === baseCurrency

    if (aIsBase && !bIsBase) return -1
    if (!aIsBase && bIsBase) return 1

    // アルファベット順
    return a.fromCurrency.localeCompare(b.fromCurrency)
  })

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp))
  }

  const formatLastUpdate = (timestamp: number | null) => {
    if (!timestamp) return '未更新'

    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (minutes < 60) {
      return `${minutes}分前`
    } else if (hours < 24) {
      return `${hours}時間前`
    } else {
      return formatTimestamp(new Date(timestamp))
    }
  }

  const getRateDisplay = (rate: (typeof exchangeRates)[0]) => {
    const fromCurrency = currencyMap.get(rate.fromCurrency)
    const toCurrency = currencyMap.get(rate.toCurrency)

    return {
      fromSymbol: fromCurrency?.symbol || rate.fromCurrency,
      toSymbol: toCurrency?.symbol || rate.toCurrency,
      fromName: fromCurrency?.name || rate.fromCurrency,
      toName: toCurrency?.name || rate.toCurrency,
      rate: Number(rate.rate),
      decimals: toCurrency?.decimals || 2,
    }
  }

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">為替レート</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatLastUpdate(lastUpdate)}</span>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
              </Button>
            )}
          </div>
        </div>

        {latestRatesList.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            為替レートデータがありません
          </div>
        ) : (
          <div className="space-y-1">
            {latestRatesList.slice(0, 5).map((rate) => {
              const display = getRateDisplay(rate)
              return (
                <div
                  key={`${rate.fromCurrency}-${rate.toCurrency}`}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{display.fromSymbol}</span>
                    <span className="text-sm font-medium">{rate.fromCurrency}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="font-mono text-xs">{display.toSymbol}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {display.rate.toFixed(display.decimals)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            為替レート
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatLastUpdate(lastUpdate)}</span>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                更新
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {latestRatesList.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>為替レートデータがありません</p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="mt-2"
              >
                データを更新
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {latestRatesList.map((rate) => {
              const display = getRateDisplay(rate)
              const isBaseCurrencyPair =
                rate.fromCurrency === baseCurrency || rate.toCurrency === baseCurrency

              return (
                <div
                  key={`${rate.fromCurrency}-${rate.toCurrency}`}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    isBaseCurrencyPair &&
                      'border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg">{display.fromSymbol}</span>
                      <span className="font-semibold">{rate.fromCurrency}</span>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg">{display.toSymbol}</span>
                      <span className="font-semibold">{rate.toCurrency}</span>
                    </div>
                    {isBaseCurrencyPair && (
                      <Badge variant="secondary" className="text-xs">
                        基準通貨
                      </Badge>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {display.rate.toFixed(display.decimals)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(rate.timestamp)}
                    </div>
                    {/* TODO: 変動率表示（履歴データが必要） */}
                    {/* <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+0.15%</span>
                    </div> */}
                  </div>
                </div>
              )
            })}

            {showPopularOnly && exchangeRates.length > latestRatesList.length && (
              <div className="text-center">
                <Button variant="ghost" size="sm">
                  すべての為替レートを表示
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
