'use client'

import { useState } from 'react'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { Trash2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, createCurrencyAmount } from '@/lib/utils/currency'
import { accountsAtom } from '@/lib/atoms/accounts'
import { useAtomValue } from 'jotai'

interface AccountDeleteDialogProps {
  accountId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountDeleted?: () => void
}

export function AccountDeleteDialog({ 
  accountId,
  open,
  onOpenChange,
  onAccountDeleted 
}: AccountDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { deleteAccount } = useAccounts()
  const accounts = useAtomValue(accountsAtom)
  
  const account = accounts.find(acc => acc.id === accountId)
  
  if (!account) {
    return null
  }

  const balance = createCurrencyAmount(account.balance, account.currency)
  const hasBalance = !balance.isZero()

  const handleDelete = async () => {
    if (!accountId) return
    
    setIsDeleting(true)
    
    try {
      const result = await deleteAccount(accountId)
      
      if (!result.success) {
        throw new Error(result.error || '口座削除に失敗しました')
      }
      
      onAccountDeleted?.()
      onOpenChange(false)
      
    } catch (error) {
      console.error('Account delete error:', error)
      alert(error instanceof Error ? error.message : '口座削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            口座の削除
          </DialogTitle>
          <DialogDescription>
            この操作は元に戻すことができません。本当に削除しますか？
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account info */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="font-medium">{account.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {account.type === 'CHECKING' && '普通預金'}
                {account.type === 'SAVINGS' && '貯蓄預金'}
                {account.type === 'CASH' && '現金'}
                {account.type === 'FIXED_DEPOSIT' && '定期預金'}
              </Badge>
              <Badge variant="outline">
                {account.currencyRef?.symbol} {account.currency}
              </Badge>
            </div>
            <div className="text-lg font-semibold mt-2">
              残高: {balance.format()}
            </div>
          </div>

          {/* Warning messages */}
          {hasBalance && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/50">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-orange-800 dark:text-orange-200">
                  残高が残っています
                </div>
                <div className="text-orange-700 dark:text-orange-300 mt-1">
                  削除する前に残高を0にするか、他の口座に移動することをお勧めします。
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/50">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-red-800 dark:text-red-200">
                削除について
              </div>
              <div className="text-red-700 dark:text-red-300 mt-1">
                取引履歴がある場合、口座は非アクティブ状態になります。取引履歴がない場合は完全に削除されます。
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            キャンセル
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            {isDeleting ? '削除中...' : '削除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}