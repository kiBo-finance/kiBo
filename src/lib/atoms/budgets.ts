import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export interface BudgetCategory {
  id: string
  name: string
  color: string
  icon: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
}

export interface Budget {
  id: string
  name: string
  amount: number
  currency: string
  categoryId: string
  userId: string
  startDate: string
  endDate: string
  isActive: boolean
  category?: BudgetCategory
  // 計算されたフィールド（APIから取得）
  spent?: number
  remaining?: number
  percentUsed?: number
}

export interface BudgetWithStats extends Budget {
  spent: number
  remaining: number
  percentUsed: number
  recentTransactions?: Array<{
    id: string
    amount: number
    description: string
    date: string
    account: { id: string; name: string }
  }>
}

// 基本的な予算リスト
export const budgetsAtom = atom<Budget[]>([])

// ローディング状態
export const budgetsLoadingAtom = atom<boolean>(false)

// 選択された予算
export const selectedBudgetAtom = atom<BudgetWithStats | null>(null)

// フィルター設定
export const budgetsFiltersAtom = atomWithStorage('budget-filters', {
  categoryId: 'all' as 'all' | string,
  isActive: true,
  period: 'current' as 'current' | 'past' | 'all',
})

// アクティブな予算のみ
export const activeBudgetsAtom = atom((get) => {
  const budgets = get(budgetsAtom)
  return budgets.filter((b) => b.isActive)
})

// 現在の期間の予算
export const currentPeriodBudgetsAtom = atom((get) => {
  const budgets = get(budgetsAtom)
  const now = new Date()

  return budgets.filter((b) => {
    const start = new Date(b.startDate)
    const end = new Date(b.endDate)
    return b.isActive && start <= now && end >= now
  })
})

// 予算超過している予算
export const overBudgetItemsAtom = atom((get) => {
  const budgets = get(budgetsAtom)
  return budgets.filter((b) => b.spent !== undefined && b.percentUsed !== undefined && b.percentUsed > 100)
})

// 予算達成率が高い予算（80%以上使用）
export const nearLimitBudgetsAtom = atom((get) => {
  const budgets = get(budgetsAtom)
  return budgets.filter(
    (b) =>
      b.percentUsed !== undefined && b.percentUsed >= 80 && b.percentUsed <= 100
  )
})

// フィルター適用された予算
export const filteredBudgetsAtom = atom((get) => {
  const budgets = get(budgetsAtom)
  const filters = get(budgetsFiltersAtom)
  const now = new Date()

  return budgets.filter((b) => {
    // カテゴリフィルター
    if (filters.categoryId !== 'all' && b.categoryId !== filters.categoryId) {
      return false
    }

    // アクティブフィルター
    if (filters.isActive && !b.isActive) {
      return false
    }

    // 期間フィルター
    if (filters.period !== 'all') {
      const start = new Date(b.startDate)
      const end = new Date(b.endDate)

      if (filters.period === 'current') {
        if (!(start <= now && end >= now)) {
          return false
        }
      } else if (filters.period === 'past') {
        if (end >= now) {
          return false
        }
      }
    }

    return true
  })
})

// 統計情報
export const budgetStatsAtom = atom((get) => {
  const budgets = get(budgetsAtom)
  const currentBudgets = get(currentPeriodBudgetsAtom)

  const stats = {
    total: budgets.length,
    active: budgets.filter((b) => b.isActive).length,
    currentPeriod: currentBudgets.length,
    overBudget: 0,
    nearLimit: 0,
    totalBudgeted: 0,
    totalSpent: 0,
    totalRemaining: 0,
  }

  currentBudgets.forEach((b) => {
    stats.totalBudgeted += b.amount
    if (b.spent !== undefined) {
      stats.totalSpent += b.spent
    }
    if (b.remaining !== undefined) {
      stats.totalRemaining += b.remaining
    }
    if (b.percentUsed !== undefined) {
      if (b.percentUsed > 100) {
        stats.overBudget++
      } else if (b.percentUsed >= 80) {
        stats.nearLimit++
      }
    }
  })

  return stats
})

// Actions
export const refreshBudgetsAtom = atom(null, async (get, set) => {
  set(budgetsLoadingAtom, true)
  try {
    const response = await fetch('/api/budgets?includeSpent=true')
    if (response.ok) {
      const result = await response.json()
      const data = Array.isArray(result) ? result : result.data || []
      set(budgetsAtom, data)
    }
  } catch (error) {
    console.error('Failed to refresh budgets:', error)
  } finally {
    set(budgetsLoadingAtom, false)
  }
})

export const fetchBudgetDetailAtom = atom(null, async (get, set, budgetId: string) => {
  try {
    const response = await fetch(`/api/budgets/${budgetId}`)
    if (response.ok) {
      const result = await response.json()
      const data = result.data || result
      set(selectedBudgetAtom, data)
      return { success: true, data }
    } else {
      const error = await response.json()
      return { success: false, error: error.error }
    }
  } catch (error) {
    console.error('Failed to fetch budget detail:', error)
    return { success: false, error: 'Network error' }
  }
})

export const createBudgetAtom = atom(
  null,
  async (
    get,
    set,
    data: {
      name: string
      amount: number
      currency: string
      categoryId: string
      startDate: string
      endDate: string
    }
  ) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        set(refreshBudgetsAtom)
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Failed to create budget:', error)
      return { success: false, error: 'Network error' }
    }
  }
)

export const updateBudgetAtom = atom(
  null,
  async (
    get,
    set,
    { id, data }: { id: string; data: Partial<Budget> }
  ) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        set(refreshBudgetsAtom)
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Failed to update budget:', error)
      return { success: false, error: 'Network error' }
    }
  }
)

export const deleteBudgetAtom = atom(null, async (get, set, budgetId: string) => {
  try {
    const response = await fetch(`/api/budgets/${budgetId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      set(refreshBudgetsAtom)
      return { success: true }
    } else {
      const error = await response.json()
      return { success: false, error: error.error }
    }
  } catch (error) {
    console.error('Failed to delete budget:', error)
    return { success: false, error: 'Network error' }
  }
})
