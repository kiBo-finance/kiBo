import Decimal from 'decimal.js'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Transaction types
export interface Transaction {
  id: string
  amount: string // Decimal as string
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  date: string
  accountId: string
  cardId?: string
  categoryId?: string
  userId: string
  exchangeRate?: string
  baseCurrencyAmount?: string
  attachments: string[]
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations (populated from API)
  account?: {
    id: string
    name: string
    type: string
    balance: string
    currency: string
    currencyRef: {
      symbol: string
    }
  }
  card?: {
    id: string
    name: string
    type: string
  }
  category?: {
    id: string
    name: string
    type: string
  }
  currencyRef?: {
    code: string
    symbol: string
    name: string
  }
}

export interface ScheduledTransaction {
  id: string
  amount: string
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  accountId: string
  categoryId?: string
  userId: string
  dueDate: string
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  endDate?: string
  isRecurring: boolean
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  completedAt?: string
  reminderDays: number
  isReminderSent: boolean
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations (populated from API)
  account?: {
    id: string
    name: string
    type: string
    balance: string
    currency: string
    currencyRef: {
      symbol: string
    }
  }
  category?: {
    id: string
    name: string
    type: string
  }
  currencyRef?: {
    code: string
    symbol: string
    name: string
  }
}

export interface TransactionFilters {
  page: number
  limit: number
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  accountId?: string
  categoryId?: string
  currency?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface TransactionStats {
  summary: {
    totalIncome: string
    totalExpense: string
    netIncome: string
    transactionCount: number
    period: {
      start: string
      end: string
      days: number
    }
  }
  breakdown: {
    byCategory: Array<{
      categoryId?: string
      category?: {
        id: string
        name: string
        type: string
      }
      type: string
      amount: string
      count: number
    }>
    byAccount: Array<{
      accountId: string
      account?: {
        id: string
        name: string
        type: string
        currencyRef: {
          symbol: string
        }
      }
      amount: string
      count: number
    }>
    topExpenseCategories: Array<{
      categoryId: string
      category: {
        id: string
        name: string
        type: string
      }
      amount: string
    }>
  }
  trends: {
    daily: Array<{
      date: string
      type: string
      amount: string
      count: number
    }>
  }
}

// Transaction form data
export interface TransactionFormData {
  amount: number
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  date: string
  accountId: string
  cardId?: string
  categoryId?: string
  exchangeRate?: number
  baseCurrencyAmount?: number
  attachments: string[]
  tags: string[]
  notes?: string
}

// Base atoms
export const transactionsAtom = atom<Transaction[]>([])
export const scheduledTransactionsAtom = atom<ScheduledTransaction[]>([])
export const transactionFiltersAtom = atom<TransactionFilters>({
  page: 1,
  limit: 20,
})
export const transactionStatsAtom = atom<TransactionStats | null>(null)
export const transactionLoadingAtom = atom<boolean>(false)
export const transactionErrorAtom = atom<string | null>(null)

// Current transaction being edited
export const currentTransactionAtom = atom<Transaction | null>(null)
export const currentScheduledTransactionAtom = atom<ScheduledTransaction | null>(null)

// Search and filter preferences (persisted)
export const transactionSearchAtom = atomWithStorage<string>('kibo-transaction-search', '')
export const transactionDateRangeAtom = atomWithStorage<{
  startDate?: string
  endDate?: string
}>('kibo-transaction-date-range', {})

// Transaction form data
export const transactionFormAtom = atom<TransactionFormData>({
  amount: 0,
  currency: 'JPY',
  type: 'EXPENSE',
  description: '',
  date: new Date().toISOString(),
  accountId: '',
  attachments: [],
  tags: [],
})

// Derived atoms for calculations
export const totalIncomeAtom = atom<Decimal>((get) => {
  const transactions = get(transactionsAtom)
  return transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0))
})

export const totalExpenseAtom = atom<Decimal>((get) => {
  const transactions = get(transactionsAtom)
  return transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0))
})

export const netIncomeAtom = atom<Decimal>((get) => {
  const totalIncome = get(totalIncomeAtom)
  const totalExpense = get(totalExpenseAtom)
  return totalIncome.minus(totalExpense)
})

// Filtered transactions
export const filteredTransactionsAtom = atom<Transaction[]>((get) => {
  const transactions = get(transactionsAtom)
  const filters = get(transactionFiltersAtom)
  const search = get(transactionSearchAtom)
  const dateRange = get(transactionDateRangeAtom)

  let filtered = transactions

  // Type filter
  if (filters.type) {
    filtered = filtered.filter((t) => t.type === filters.type)
  }

  // Account filter
  if (filters.accountId) {
    filtered = filtered.filter((t) => t.accountId === filters.accountId)
  }

  // Category filter
  if (filters.categoryId) {
    filtered = filtered.filter((t) => t.categoryId === filters.categoryId)
  }

  // Currency filter
  if (filters.currency) {
    filtered = filtered.filter((t) => t.currency === filters.currency)
  }

  // Date range filter
  if (dateRange.startDate) {
    filtered = filtered.filter((t) => new Date(t.date) >= new Date(dateRange.startDate!))
  }
  if (dateRange.endDate) {
    filtered = filtered.filter((t) => new Date(t.date) <= new Date(dateRange.endDate!))
  }

  // Search filter
  if (search.trim()) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(
      (t) =>
        t.description.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower) ||
        t.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
        t.account?.name.toLowerCase().includes(searchLower) ||
        t.category?.name.toLowerCase().includes(searchLower)
    )
  }

  return filtered
})

// Recent transactions (last 5)
export const recentTransactionsAtom = atom<Transaction[]>((get) => {
  const transactions = get(transactionsAtom)
  return transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
})

// Upcoming scheduled transactions (next 7 days)
export const upcomingScheduledTransactionsAtom = atom<ScheduledTransaction[]>((get) => {
  const scheduled = get(scheduledTransactionsAtom)
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return scheduled
    .filter(
      (t) => t.status === 'PENDING' && new Date(t.dueDate) >= now && new Date(t.dueDate) <= nextWeek
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
})

// Overdue scheduled transactions
export const overdueScheduledTransactionsAtom = atom<ScheduledTransaction[]>((get) => {
  const scheduled = get(scheduledTransactionsAtom)
  const now = new Date()

  return scheduled
    .filter((t) => t.status === 'PENDING' && new Date(t.dueDate) < now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
})

// Transaction pagination info
export const transactionPaginationAtom = atom<{
  page: number
  limit: number
  total: number
  pages: number
}>({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
})
