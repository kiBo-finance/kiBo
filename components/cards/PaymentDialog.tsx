'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface PaymentDialogProps {
  card: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Category {
  id: string
  name: string
  type: string
}

export function PaymentDialog({ card, open, onOpenChange, onSuccess }: PaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    currency: card?.account?.currency || 'JPY'
  })

  useEffect(() => {
    if (open) {
      fetchCategories()
      setFormData(prev => ({
        ...prev,
        currency: card?.account?.currency || 'JPY'
      }))
    }
  }, [open, card])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?type=EXPENSE')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card) return

    setLoading(true)

    try {
      const payload = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description,
        categoryId: formData.categoryId || undefined
      }

      const response = await fetch(`/api/cards/${card.id}/payment`, {
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
          description: '',
          categoryId: '',
          currency: card?.account?.currency || 'JPY'
        })
      } else {
        alert(data.error || '支払い処理に失敗しました')
      }
    } catch (error) {
      console.error('Payment failed:', error)
      alert('支払い処理に失敗しました')
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

  const getAvailableAmount = () => {
    if (!card) return null

    switch (card.type) {
      case 'CREDIT':
        if (card.creditLimit && card.monthlyUsage) {
          const available = parseFloat(card.creditLimit) - parseFloat(card.monthlyUsage.toString())
          return Math.max(0, available)
        }
        return parseFloat(card.creditLimit || '0')
      
      case 'DEBIT':
      case 'PREPAID':
        return parseFloat(card.balance || '0')
      
      case 'POSTPAY':
        if (card.monthlyLimit && card.monthlyUsage) {
          const available = parseFloat(card.monthlyLimit) - parseFloat(card.monthlyUsage.toString())
          return Math.max(0, available)
        }
        return parseFloat(card.monthlyLimit || '0')
      
      default:
        return 0
    }
  }

  const availableAmount = getAvailableAmount()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>カード支払い</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium">{card?.name}</div>
            <div className="text-sm text-muted-foreground">
              •••• •••• •••• {card?.lastFourDigits}
            </div>
            {availableAmount !== null && (
              <div className="text-sm text-muted-foreground mt-1">
                利用可能額: {formatCurrency(availableAmount.toString(), formData.currency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">金額 *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={availableAmount?.toString()}
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
            {formData.amount && (
              <div className="text-sm text-muted-foreground">
                {formatCurrency(formData.amount, formData.currency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明 *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="例：コンビニで買い物"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ</Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">通貨</Label>
            <Input
              id="currency"
              value={formData.currency}
              disabled
              className="bg-muted"
            />
          </div>

          {card?.type === 'DEBIT' && card?.autoTransferEnabled && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>自動振替が有効です</strong><br />
                残高不足の場合、紐付け口座から自動的に振替されます
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
            <Button type="submit" disabled={loading || !formData.amount || !formData.description}>
              {loading ? '処理中...' : '支払い実行'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}