'use client'

import { CreateAccountForm } from './accounts/CreateAccountForm'
import { Button } from './ui/button'
import { currenciesAtom } from '../lib/atoms/currency'
import { useSetAtom } from 'jotai'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'waku/router/client'
import { useEffect } from 'react'

export function AccountsNewClient() {
  const router = useRouter()
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

  const handleSuccess = (accountId: string) => {
    router.push(`/dashboard/accounts/${accountId}` as any)
  }

  const handleCancel = () => {
    router.push('/dashboard/accounts' as any)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/accounts' as any)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <div>
          <h2 className="text-2xl font-bold">新規口座作成</h2>
          <p className="text-muted-foreground">銀行口座、現金、定期預金などを登録できます</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <CreateAccountForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  )
}
