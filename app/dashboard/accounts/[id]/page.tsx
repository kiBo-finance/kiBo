'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSetAtom, useAtomValue } from 'jotai'
import { ArrowLeft } from 'lucide-react'
import { accountsAtom, removeAccountAtom } from '@/lib/atoms/accounts'
import { currenciesAtom } from '@/lib/atoms/currency'
import { AccountDetails } from '@/components/accounts/AccountDetails'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const setCurrencies = useSetAtom(currenciesAtom)
  const setAccounts = useSetAtom(accountsAtom)
  const removeAccount = useSetAtom(removeAccountAtom)
  const accounts = useAtomValue(accountsAtom)
  
  const account = accounts.find(acc => acc.id === accountId)

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        // 通貨データ取得
        const currenciesRes = await fetch('/api/currencies')
        if (currenciesRes.ok) {
          const currencies = await currenciesRes.json()
          setCurrencies(currencies)
        }

        // 口座データ取得
        const accountsRes = await fetch('/api/accounts')
        if (accountsRes.ok) {
          const accounts = await accountsRes.json()
          setAccounts(accounts)
        }
      } catch (error) {
        console.error('Failed to load account data:', error)
      }
    }

    loadData()
  }, [setCurrencies, setAccounts])

  const handleEdit = (accountId: string) => {
    router.push(`/dashboard/accounts/${accountId}/edit`)
  }

  const handleDelete = (accountId: string) => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        removeAccount(accountId)
        router.push('/dashboard/accounts')
      } else {
        const error = await response.json()
        console.error('Failed to delete account:', error)
        // TODO: エラー表示
      }
    } catch (error) {
      console.error('Failed to delete account:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/accounts')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
      </div>

      {account ? (
        <AccountDetails
          accountId={accountId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showTransactions
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">口座が見つかりません</p>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>口座を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {account?.name} を削除します。
              {account && 'transactions' in account && (account as any).transactions?.length > 0 ? (
                <span className="text-orange-600 dark:text-orange-400">
                  この口座には取引履歴があるため、非アクティブ化されます。
                </span>
              ) : (
                <span>この操作は取り消せません。</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}