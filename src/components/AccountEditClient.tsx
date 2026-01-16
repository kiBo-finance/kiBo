'use client'

import { EditAccountForm } from '@/components/accounts/EditAccountForm'
import { Button } from '@/components/ui/button'
import { currenciesAtom } from '@/lib/atoms/currency'
import { accountsAtom } from '@/lib/atoms/accounts'
import { useSetAtom, useAtomValue } from 'jotai'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'waku/router/client'
import { useEffect, useState } from 'react'

interface AccountEditClientProps {
  id: string
}

interface Account {
  id: string
  name: string
  type: 'CASH' | 'CHECKING' | 'SAVINGS' | 'FIXED_DEPOSIT'
  currency: string
  balance: string
  description: string | null
  isActive: boolean
  fixedDepositRate: string | null
  fixedDepositMaturity: string | null
}

export function AccountEditClient({ id }: AccountEditClientProps) {
  const router = useRouter()
  const setCurrencies = useSetAtom(currenciesAtom)
  const setAccounts = useSetAtom(accountsAtom)
  const accounts = useAtomValue(accountsAtom)
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // 通貨データ取得
        const currenciesRes = await fetch('/api/currencies')
        if (currenciesRes.ok) {
          const currencies = await currenciesRes.json()
          setCurrencies(currencies)
        }

        // 口座データ取得
        const accountRes = await fetch(`/api/accounts/${id}`)
        if (accountRes.ok) {
          const accountData = await accountRes.json()
          setAccount(accountData)
        }

        // 全口座データ取得（Jotai state更新用）
        const accountsRes = await fetch('/api/accounts')
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          if (accountsData.success) {
            setAccounts(accountsData.data)
          }
        }
      } catch (error) {
        console.error('Failed to load account data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, setCurrencies, setAccounts])

  const handleSuccess = () => {
    router.push(`/dashboard/accounts/${id}` as never)
  }

  const handleCancel = () => {
    router.push(`/dashboard/accounts/${id}` as never)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/accounts' as never)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">口座が見つかりません</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/accounts/${id}` as never)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <div>
          <h2 className="text-2xl font-bold">口座を編集</h2>
          <p className="text-muted-foreground">{account.name}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <EditAccountForm
          account={account}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
