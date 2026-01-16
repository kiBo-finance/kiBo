import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export interface ReportPeriod {
  start: string
  end: string
}

export interface SummaryReport {
  period: ReportPeriod
  income: { total: number; count: number }
  expense: { total: number; count: number }
  transfer: { total: number; count: number }
  netIncome: number
  totalBalance: number
  accounts: Array<{
    id: string
    name: string
    type: string
    balance: number
    currency: string
  }>
  budgets: Array<{
    id: string
    name: string
    amount: number
    spent: number
    percentUsed: number
    category: { name: string; color: string } | null
  }>
}

export interface CategoryReport {
  period: ReportPeriod
  expenses: Array<{
    category: { id: string; name: string; color: string; icon: string } | null
    total: number
    count: number
  }>
  incomes: Array<{
    category: { id: string; name: string; color: string; icon: string } | null
    total: number
    count: number
  }>
  uncategorizedExpense: { total: number; count: number }
}

export interface MonthlyReport {
  months: Array<{
    year: number
    month: number
    income: number
    expense: number
    netIncome: number
  }>
  averages: {
    income: number
    expense: number
    netIncome: number
  }
}

export interface AccountReport {
  period: ReportPeriod
  accounts: Array<{
    account: {
      id: string
      name: string
      type: string
      balance: number
      currency: string
    }
    income: { total: number; count: number }
    expense: { total: number; count: number }
    netFlow: number
  }>
}

// ローディング状態
export const reportsLoadingAtom = atom<boolean>(false)

// 期間設定
export const reportPeriodAtom = atomWithStorage('report-period', {
  type: 'thisMonth' as 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom',
  startDate: null as string | null,
  endDate: null as string | null,
})

// 各レポートデータ
export const summaryReportAtom = atom<SummaryReport | null>(null)
export const categoryReportAtom = atom<CategoryReport | null>(null)
export const monthlyReportAtom = atom<MonthlyReport | null>(null)
export const accountReportAtom = atom<AccountReport | null>(null)

// 期間を計算するヘルパー
export const getDateRangeAtom = atom((get) => {
  const period = get(reportPeriodAtom)
  const now = new Date()

  switch (period.type) {
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }
    }
    case 'custom':
      return {
        startDate: period.startDate || now.toISOString().split('T')[0],
        endDate: period.endDate || now.toISOString().split('T')[0],
      }
  }
})

// Actions
export const fetchSummaryReportAtom = atom(null, async (get, set) => {
  const dateRange = get(getDateRangeAtom)
  set(reportsLoadingAtom, true)

  try {
    const params = new URLSearchParams({
      type: 'summary',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    })

    const response = await fetch(`/api/reports?${params}`)
    if (response.ok) {
      const result = await response.json()
      set(summaryReportAtom, result.data)
      return { success: true, data: result.data }
    } else {
      const error = await response.json()
      return { success: false, error: error.error }
    }
  } catch (error) {
    console.error('Failed to fetch summary report:', error)
    return { success: false, error: 'Network error' }
  } finally {
    set(reportsLoadingAtom, false)
  }
})

export const fetchCategoryReportAtom = atom(null, async (get, set) => {
  const dateRange = get(getDateRangeAtom)
  set(reportsLoadingAtom, true)

  try {
    const params = new URLSearchParams({
      type: 'category',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    })

    const response = await fetch(`/api/reports?${params}`)
    if (response.ok) {
      const result = await response.json()
      set(categoryReportAtom, result.data)
      return { success: true, data: result.data }
    } else {
      const error = await response.json()
      return { success: false, error: error.error }
    }
  } catch (error) {
    console.error('Failed to fetch category report:', error)
    return { success: false, error: 'Network error' }
  } finally {
    set(reportsLoadingAtom, false)
  }
})

export const fetchMonthlyReportAtom = atom(null, async (get, set) => {
  set(reportsLoadingAtom, true)

  try {
    const params = new URLSearchParams({ type: 'monthly' })

    const response = await fetch(`/api/reports?${params}`)
    if (response.ok) {
      const result = await response.json()
      set(monthlyReportAtom, result.data)
      return { success: true, data: result.data }
    } else {
      const error = await response.json()
      return { success: false, error: error.error }
    }
  } catch (error) {
    console.error('Failed to fetch monthly report:', error)
    return { success: false, error: 'Network error' }
  } finally {
    set(reportsLoadingAtom, false)
  }
})

export const fetchAccountReportAtom = atom(null, async (get, set) => {
  const dateRange = get(getDateRangeAtom)
  set(reportsLoadingAtom, true)

  try {
    const params = new URLSearchParams({
      type: 'account',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    })

    const response = await fetch(`/api/reports?${params}`)
    if (response.ok) {
      const result = await response.json()
      set(accountReportAtom, result.data)
      return { success: true, data: result.data }
    } else {
      const error = await response.json()
      return { success: false, error: error.error }
    }
  } catch (error) {
    console.error('Failed to fetch account report:', error)
    return { success: false, error: 'Network error' }
  } finally {
    set(reportsLoadingAtom, false)
  }
})

// すべてのレポートを取得
export const fetchAllReportsAtom = atom(null, async (get, set) => {
  await Promise.all([
    set(fetchSummaryReportAtom),
    set(fetchCategoryReportAtom),
    set(fetchMonthlyReportAtom),
    set(fetchAccountReportAtom),
  ])
})
