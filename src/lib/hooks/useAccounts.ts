'use client'

import { accountsAtom } from '../atoms/accounts'
import type { AccountType } from '@prisma/client'
import { useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

export function useAccounts() {
  const [accounts, setAccounts] = useAtom(accountsAtom)

  const refreshAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts', {
        credentials: 'include',
      })
      if (response.ok) {
        const json = await response.json()
        const data = json.success ? json.data : json
        if (Array.isArray(data)) {
          setAccounts(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }, [setAccounts])

  const createAccount = useCallback(
    async (accountData: {
      name: string
      type: AccountType
      currency: string
      balance?: number
      description?: string
      fixedDepositRate?: number
      fixedDepositMaturity?: Date
    }) => {
      try {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(accountData),
        })
        if (response.ok) {
          const data = await response.json()
          await refreshAccounts()
          return { success: true, data }
        }
        const error = await response.json()
        return { success: false, error: error.error || 'Failed to create account' }
      } catch (error) {
        console.error('Failed to create account:', error)
        return { success: false, error: 'Failed to create account' }
      }
    },
    [refreshAccounts]
  )

  const updateAccount = useCallback(
    async (
      accountId: string,
      accountData: Partial<{
        name: string
        description: string
        fixedDepositRate: number
        fixedDepositMaturity: Date
        isActive: boolean
      }>
    ) => {
      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(accountData),
        })
        if (response.ok) {
          const data = await response.json()
          await refreshAccounts()
          return { success: true, data }
        }
        const error = await response.json()
        return { success: false, error: error.error || 'Failed to update account' }
      } catch (error) {
        console.error('Failed to update account:', error)
        return { success: false, error: 'Failed to update account' }
      }
    },
    [refreshAccounts]
  )

  const deleteAccount = useCallback(
    async (accountId: string) => {
      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (response.ok) {
          await refreshAccounts()
          return { success: true }
        }
        const error = await response.json()
        return { success: false, error: error.error || 'Failed to delete account' }
      } catch (error) {
        console.error('Failed to delete account:', error)
        return { success: false, error: 'Failed to delete account' }
      }
    },
    [refreshAccounts]
  )

  // Load accounts on mount
  useEffect(() => {
    refreshAccounts()
  }, [refreshAccounts])

  return {
    accounts,
    refreshAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  }
}
