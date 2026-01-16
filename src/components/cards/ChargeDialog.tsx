'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Card } from '@prisma/client'
import { Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'waku/router/client'

interface CardWithAccount extends Card {
  account: {
    name: string
    currency: string
  }
}

interface ChargeDialogProps {
  card: CardWithAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Account {
  id: string
  name: string
  currency: string
  balance: string
}

export function ChargeDialog({ card, open, onOpenChange, onSuccess }: ChargeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [formData, setFormData] = useState({
    amount: '',
    fromAccountId: '',
  })

  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true)
      // まずフォームをリセット
      setFormData({ amount: '', fromAccountId: '' })

      try {
        const response = await fetch('/api/accounts')
        const data = await response.json()
        if (data.success) {
          // すべての口座を表示（プリペイドカードはどの口座からもチャージ可能）
          setAccounts(data.data)

          // デフォルトチャージ元口座が設定されていれば自動選択
          if (card?.defaultChargeAccountId) {
            const defaultAccount = filteredAccounts.find(
              (account: Account) => account.id === card.defaultChargeAccountId
            )
            if (defaultAccount) {
              setFormData({ amount: '', fromAccountId: card.defaultChargeAccountId })
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
      } finally {
        setAccountsLoading(false)
      }
    }

    if (open && card) {
      fetchAccounts()
    }
  }, [open, card?.id, card?.accountId, card?.defaultChargeAccountId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card) return

    setLoading(true)

    try {
      const payload = {
        amount: parseFloat(formData.amount),
        fromAccountId: formData.fromAccountId,
      }

      const response = await fetch(`/api/cards/${card.id}/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onOpenChange(false)
        setFormData({
          amount: '',
          fromAccountId: '',
        })
      } else {
        alert(data.error || 'チャージに失敗しました')
      }
    } catch (error) {
      console.error('Charge failed:', error)
      alert('チャージに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string, currency: string) => {
    if (!amount) return ''
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    })
    return formatter.format(parseFloat(amount))
  }

  const selectedAccount = accounts.find((account) => account.id === formData.fromAccountId)
  const currentBalance = card?.balance ? parseFloat(String(card.balance)) : 0
  const chargeAmount = parseFloat(formData.amount || '0')
  const newBalance = currentBalance + chargeAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>プリペイドカードチャージ</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <div className="font-medium">{card?.name}</div>
            <div className="text-sm text-muted-foreground">
              •••• •••• •••• {card?.lastFourDigits}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              現在残高:{' '}
              {formatCurrency(String(card?.balance ?? '0'), card?.account?.currency || 'JPY')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromAccount">チャージ元口座 *</Label>
            {accountsLoading ? (
              <div className="flex h-10 items-center justify-center rounded-md border">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">口座を読み込み中...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="space-y-2 text-sm text-yellow-800">
                  <p>
                    チャージ可能な口座がありません。
                    <br />
                    プリペイドカードにチャージするには、カードに紐付いた口座とは別の口座が必要です。
                  </p>
                  <Link
                    to={'/dashboard/accounts/new' as never}
                    className="inline-flex items-center gap-1 font-medium text-yellow-900 underline hover:no-underline"
                    onClick={() => onOpenChange(false)}
                  >
                    <Plus size={14} />
                    新しい口座を作成
                  </Link>
                </div>
              </div>
            ) : (
              <Select
                value={formData.fromAccountId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, fromAccountId: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="口座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex w-full items-center justify-between">
                        <span>{account.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {formatCurrency(account.balance, account.currency)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedAccount && (
              <div className="text-sm text-muted-foreground">
                残高: {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">チャージ金額 *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={selectedAccount?.balance}
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
            {formData.amount && (
              <div className="text-sm text-muted-foreground">
                {formatCurrency(formData.amount, card?.account?.currency || 'JPY')}
              </div>
            )}
          </div>

          {formData.amount && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm text-blue-800">
                <strong>チャージ後残高</strong>
                <br />
                {formatCurrency(newBalance.toString(), card?.account?.currency || 'JPY')}
              </div>
            </div>
          )}

          {selectedAccount &&
            formData.amount &&
            parseFloat(formData.amount) > parseFloat(selectedAccount.balance) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-sm text-red-800">チャージ金額が口座残高を超えています</div>
              </div>
            )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                accountsLoading ||
                accounts.length === 0 ||
                !formData.amount ||
                !formData.fromAccountId ||
                (selectedAccount &&
                  parseFloat(formData.amount) > parseFloat(selectedAccount.balance))
              }
            >
              {loading ? 'チャージ中...' : 'チャージ実行'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
