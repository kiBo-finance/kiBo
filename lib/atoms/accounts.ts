import { atom } from 'jotai'
import type { AppAccount, Card, AccountType, CardType } from '@prisma/client'
import { baseCurrencyAtom, exchangeRateManagerAtom } from './currency'
import { createCurrencyAmount, sumCurrencyAmounts } from '@/lib/utils/currency'

// 口座データ
export const accountsAtom = atom<(AppAccount & { currencyRef: { symbol: string } })[]>([])

// カードデータ  
export const cardsAtom = atom<(Card & { account: { name: string; currency: string } })[]>([])

// 選択中の口座
export const selectedAccountAtom = atom<string | null>(null)

// 選択中のカード
export const selectedCardAtom = atom<string | null>(null)

// アクティブな口座のみ
export const activeAccountsAtom = atom((get) => {
  const accounts = get(accountsAtom)
  return accounts.filter(account => account.isActive)
})

// アクティブなカードのみ
export const activeCardsAtom = atom((get) => {
  const cards = get(cardsAtom)
  return cards.filter(card => card.isActive)
})

// 通貨別口座グループ
export const accountsByCurrencyAtom = atom((get) => {
  const accounts = get(activeAccountsAtom)
  return accounts.reduce((acc, account) => {
    if (!acc[account.currency]) {
      acc[account.currency] = []
    }
    acc[account.currency].push(account)
    return acc
  }, {} as Record<string, typeof accounts>)
})

// 口座タイプ別グループ
export const accountsByTypeAtom = atom((get) => {
  const accounts = get(activeAccountsAtom)
  return accounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = []
    }
    acc[account.type].push(account)
    return acc
  }, {} as Record<AccountType, typeof accounts>)
})

// 総資産計算（基準通貨）
export const totalAssetsAtom = atom((get) => {
  const accounts = get(activeAccountsAtom)
  const baseCurrency = get(baseCurrencyAtom)
  const exchangeManager = get(exchangeRateManagerAtom)
  
  const amounts = accounts.map(account => 
    createCurrencyAmount(account.balance, account.currency)
  )
  
  return sumCurrencyAmounts(amounts, exchangeManager, baseCurrency)
})

// タイプ別資産
export const assetsByTypeAtom = atom((get) => {
  const accountsByType = get(accountsByTypeAtom)
  const baseCurrency = get(baseCurrencyAtom)
  const exchangeManager = get(exchangeRateManagerAtom)
  
  const result: Record<AccountType, ReturnType<typeof createCurrencyAmount>> = {} as any
  
  for (const [type, accounts] of Object.entries(accountsByType)) {
    const amounts = accounts.map(account => 
      createCurrencyAmount(account.balance, account.currency)
    )
    result[type as AccountType] = sumCurrencyAmounts(amounts, exchangeManager, baseCurrency)
  }
  
  return result
})

// 通貨別資産
export const assetsByCurrencyAtom = atom((get) => {
  const accountsByCurrency = get(accountsByCurrencyAtom)
  
  const result: Record<string, ReturnType<typeof createCurrencyAmount>> = {}
  
  for (const [currency, accounts] of Object.entries(accountsByCurrency)) {
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0)
    result[currency] = createCurrencyAmount(totalBalance, currency)
  }
  
  return result
})

// クレジットカード利用可能額
export const availableCreditAtom = atom((get) => {
  const cards = get(activeCardsAtom)
  const baseCurrency = get(baseCurrencyAtom)
  const exchangeManager = get(exchangeRateManagerAtom)
  
  const creditCards = cards.filter(card => card.type === 'CREDIT' && card.creditLimit)
  const amounts = creditCards.map(card => 
    createCurrencyAmount(card.creditLimit!, card.account.currency)
  )
  
  return sumCurrencyAmounts(amounts, exchangeManager, baseCurrency)
})

// 定期預金情報
export const fixedDepositsAtom = atom((get) => {
  const accounts = get(activeAccountsAtom)
  return accounts.filter(account => 
    account.type === 'FIXED_DEPOSIT' && account.fixedDepositMaturity
  )
})

// まもなく満期の定期預金
export const upcomingMaturityDepositsAtom = atom((get) => {
  const fixedDeposits = get(fixedDepositsAtom)
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  return fixedDeposits.filter(account => 
    account.fixedDepositMaturity! <= thirtyDaysFromNow
  )
})

// 口座残高が低い警告
export const lowBalanceAccountsAtom = atom((get) => {
  const accounts = get(activeAccountsAtom)
  const threshold = 10000 // 閾値は設定可能にする予定
  
  return accounts.filter(account => 
    account.type !== 'FIXED_DEPOSIT' && Number(account.balance) < threshold
  )
})

// 口座追加アクション
export const addAccountAtom = atom(
  null,
  (get, set, newAccount: AppAccount & { currencyRef: { symbol: string } }) => {
    const currentAccounts = get(accountsAtom)
    set(accountsAtom, [...currentAccounts, newAccount])
  }
)

// 口座更新アクション
export const updateAccountAtom = atom(
  null,
  (get, set, updatedAccount: AppAccount & { currencyRef: { symbol: string } }) => {
    const currentAccounts = get(accountsAtom)
    set(accountsAtom, 
      currentAccounts.map(account => 
        account.id === updatedAccount.id ? updatedAccount : account
      )
    )
  }
)

// 口座削除アクション
export const removeAccountAtom = atom(
  null,
  (get, set, accountId: string) => {
    const currentAccounts = get(accountsAtom)
    set(accountsAtom, currentAccounts.filter(account => account.id !== accountId))
  }
)

// 口座残高更新アクション
export const updateAccountBalanceAtom = atom(
  null,
  (get, set, accountId: string, newBalance: number) => {
    const currentAccounts = get(accountsAtom)
    set(accountsAtom, 
      currentAccounts.map(account => 
        account.id === accountId 
          ? { ...account, balance: newBalance, updatedAt: new Date() }
          : account
      )
    )
  }
)

// カード追加アクション
export const addCardAtom = atom(
  null,
  (get, set, newCard: Card & { account: { name: string; currency: string } }) => {
    const currentCards = get(cardsAtom)
    set(cardsAtom, [...currentCards, newCard])
  }
)

// カード更新アクション
export const updateCardAtom = atom(
  null,
  (get, set, updatedCard: Card & { account: { name: string; currency: string } }) => {
    const currentCards = get(cardsAtom)
    set(cardsAtom, 
      currentCards.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      )
    )
  }
)

// カード削除アクション
export const removeCardAtom = atom(
  null,
  (get, set, cardId: string) => {
    const currentCards = get(cardsAtom)
    set(cardsAtom, currentCards.filter(card => card.id !== cardId))
  }
)

// 口座統計情報
export const accountStatsAtom = atom((get) => {
  const accounts = get(activeAccountsAtom)
  const totalAssets = get(totalAssetsAtom)
  
  return {
    totalAccounts: accounts.length,
    totalAssets: totalAssets.toNumber(),
    totalAssetsFormatted: totalAssets.format(),
    accountsByType: {
      CASH: accounts.filter(a => a.type === 'CASH').length,
      CHECKING: accounts.filter(a => a.type === 'CHECKING').length,
      SAVINGS: accounts.filter(a => a.type === 'SAVINGS').length,
      FIXED_DEPOSIT: accounts.filter(a => a.type === 'FIXED_DEPOSIT').length,
    },
    currencies: [...new Set(accounts.map(a => a.currency))].length,
  }
})