'use client'

import { AccountCreateDialog } from './accounts/AccountCreateDialog'
import { AccountDeleteDialog } from './accounts/AccountDeleteDialog'
import { AccountEditDialog } from './accounts/AccountEditDialog'
import { AccountsList } from './accounts/AccountsList'
import { Button } from './ui/button'
import { currenciesAtom } from '../lib/atoms/currency'
import { useAccounts } from '../lib/hooks/useAccounts'
import { useSetAtom } from 'jotai'
import { Plus } from 'lucide-react'
import { useState, useEffect } from 'react'

export function AccountsClient() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const setCurrencies = useSetAtom(currenciesAtom)

  // 通貨データ読み込み
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await fetch('/api/currencies')
        if (response.ok) {
          const currencies = await response.json()
          setCurrencies(currencies)
        }
      } catch (error) {
        console.error('Failed to load currencies:', error)
      }
    }

    loadCurrencies()
  }, [setCurrencies])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const { accounts } = useAccounts()

  const handleCreateAccount = () => {
    setIsCreateDialogOpen(true)
  }

  const handleAccountCreated = () => {
    setIsCreateDialogOpen(false)
  }

  const handleEditAccount = (accountId: string) => {
    setSelectedAccountId(accountId)
    setIsEditDialogOpen(true)
  }

  const handleAccountUpdated = () => {
    setIsEditDialogOpen(false)
    setSelectedAccountId(null)
  }

  const handleDeleteAccount = (accountId: string) => {
    setSelectedAccountId(accountId)
    setIsDeleteDialogOpen(true)
  }

  const handleAccountDeleted = () => {
    setIsDeleteDialogOpen(false)
    setSelectedAccountId(null)
  }

  const handleAccountSelect = (accountId: string) => {
    window.location.href = `/dashboard/accounts/${accountId}`
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">口座管理</h2>
          <p className="text-muted-foreground">銀行口座、現金、カードなどを一元管理</p>
        </div>
        <Button onClick={handleCreateAccount}>
          <Plus className="mr-2 h-4 w-4" />
          新規口座作成
        </Button>
      </div>

      <AccountsList
        onCreateAccount={handleCreateAccount}
        onAccountSelect={handleAccountSelect}
        onEditAccount={handleEditAccount}
        onDeleteAccount={handleDeleteAccount}
      />

      <AccountCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onAccountCreated={handleAccountCreated}
      />

      <AccountEditDialog
        accountId={selectedAccountId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onAccountUpdated={handleAccountUpdated}
      />

      <AccountDeleteDialog
        accountId={selectedAccountId}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onAccountDeleted={handleAccountDeleted}
      />
    </div>
  )
}
