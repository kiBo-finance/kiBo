import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { Currency, ExchangeRate } from '@prisma/client'
import { ExchangeRateManager } from '@/lib/utils/currency'

// 通貨リスト
export const currenciesAtom = atom<Currency[]>([])

// 基準通貨（localStorage に保存）
export const baseCurrencyAtom = atomWithStorage<string>('kibo-baseCurrency', 'JPY')

// 為替レート
export const exchangeRatesAtom = atom<ExchangeRate[]>([])

// 為替レート管理インスタンス（派生atom）
export const exchangeRateManagerAtom = atom((get) => {
  const rates = get(exchangeRatesAtom)
  return new ExchangeRateManager(rates)
})

// 為替レートマップ（レガシー互換性）
export const exchangeRateMapAtom = atom((get) => {
  const rates = get(exchangeRatesAtom)
  const rateMap = new Map<string, number>()
  
  rates.forEach(rate => {
    const key = `${rate.fromCurrency}-${rate.toCurrency}`
    rateMap.set(key, Number(rate.rate))
    
    // 逆方向のレートも追加
    const reverseKey = `${rate.toCurrency}-${rate.fromCurrency}`
    rateMap.set(reverseKey, 1 / Number(rate.rate))
  })
  
  return rateMap
})

// アクティブ通貨リスト
export const activeCurrenciesAtom = atom((get) => {
  const currencies = get(currenciesAtom)
  return currencies.filter(currency => currency.isActive)
})

// 通貨マップ（コード -> 通貨オブジェクト）
export const currencyMapAtom = atom((get) => {
  const currencies = get(currenciesAtom)
  const currencyMap = new Map<string, Currency>()
  
  currencies.forEach(currency => {
    currencyMap.set(currency.code, currency)
  })
  
  return currencyMap
})

// 基準通貨オブジェクト
export const baseCurrencyObjectAtom = atom((get) => {
  const baseCurrencyCode = get(baseCurrencyAtom)
  const currencyMap = get(currencyMapAtom)
  
  return currencyMap.get(baseCurrencyCode) || null
})

// 通貨選択肢（基準通貨以外）
export const otherCurrenciesAtom = atom((get) => {
  const activeCurrencies = get(activeCurrenciesAtom)
  const baseCurrency = get(baseCurrencyAtom)
  
  return activeCurrencies.filter(currency => currency.code !== baseCurrency)
})

// 為替レート更新アクション
export const updateExchangeRatesAtom = atom(
  null,
  (get, set, newRates: ExchangeRate[]) => {
    set(exchangeRatesAtom, newRates)
  }
)

// 通貨追加アクション
export const addCurrencyAtom = atom(
  null,
  (get, set, newCurrency: Currency) => {
    const currentCurrencies = get(currenciesAtom)
    set(currenciesAtom, [...currentCurrencies, newCurrency])
  }
)

// 通貨更新アクション
export const updateCurrencyAtom = atom(
  null,
  (get, set, updatedCurrency: Currency) => {
    const currentCurrencies = get(currenciesAtom)
    set(currenciesAtom, 
      currentCurrencies.map(currency => 
        currency.code === updatedCurrency.code ? updatedCurrency : currency
      )
    )
  }
)

// 基準通貨変更アクション
export const changeBaseCurrencyAtom = atom(
  null,
  (get, set, newBaseCurrency: string) => {
    const currencyMap = get(currencyMapAtom)
    if (currencyMap.has(newBaseCurrency)) {
      set(baseCurrencyAtom, newBaseCurrency)
    }
  }
)

// 為替レート取得ヘルパー
export const getExchangeRateAtom = atom(
  null,
  (get, set, fromCurrency: string, toCurrency: string) => {
    const rateManager = get(exchangeRateManagerAtom)
    return rateManager.getRate(fromCurrency, toCurrency)
  }
)

// 通貨変換ヘルパー
export const convertCurrencyAtom = atom(
  null,
  (get, set, amount: number, fromCurrency: string, toCurrency: string) => {
    const rateManager = get(exchangeRateManagerAtom)
    const rate = rateManager.getRate(fromCurrency, toCurrency)
    
    if (!rate) {
      return null
    }
    
    return rate.mul(amount).toNumber()
  }
)

// 通貨フォーマット設定
export const currencyFormatPreferencesAtom = atomWithStorage<{
  locale: string
  showSymbols: boolean
  showCodes: boolean
}>('kibo-currencyFormat', {
  locale: 'ja-JP',
  showSymbols: true,
  showCodes: false
})

// 最近使用した通貨
export const recentCurrenciesAtom = atomWithStorage<string[]>('kibo-recentCurrencies', [])

// 最近使用した通貨を追加
export const addRecentCurrencyAtom = atom(
  null,
  (get, set, currencyCode: string) => {
    const recentCurrencies = get(recentCurrenciesAtom)
    const filteredRecent = recentCurrencies.filter(code => code !== currencyCode)
    set(recentCurrenciesAtom, [currencyCode, ...filteredRecent.slice(0, 4)])
  }
)

// よく使われる通貨ペア
export const popularCurrencyPairsAtom = atom((get) => {
  const baseCurrency = get(baseCurrencyAtom)
  const popularPairs = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW', 'THB']
  
  return popularPairs
    .filter(code => code !== baseCurrency)
    .map(toCurrency => `${baseCurrency}-${toCurrency}`)
})

// 為替レートの最終更新時刻
export const exchangeRateLastUpdateAtom = atomWithStorage<number | null>('kibo-exchangeRateLastUpdate', null)

// 為替レート更新が必要かチェック
export const needExchangeRateUpdateAtom = atom((get) => {
  const lastUpdate = get(exchangeRateLastUpdateAtom)
  const now = Date.now()
  const sixHours = 6 * 60 * 60 * 1000 // 6時間
  
  return !lastUpdate || (now - lastUpdate) > sixHours
})

// 為替レート更新時刻を設定
export const setExchangeRateUpdateTimeAtom = atom(
  null,
  (get, set) => {
    set(exchangeRateLastUpdateAtom, Date.now())
  }
)