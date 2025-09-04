import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import {
  scheduledTransactionsAtom,
  scheduledTransactionsLoadingAtom,
  selectedScheduledTransactionAtom,
  scheduledTransactionsFiltersAtom,
  upcomingTransactionsAtom,
  overdueTransactionsAtom,
  completedTransactionsAtom,
  filteredScheduledTransactionsAtom,
  scheduledTransactionsStatsAtom,
  todayScheduledTransactionsAtom,
  thisWeekScheduledTransactionsAtom,
  refreshScheduledTransactionsAtom,
  completeScheduledTransactionAtom,
  cancelScheduledTransactionAtom,
  deleteScheduledTransactionAtom,
  ScheduledTransaction
} from '@/lib/atoms/scheduled'

export function useScheduledTransactions() {
  const [transactions, setTransactions] = useAtom(scheduledTransactionsAtom)
  const [loading, setLoading] = useAtom(scheduledTransactionsLoadingAtom)
  const [filters, setFilters] = useAtom(scheduledTransactionsFiltersAtom)
  
  const refreshTransactions = useSetAtom(refreshScheduledTransactionsAtom)
  
  const loadTransactions = useCallback(async () => {
    await refreshTransactions()
  }, [refreshTransactions])

  const createTransaction = useCallback(async (data: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/scheduled-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const newTransaction = await response.json()
        setTransactions(prev => [...prev, newTransaction])
        return { success: true, data: newTransaction }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Failed to create scheduled transaction:', error)
      return { success: false, error: 'Network error' }
    } finally {
      setLoading(false)
    }
  }, [setTransactions, setLoading])

  const updateTransaction = useCallback(async (id: string, data: Partial<ScheduledTransaction>) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/scheduled-transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const updatedTransaction = await response.json()
        setTransactions(prev => 
          prev.map(tx => tx.id === id ? updatedTransaction : tx)
        )
        return { success: true, data: updatedTransaction }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Failed to update scheduled transaction:', error)
      return { success: false, error: 'Network error' }
    } finally {
      setLoading(false)
    }
  }, [setTransactions, setLoading])

  return {
    transactions,
    loading,
    filters,
    setFilters,
    loadTransactions,
    createTransaction,
    updateTransaction,
    refreshTransactions
  }
}

export function useScheduledTransactionActions() {
  const completeTransaction = useSetAtom(completeScheduledTransactionAtom)
  const cancelTransaction = useSetAtom(cancelScheduledTransactionAtom)
  const deleteTransaction = useSetAtom(deleteScheduledTransactionAtom)

  return {
    completeTransaction,
    cancelTransaction,
    deleteTransaction
  }
}

export function useScheduledTransactionDetail(id?: string) {
  const [selectedTransaction, setSelectedTransaction] = useAtom(selectedScheduledTransactionAtom)
  const loading = useAtomValue(scheduledTransactionsLoadingAtom)

  const loadTransaction = useCallback(async (transactionId: string) => {
    if (!transactionId) return

    try {
      const response = await fetch(`/api/scheduled-transactions/${transactionId}`)
      if (response.ok) {
        const transaction = await response.json()
        setSelectedTransaction(transaction)
        return { success: true, data: transaction }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Failed to load scheduled transaction:', error)
      return { success: false, error: 'Network error' }
    }
  }, [setSelectedTransaction])

  return {
    transaction: selectedTransaction,
    loading,
    loadTransaction,
    clearTransaction: () => setSelectedTransaction(null)
  }
}

export function useScheduledTransactionFilters() {
  const upcomingTransactions = useAtomValue(upcomingTransactionsAtom)
  const overdueTransactions = useAtomValue(overdueTransactionsAtom)
  const completedTransactions = useAtomValue(completedTransactionsAtom)
  const filteredTransactions = useAtomValue(filteredScheduledTransactionsAtom)
  const todayTransactions = useAtomValue(todayScheduledTransactionsAtom)
  const thisWeekTransactions = useAtomValue(thisWeekScheduledTransactionsAtom)

  return {
    upcomingTransactions,
    overdueTransactions,
    completedTransactions,
    filteredTransactions,
    todayTransactions,
    thisWeekTransactions
  }
}

export function useScheduledTransactionStats() {
  const stats = useAtomValue(scheduledTransactionsStatsAtom)
  
  return stats
}