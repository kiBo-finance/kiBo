'use client'

import { useCallback, useEffect } from 'react'
import { useSetAtom, useAtom } from 'jotai'
import { accountsAtom } from '@/lib/atoms/accounts'
import { 
  getAccounts, 
  createAccount as createAccountAction,
  updateAccount as updateAccountAction,
  deleteAccount as deleteAccountAction
} from '@/lib/actions/accounts'
import type { AccountType } from '@prisma/client'

export function useAccounts() {
  const [accounts, setAccounts] = useAtom(accountsAtom)

  const refreshAccounts = useCallback(async () => {
    try {
      const data = await getAccounts()
      if (data) {
        setAccounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }, [setAccounts])

  const createAccount = useCallback(async (accountData: {
    name: string
    type: AccountType
    currency: string
    balance?: number
    description?: string
    fixedDepositRate?: number
    fixedDepositMaturity?: Date
  }) => {
    try {
      const result = await createAccountAction(accountData)
      if (result.success) {
        await refreshAccounts()
        return result
      }
      return result
    } catch (error) {
      console.error('Failed to create account:', error)
      return { success: false, error: 'Failed to create account' }
    }
  }, [refreshAccounts])

  const updateAccount = useCallback(async (
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
      const result = await updateAccountAction(accountId, accountData)
      if (result.success) {
        await refreshAccounts()
        return result
      }
      return result
    } catch (error) {
      console.error('Failed to update account:', error)
      return { success: false, error: 'Failed to update account' }
    }
  }, [refreshAccounts])

  const deleteAccount = useCallback(async (accountId: string) => {
    try {
      const result = await deleteAccountAction(accountId)
      if (result.success) {
        await refreshAccounts()
        return result
      }
      return result
    } catch (error) {
      console.error('Failed to delete account:', error)
      return { success: false, error: 'Failed to delete account' }
    }
  }, [refreshAccounts])

  // Load accounts on mount
  useEffect(() => {
    refreshAccounts()
  }, [refreshAccounts])

  return {
    accounts,
    refreshAccounts,
    createAccount,
    updateAccount,
    deleteAccount
  }
}