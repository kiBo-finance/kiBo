'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AccountCreateDialog } from '@/components/accounts/AccountCreateDialog'
import { AccountEditDialog } from '@/components/accounts/AccountEditDialog'
import { AccountDeleteDialog } from '@/components/accounts/AccountDeleteDialog'
import { Button } from '@/components/ui/button'

export default function AccountsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
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
          <p className="text-muted-foreground">
            銀行口座、現金、カードなどを一元管理
          </p>
        </div>
        <Button onClick={handleCreateAccount}>
          <Plus className="h-4 w-4 mr-2" />
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