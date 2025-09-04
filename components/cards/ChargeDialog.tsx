'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ChargeDialogProps {
  card: any
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [formData, setFormData] = useState({
    amount: '',
    fromAccountId: ''
  })

  useEffect(() => {
    if (open) {
      fetchAccounts()
    }
  }, [open])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      if (data.success) {
        // プリペイドカードの関連口座以外を表示
        setAccounts(data.data.filter((account: Account) => account.id !== card?.accountId))
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card) return

    setLoading(true)

    try {
      const payload = {
        amount: parseFloat(formData.amount),
        fromAccountId: formData.fromAccountId
      }

      const response = await fetch(`/api/cards/${card.id}/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onOpenChange(false)
        setFormData({
          amount: '',
          fromAccountId: ''
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
      currency: currency
    })
    return formatter.format(parseFloat(amount))
  }

  const selectedAccount = accounts.find(account => account.id === formData.fromAccountId)
  const currentBalance = parseFloat(card?.balance || '0')
  const chargeAmount = parseFloat(formData.amount || '0')
  const newBalance = currentBalance + chargeAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>プリペイドカードチャージ</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium">{card?.name}</div>
            <div className="text-sm text-muted-foreground">
              •••• •••• •••• {card?.lastFourDigits}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              現在残高: {formatCurrency(card?.balance || '0', card?.account?.currency || 'JPY')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromAccount">チャージ元口座 *</Label>
            <Select value={formData.fromAccountId} onValueChange={(value) => setFormData(prev => ({ ...prev, fromAccountId: value }))} required>
              <SelectTrigger>
                <SelectValue placeholder="口座を選択" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{account.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {formatCurrency(account.balance, account.currency)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
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
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>チャージ後残高</strong><br />
                {formatCurrency(newBalance.toString(), card?.account?.currency || 'JPY')}
              </div>
            </div>
          )}

          {selectedAccount && formData.amount && parseFloat(formData.amount) > parseFloat(selectedAccount.balance) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">
                チャージ金額が口座残高を超えています
              </div>
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
                !formData.amount || 
                !formData.fromAccountId ||
                (selectedAccount && parseFloat(formData.amount) > parseFloat(selectedAccount.balance))
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