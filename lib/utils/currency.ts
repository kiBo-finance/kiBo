import { Decimal } from 'decimal.js'
import type { Currency, ExchangeRate } from '@prisma/client'

// 通貨フォーマッティング設定
export const CURRENCY_FORMATS: Record<string, Intl.NumberFormatOptions> = {
  JPY: { style: 'currency', currency: 'JPY', minimumFractionDigits: 0, maximumFractionDigits: 0 },
  USD: { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  EUR: { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  GBP: { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  AUD: { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  CAD: { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  CHF: { style: 'currency', currency: 'CHF', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  CNY: { style: 'currency', currency: 'CNY', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  KRW: { style: 'currency', currency: 'KRW', minimumFractionDigits: 0, maximumFractionDigits: 0 },
  THB: { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 },
}

// Decimal.jsの設定
Decimal.config({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP
})

/**
 * 通貨金額を高精度で計算するクラス
 */
export class CurrencyAmount {
  private amount: Decimal
  private currency: string

  constructor(amount: string | number | Decimal, currency: string) {
    this.amount = new Decimal(amount)
    this.currency = currency.toUpperCase()
  }

  /**
   * 別の通貨金額を加算
   */
  add(other: CurrencyAmount, exchangeRate?: number): CurrencyAmount {
    if (this.currency === other.currency) {
      return new CurrencyAmount(this.amount.plus(other.amount), this.currency)
    }
    
    if (!exchangeRate) {
      throw new Error(`Exchange rate required for ${other.currency} to ${this.currency}`)
    }
    
    const convertedAmount = other.amount.mul(exchangeRate)
    return new CurrencyAmount(this.amount.plus(convertedAmount), this.currency)
  }

  /**
   * 別の通貨金額を減算
   */
  subtract(other: CurrencyAmount, exchangeRate?: number): CurrencyAmount {
    if (this.currency === other.currency) {
      return new CurrencyAmount(this.amount.minus(other.amount), this.currency)
    }
    
    if (!exchangeRate) {
      throw new Error(`Exchange rate required for ${other.currency} to ${this.currency}`)
    }
    
    const convertedAmount = other.amount.mul(exchangeRate)
    return new CurrencyAmount(this.amount.minus(convertedAmount), this.currency)
  }

  /**
   * 乗算
   */
  multiply(multiplier: string | number | Decimal): CurrencyAmount {
    return new CurrencyAmount(this.amount.mul(multiplier), this.currency)
  }

  /**
   * 除算
   */
  divide(divisor: string | number | Decimal): CurrencyAmount {
    return new CurrencyAmount(this.amount.div(divisor), this.currency)
  }

  /**
   * 他の通貨に変換
   */
  convertTo(targetCurrency: string, exchangeRate: number): CurrencyAmount {
    if (this.currency === targetCurrency.toUpperCase()) {
      return this
    }
    
    return new CurrencyAmount(this.amount.mul(exchangeRate), targetCurrency)
  }

  /**
   * Decimal値を取得
   */
  toDecimal(): Decimal {
    return this.amount
  }

  /**
   * 数値を取得
   */
  toNumber(): number {
    return this.amount.toNumber()
  }

  /**
   * 文字列を取得
   */
  toString(): string {
    return this.amount.toString()
  }

  /**
   * 通貨コードを取得
   */
  getCurrency(): string {
    return this.currency
  }

  /**
   * フォーマットされた文字列を取得
   */
  format(locale: string = 'ja-JP'): string {
    const formatOptions = CURRENCY_FORMATS[this.currency]
    if (!formatOptions) {
      return `${this.amount.toString()} ${this.currency}`
    }
    
    try {
      return new Intl.NumberFormat(locale, formatOptions).format(this.amount.toNumber())
    } catch (error) {
      return `${this.amount.toString()} ${this.currency}`
    }
  }

  /**
   * 比較演算
   */
  equals(other: CurrencyAmount): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount)
  }

  greaterThan(other: CurrencyAmount, exchangeRate?: number): boolean {
    if (this.currency !== other.currency && !exchangeRate) {
      throw new Error(`Exchange rate required for comparison`)
    }
    
    if (this.currency === other.currency) {
      return this.amount.greaterThan(other.amount)
    }
    
    const convertedAmount = other.amount.mul(exchangeRate!)
    return this.amount.greaterThan(convertedAmount)
  }

  lessThan(other: CurrencyAmount, exchangeRate?: number): boolean {
    if (this.currency !== other.currency && !exchangeRate) {
      throw new Error(`Exchange rate required for comparison`)
    }
    
    if (this.currency === other.currency) {
      return this.amount.lessThan(other.amount)
    }
    
    const convertedAmount = other.amount.mul(exchangeRate!)
    return this.amount.lessThan(convertedAmount)
  }
}

/**
 * 為替レート管理クラス
 */
export class ExchangeRateManager {
  private rates: Map<string, Decimal> = new Map()

  constructor(exchangeRates: ExchangeRate[] = []) {
    this.updateRates(exchangeRates)
  }

  /**
   * レートを更新
   */
  updateRates(exchangeRates: ExchangeRate[]): void {
    this.rates.clear()
    
    for (const rate of exchangeRates) {
      const key = `${rate.fromCurrency}-${rate.toCurrency}`
      this.rates.set(key, new Decimal(rate.rate))
      
      // 逆方向のレートも計算
      const reverseKey = `${rate.toCurrency}-${rate.fromCurrency}`
      this.rates.set(reverseKey, new Decimal(1).div(rate.rate))
    }
  }

  /**
   * レートを取得
   */
  getRate(fromCurrency: string, toCurrency: string): Decimal | null {
    if (fromCurrency === toCurrency) {
      return new Decimal(1)
    }
    
    const key = `${fromCurrency}-${toCurrency}`
    return this.rates.get(key) || null
  }

  /**
   * 金額を変換
   */
  convert(amount: CurrencyAmount, toCurrency: string): CurrencyAmount | null {
    const rate = this.getRate(amount.getCurrency(), toCurrency)
    if (!rate) {
      return null
    }
    
    return amount.convertTo(toCurrency, rate.toNumber())
  }

  /**
   * 利用可能な通貨ペアを取得
   */
  getAvailablePairs(): string[] {
    return Array.from(this.rates.keys())
  }

  /**
   * レートが存在するかチェック
   */
  hasRate(fromCurrency: string, toCurrency: string): boolean {
    return this.getRate(fromCurrency, toCurrency) !== null
  }
}

/**
 * ユーティリティ関数群
 */

/**
 * 通貨金額を作成
 */
export function createCurrencyAmount(amount: string | number | Decimal, currency: string): CurrencyAmount {
  return new CurrencyAmount(amount, currency)
}

/**
 * 通貨をフォーマット
 */
export function formatCurrency(amount: string | number | Decimal, currency: string, locale: string = 'ja-JP'): string {
  return createCurrencyAmount(amount, currency).format(locale)
}

/**
 * 通貨の小数点以下桁数を取得
 */
export function getCurrencyDecimals(currency: string): number {
  const formatOptions = CURRENCY_FORMATS[currency.toUpperCase()]
  return formatOptions?.minimumFractionDigits ?? 2
}

/**
 * 通貨リストを金額でソート
 */
export function sortCurrencyAmounts(amounts: CurrencyAmount[], exchangeManager: ExchangeRateManager, baseCurrency: string = 'JPY'): CurrencyAmount[] {
  return [...amounts].sort((a, b) => {
    const aConverted = exchangeManager.convert(a, baseCurrency) || a
    const bConverted = exchangeManager.convert(b, baseCurrency) || b
    
    return bConverted.toDecimal().minus(aConverted.toDecimal()).toNumber()
  })
}

/**
 * 複数通貨の合計を基準通貨で計算
 */
export function sumCurrencyAmounts(amounts: CurrencyAmount[], exchangeManager: ExchangeRateManager, baseCurrency: string): CurrencyAmount {
  let total = createCurrencyAmount(0, baseCurrency)
  
  for (const amount of amounts) {
    const converted = exchangeManager.convert(amount, baseCurrency)
    if (converted) {
      total = total.add(converted)
    }
  }
  
  return total
}

/**
 * パーセンテージ計算
 */
export function calculatePercentage(part: CurrencyAmount, total: CurrencyAmount, exchangeManager: ExchangeRateManager): number {
  const baseCurrency = total.getCurrency()
  const convertedPart = exchangeManager.convert(part, baseCurrency) || part
  
  if (total.toDecimal().isZero()) {
    return 0
  }
  
  return convertedPart.toDecimal().div(total.toDecimal()).mul(100).toNumber()
}

/**
 * 為替レート変動の計算
 */
export function calculateRateChange(currentRate: Decimal, previousRate: Decimal): { change: Decimal, changePercent: Decimal } {
  const change = currentRate.minus(previousRate)
  const changePercent = previousRate.isZero() ? new Decimal(0) : change.div(previousRate).mul(100)
  
  return { change, changePercent }
}