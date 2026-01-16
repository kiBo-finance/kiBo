'use client'

import { CurrencySelect } from './CurrencySelect'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  exchangeRateManagerAtom,
  baseCurrencyAtom,
  addRecentCurrencyAtom,
  currencyMapAtom,
} from '@/lib/atoms/currency'
import { cn } from '@/lib/utils'
import { CurrencyAmount, calculateRateChange } from '@/lib/utils/currency'
import { useAtomValue, useSetAtom } from 'jotai'
import { ArrowUpDown, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CurrencyConverterProps {
  initialFromCurrency?: string
  initialToCurrency?: string
  initialAmount?: number
  className?: string
  compact?: boolean
}

export function CurrencyConverter({
  initialFromCurrency,
  initialToCurrency,
  initialAmount = 1,
  className,
  compact = false,
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState(initialAmount.toString())
  const [fromCurrency, setFromCurrency] = useState(initialFromCurrency || '')
  const [toCurrency, setToCurrency] = useState(initialToCurrency || '')

  const exchangeManager = useAtomValue(exchangeRateManagerAtom)
  const baseCurrency = useAtomValue(baseCurrencyAtom)
  const addRecentCurrency = useSetAtom(addRecentCurrencyAtom)
  const currencyMap = useAtomValue(currencyMapAtom)

  // デフォルト通貨設定
  useEffect(() => {
    if (!fromCurrency) {
      setFromCurrency(baseCurrency)
    }
    if (!toCurrency && baseCurrency !== 'USD') {
      setToCurrency('USD')
    }
  }, [baseCurrency, fromCurrency, toCurrency])

  // 変換計算
  const convertedAmount = (() => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || !fromCurrency || !toCurrency) return null

    if (fromCurrency === toCurrency) return numAmount

    const rate = exchangeManager.getRate(fromCurrency, toCurrency)
    return rate ? rate.mul(numAmount).toNumber() : null
  })()

  // 為替レート取得
  const exchangeRate =
    fromCurrency && toCurrency && fromCurrency !== toCurrency
      ? exchangeManager.getRate(fromCurrency, toCurrency)
      : null

  // 逆レート
  const reverseRate =
    toCurrency && fromCurrency && fromCurrency !== toCurrency
      ? exchangeManager.getRate(toCurrency, fromCurrency)
      : null

  const fromCurrencyInfo = fromCurrency ? currencyMap.get(fromCurrency) : null
  const toCurrencyInfo = toCurrency ? currencyMap.get(toCurrency) : null

  const handleAmountChange = (value: string) => {
    // 数値のみ許可（小数点含む）
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
    }
  }

  const handleSwapCurrencies = () => {
    const temp = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(temp)

    // 金額も変換
    if (convertedAmount !== null && !isNaN(convertedAmount)) {
      setAmount(convertedAmount.toString())
    }
  }

  const handleFromCurrencyChange = (currency: string) => {
    setFromCurrency(currency)
    addRecentCurrency(currency)
  }

  const handleToCurrencyChange = (currency: string) => {
    setToCurrency(currency)
    addRecentCurrency(currency)
  }

  const formatAmount = (value: number, currencyCode: string) => {
    const currency = currencyMap.get(currencyCode)
    if (!currency) return value.toString()

    return new CurrencyAmount(value, currencyCode).format()
  }

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="flex-1"
            placeholder="金額"
          />
          <CurrencySelect
            value={fromCurrency}
            onValueChange={handleFromCurrencyChange}
            className="w-32"
          />
        </div>

        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwapCurrencies}
            disabled={!fromCurrency || !toCurrency}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 rounded border bg-muted/50 p-2">
            <div className="font-medium">
              {convertedAmount !== null ? formatAmount(convertedAmount, toCurrency) : '--'}
            </div>
          </div>
          <CurrencySelect
            value={toCurrency}
            onValueChange={handleToCurrencyChange}
            className="w-32"
          />
        </div>

        {exchangeRate && (
          <div className="text-center text-xs text-muted-foreground">
            1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          通貨換算
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="from-amount">換算元</Label>
          <div className="flex gap-2">
            <Input
              id="from-amount"
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1"
              placeholder="金額を入力"
            />
            <CurrencySelect
              value={fromCurrency}
              onValueChange={handleFromCurrencyChange}
              className="w-48"
            />
          </div>
        </div>

        <div className="flex justify-center py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapCurrencies}
            disabled={!fromCurrency || !toCurrency}
            className="rounded-full"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-amount">換算先</Label>
          <div className="flex gap-2">
            <div className="flex-1 rounded border bg-muted/50 p-3">
              <div className="text-lg font-semibold">
                {convertedAmount !== null ? formatAmount(convertedAmount, toCurrency) : '--'}
              </div>
            </div>
            <CurrencySelect
              value={toCurrency}
              onValueChange={handleToCurrencyChange}
              className="w-48"
            />
          </div>
        </div>

        {exchangeRate && reverseRate && (
          <div className="space-y-2 rounded border bg-muted/50 p-3">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>1 {fromCurrency} =</span>
                <span className="font-medium">
                  {exchangeRate.toFixed(fromCurrencyInfo?.decimals || 2)} {toCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>1 {toCurrency} =</span>
                <span className="font-medium">
                  {reverseRate.toFixed(toCurrencyInfo?.decimals || 2)} {fromCurrency}
                </span>
              </div>
            </div>

            {/* TODO: 為替レート変動表示（履歴データが必要）*/}
            {/* <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span>+0.25% (24h)</span>
            </div> */}
          </div>
        )}

        {!exchangeRate && fromCurrency && toCurrency && fromCurrency !== toCurrency && (
          <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-200">
            {fromCurrency} から {toCurrency} への為替レートが見つかりません
          </div>
        )}
      </CardContent>
    </Card>
  )
}
