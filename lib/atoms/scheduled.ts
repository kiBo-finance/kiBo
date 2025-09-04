import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export interface ScheduledTransaction {
  id: string
  amount: number
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  dueDate: string
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
  endDate?: string | null
  isRecurring: boolean
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  reminderDays: number
  isReminderSent: boolean
  notes?: string | null
  accountId: string
  categoryId?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  account?: {
    id: string
    name: string
    currency: string
  }
  category?: {
    id: string
    name: string
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  } | null
}

// 基本的な予定取引リスト
export const scheduledTransactionsAtom = atom<ScheduledTransaction[]>([])

// ローディング状態管理
export const scheduledTransactionsLoadingAtom = atom<boolean>(false)

// 選択された予定取引
export const selectedScheduledTransactionAtom = atom<ScheduledTransaction | null>(null)

// フィルター設定
export const scheduledTransactionsFiltersAtom = atomWithStorage('scheduled-filters', {
  status: 'all' as 'all' | 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED',
  type: 'all' as 'all' | 'INCOME' | 'EXPENSE' | 'TRANSFER',
  accountId: 'all' as 'all' | string,
  dateRange: {
    from: null as Date | null,
    to: null as Date | null
  }
})

// 派生atoms（計算されたatoms）
export const upcomingTransactionsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)
  const now = new Date()
  const next30Days = new Date()
  next30Days.setDate(now.getDate() + 30)

  return transactions
    .filter(tx => 
      tx.status === 'PENDING' && 
      new Date(tx.dueDate) >= now && 
      new Date(tx.dueDate) <= next30Days
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
})

export const overdueTransactionsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)
  const now = new Date()

  return transactions
    .filter(tx => 
      tx.status === 'PENDING' && 
      new Date(tx.dueDate) < now
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
})

export const completedTransactionsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)

  return transactions
    .filter(tx => tx.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime())
})

export const cancelledTransactionsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)

  return transactions
    .filter(tx => tx.status === 'CANCELLED')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
})

// フィルター適用された予定取引
export const filteredScheduledTransactionsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)
  const filters = get(scheduledTransactionsFiltersAtom)

  return transactions.filter(tx => {
    // ステータスフィルター
    if (filters.status !== 'all' && tx.status !== filters.status) {
      return false
    }

    // タイプフィルター
    if (filters.type !== 'all' && tx.type !== filters.type) {
      return false
    }

    // 口座フィルター
    if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) {
      return false
    }

    // 日付範囲フィルター
    if (filters.dateRange.from) {
      const txDate = new Date(tx.dueDate)
      if (txDate < filters.dateRange.from) {
        return false
      }
    }

    if (filters.dateRange.to) {
      const txDate = new Date(tx.dueDate)
      if (txDate > filters.dateRange.to) {
        return false
      }
    }

    return true
  })
})

// 統計情報
export const scheduledTransactionsStatsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)

  const stats = {
    total: transactions.length,
    pending: 0,
    completed: 0,
    overdue: 0,
    cancelled: 0,
    totalPendingAmount: 0,
    totalCompletedAmount: 0,
    recurringCount: 0
  }

  const now = new Date()

  transactions.forEach(tx => {
    // ステータス別カウント
    if (tx.status === 'PENDING') {
      stats.pending++
      stats.totalPendingAmount += tx.amount
      
      // 期限切れチェック
      if (new Date(tx.dueDate) < now) {
        stats.overdue++
      }
    } else if (tx.status === 'COMPLETED') {
      stats.completed++
      stats.totalCompletedAmount += tx.amount
    } else if (tx.status === 'CANCELLED') {
      stats.cancelled++
    }

    // 定期取引カウント
    if (tx.isRecurring) {
      stats.recurringCount++
    }
  })

  return stats
})

// 今日の予定取引
export const todayScheduledTransactionsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  return transactions.filter(tx => {
    const txDate = new Date(tx.dueDate)
    txDate.setHours(0, 0, 0, 0)
    return txDate >= today && txDate < tomorrow && tx.status === 'PENDING'
  })
})

// 今週の予定取引
export const thisWeekScheduledTransactionsAtom = atom((get) => {
  const transactions = get(scheduledTransactionsAtom)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay()) // 日曜日から開始
  weekStart.setHours(0, 0, 0, 0)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  return transactions.filter(tx => {
    const txDate = new Date(tx.dueDate)
    return txDate >= weekStart && txDate < weekEnd && tx.status === 'PENDING'
  })
})

// Actions（書き込み用atoms）
export const refreshScheduledTransactionsAtom = atom(
  null,
  async (get, set) => {
    set(scheduledTransactionsLoadingAtom, true)
    try {
      const response = await fetch('/api/scheduled-transactions')
      if (response.ok) {
        const data = await response.json()
        set(scheduledTransactionsAtom, data)
      }
    } catch (error) {
      console.error('Failed to refresh scheduled transactions:', error)
    } finally {
      set(scheduledTransactionsLoadingAtom, false)
    }
  }
)

export const completeScheduledTransactionAtom = atom(
  null,
  async (get, set, transactionId: string) => {
    try {
      const response = await fetch(`/api/scheduled-transactions/${transactionId}/complete`, {
        method: 'POST'
      })

      if (response.ok) {
        // リストを再読み込み
        set(refreshScheduledTransactionsAtom)
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Failed to complete scheduled transaction:', error)
      return { success: false, error: 'Network error' }
    }
  }
)

export const cancelScheduledTransactionAtom = atom(
  null,
  async (get, set, transactionId: string) => {
    try {
      const response = await fetch(`/api/scheduled-transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (response.ok) {
        // リストを再読み込み
        set(refreshScheduledTransactionsAtom)
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Failed to cancel scheduled transaction:', error)
      return { success: false, error: 'Network error' }
    }
  }
)

export const deleteScheduledTransactionAtom = atom(
  null,
  async (get, set, transactionId: string) => {
    try {
      const response = await fetch(`/api/scheduled-transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // リストを再読み込み
        set(refreshScheduledTransactionsAtom)
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Failed to delete scheduled transaction:', error)
      return { success: false, error: 'Network error' }
    }
  }
)