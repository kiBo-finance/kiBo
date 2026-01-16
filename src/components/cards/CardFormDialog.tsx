'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Separator } from '@/components/ui/separator'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useCards } from '@/lib/hooks/useCards'
import type { CardType } from '@prisma/client'
import { useState, useEffect } from 'react'

interface CreateCardPayload {
  name: string
  type: CardType
  lastFourDigits: string
  accountId: string
  brand?: string
  expiryDate?: Date
  creditLimit?: number
  billingDate?: number
  paymentDate?: number
  linkedAccountId?: string
  autoTransferEnabled?: boolean
  minBalance?: number
  balance?: number
  monthlyLimit?: number
  settlementDay?: number
}

interface CardFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const CARD_TYPES = [
  { value: 'CREDIT', label: 'クレジットカード' },
  { value: 'DEBIT', label: 'デビットカード' },
  { value: 'PREPAID', label: 'プリペイドカード' },
  { value: 'POSTPAY', label: 'ポストペイカード' },
]

const CARD_BRANDS = ['VISA', 'Mastercard', 'JCB', 'AMEX', 'Diners', 'Discover', 'その他']

export function CardFormDialog({ open, onOpenChange, onSuccess }: CardFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const { accounts } = useAccounts()
  const { createCard } = useCards()
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    brand: '',
    lastFourDigits: '',
    accountId: '',

    // クレジットカード用
    creditLimit: '',
    billingDate: '',
    paymentDate: '',

    // プリペイドカード用
    balance: '0',

    // デビットカード用
    linkedAccountId: '',
    autoTransferEnabled: false,
    minBalance: '',

    // ポストペイカード用
    monthlyLimit: '',
    settlementDay: '',

    expiryDate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: CreateCardPayload = {
        name: formData.name,
        type: formData.type as CardType,
        lastFourDigits: formData.lastFourDigits,
        accountId: formData.accountId,
      }

      if (formData.brand) payload.brand = formData.brand
      if (formData.expiryDate) payload.expiryDate = new Date(formData.expiryDate)

      // タイプ別のフィールド追加
      switch (formData.type) {
        case 'CREDIT':
          if (formData.creditLimit) payload.creditLimit = parseFloat(formData.creditLimit)
          if (formData.billingDate) payload.billingDate = parseInt(formData.billingDate)
          if (formData.paymentDate) payload.paymentDate = parseInt(formData.paymentDate)
          break

        case 'DEBIT':
          if (formData.linkedAccountId) payload.linkedAccountId = formData.linkedAccountId
          payload.autoTransferEnabled = formData.autoTransferEnabled
          if (formData.minBalance) payload.minBalance = parseFloat(formData.minBalance)
          break

        case 'PREPAID':
          payload.balance = parseFloat(formData.balance)
          break

        case 'POSTPAY':
          if (formData.monthlyLimit) payload.monthlyLimit = parseFloat(formData.monthlyLimit)
          if (formData.settlementDay) payload.settlementDay = parseInt(formData.settlementDay)
          break
      }

      const result = await createCard(payload)

      if (result.success) {
        onSuccess()
        // フォームリセット
        setFormData({
          name: '',
          type: '',
          brand: '',
          lastFourDigits: '',
          accountId: '',
          creditLimit: '',
          billingDate: '',
          paymentDate: '',
          balance: '0',
          linkedAccountId: '',
          autoTransferEnabled: false,
          minBalance: '',
          monthlyLimit: '',
          settlementDay: '',
          expiryDate: '',
        })
      } else {
        alert(result.error || 'カードの作成に失敗しました')
      }
    } catch (error) {
      console.error('Failed to create card:', error)
      alert('カードの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'CREDIT':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">クレジットカード設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">利用限度額 *</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, creditLimit: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingDate">締め日</Label>
                  <Select
                    value={formData.billingDate}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, billingDate: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}日
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">支払日</Label>
                  <Select
                    value={formData.paymentDate}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, paymentDate: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}日
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'DEBIT':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">デビットカード設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedAccount">紐付け口座</Label>
                <Select
                  value={formData.linkedAccountId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, linkedAccountId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="口座を選択（自動振替用）" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((account) => account.id !== formData.accountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoTransfer"
                  checked={formData.autoTransferEnabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, autoTransferEnabled: !!checked }))
                  }
                />
                <Label htmlFor="autoTransfer">自動振替を有効にする</Label>
              </div>
              {formData.autoTransferEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="minBalance">最低維持残高</Label>
                  <Input
                    id="minBalance"
                    type="number"
                    step="0.01"
                    value={formData.minBalance}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, minBalance: e.target.value }))
                    }
                    placeholder="残高不足時に自動振替される最低残高"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'PREPAID':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">プリペイドカード設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="balance">初期残高</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )

      case 'POSTPAY':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ポストペイカード設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyLimit">月間利用限度額 *</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  step="0.01"
                  value={formData.monthlyLimit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, monthlyLimit: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlementDay">精算日</Label>
                <Select
                  value={formData.settlementDay}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, settlementDay: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}日
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新しいカードを追加</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">カード名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例：メインクレジットカード"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">カード種別 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">ブランド</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, brand: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ブランドを選択" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastFourDigits">下4桁 *</Label>
              <Input
                id="lastFourDigits"
                value={formData.lastFourDigits}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastFourDigits: e.target.value }))
                }
                placeholder="1234"
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account">関連口座 *</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, accountId: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="口座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">有効期限</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>
          </div>

          {formData.type && (
            <>
              <Separator />
              {renderTypeSpecificFields()}
            </>
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
            <Button type="submit" disabled={loading}>
              {loading ? '作成中...' : 'カードを追加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
