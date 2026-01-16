import { useMemo } from 'react'

interface CurrencyFormatterResult {
  formatAmount: (amount: number | string | undefined | null) => string
  formatCompact: (amount: number | string | undefined | null) => string
  getInputStep: () => string
  getPlaceholder: () => string
  getMinValue: () => string
  isJPY: boolean
}

export function useCurrencyFormatter(currency: string = 'JPY'): CurrencyFormatterResult {
  const isJPY = currency === 'JPY'

  const formatter = useMemo(() => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
      minimumFractionDigits: isJPY ? 0 : 2,
      maximumFractionDigits: isJPY ? 0 : 2,
    })
  }, [currency, isJPY])

  const compactFormatter = useMemo(() => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })
  }, [currency])

  const formatAmount = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null || amount === '') {
      return ''
    }
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numValue)) {
      return ''
    }
    return formatter.format(numValue)
  }

  const formatCompact = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null || amount === '') {
      return ''
    }
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numValue)) {
      return ''
    }
    return compactFormatter.format(numValue)
  }

  const getInputStep = (): string => {
    return isJPY ? '1' : '0.01'
  }

  const getPlaceholder = (): string => {
    return isJPY ? '0' : '0.00'
  }

  const getMinValue = (): string => {
    return isJPY ? '1' : '0.01'
  }

  return {
    formatAmount,
    formatCompact,
    getInputStep,
    getPlaceholder,
    getMinValue,
    isJPY,
  }
}

// 通貨シンボルを取得するユーティリティ関数
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    JPY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CNY: '¥',
    KRW: '₩',
  }
  return symbols[currency] || currency
}

// 通貨の小数点桁数を取得するユーティリティ関数
export function getCurrencyDecimals(currency: string): number {
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND']
  return noDecimalCurrencies.includes(currency) ? 0 : 2
}
