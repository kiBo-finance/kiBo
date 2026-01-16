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
import { Switch } from '@/components/ui/switch'
import { useAccounts } from '@/lib/hooks/useAccounts'
import type { Card as PrismaCard, CardType } from '@prisma/client'
import { useState, useEffect } from 'react'

interface CardWithAccount extends PrismaCard {
  account: {
    name: string
    currency: string
  }
  linkedAccount?: {
    name: string
    currency: string
  } | null
}

interface CardEditDialogProps {
  card: CardWithAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const CARD_TYPE_LABELS: Record<CardType, string> = {
  CREDIT: 'クレジットカード',
  DEBIT: 'デビットカード',
  PREPAID: 'プリペイドカード',
  POSTPAY: 'ポストペイカード',
}

const CARD_BRANDS = ['VISA', 'Mastercard', 'JCB', 'AMEX', 'Diners', 'Discover', 'その他']

export function CardEditDialog({ card, open, onOpenChange, onSuccess }: CardEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const { accounts } = useAccounts()
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    isActive: true,

    // クレジットカード用
    creditLimit: '',
    billingDate: '',
    paymentDate: '',

    // プリペイドカード用
    balance: '',
    defaultChargeAccountId: '',

    // デビットカード用
    linkedAccountId: '',
    autoTransferEnabled: false,
    minBalance: '',

    // ポストペイカード用
    monthlyLimit: '',
    settlementDay: '',

    expiryDate: '',
  })

  // カードデータをフォームに反映
  useEffect(() => {
    if (card && open) {
      setFormData({
        name: card.name || '',
        brand: card.brand || '',
        isActive: card.isActive ?? true,
        creditLimit: card.creditLimit ? String(card.creditLimit) : '',
        billingDate: card.billingDate ? String(card.billingDate) : '',
        paymentDate: card.paymentDate ? String(card.paymentDate) : '',
        balance: card.balance ? String(card.balance) : '',
        defaultChargeAccountId: card.defaultChargeAccountId || '',
        linkedAccountId: card.linkedAccountId || '',
        autoTransferEnabled: card.autoTransferEnabled ?? false,
        minBalance: card.minBalance ? String(card.minBalance) : '',
        monthlyLimit: card.monthlyLimit ? String(card.monthlyLimit) : '',
        settlementDay: card.settlementDay ? String(card.settlementDay) : '',
        expiryDate: card.expiryDate ? new Date(card.expiryDate).toISOString().split('T')[0] : '',
      })
    }
  }, [card, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card) return

    setLoading(true)

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        isActive: formData.isActive,
      }

      if (formData.brand) payload.brand = formData.brand
      if (formData.expiryDate) payload.expiryDate = formData.expiryDate

      // タイプ別のフィールド追加
      switch (card.type) {
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
          if (formData.balance) payload.balance = parseFloat(formData.balance)
          if (formData.defaultChargeAccountId) {
            payload.defaultChargeAccountId = formData.defaultChargeAccountId
          }
          break

        case 'POSTPAY':
          if (formData.monthlyLimit) payload.monthlyLimit = parseFloat(formData.monthlyLimit)
          if (formData.settlementDay) payload.settlementDay = parseInt(formData.settlementDay)
          break
      }

      const response = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
        onOpenChange(false)
      } else {
        alert(result.error || 'カードの更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to update card:', error)
      alert('カードの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const renderTypeSpecificFields = () => {
    if (!card) return null

    switch (card.type) {
      case 'CREDIT':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">クレジットカード設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">利用限度額</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, creditLimit: e.target.value }))
                  }
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
                      .filter((account) => account.id !== card.accountId)
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
                <Label htmlFor="balance">現在残高</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  残高は通常チャージで管理されますが、手動で調整することもできます
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultChargeAccount">デフォルトチャージ元口座</Label>
                <Select
                  value={formData.defaultChargeAccountId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, defaultChargeAccountId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="口座を選択（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">なし</SelectItem>
                    {accounts
                      .filter((account) => account.id !== card.accountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  チャージ時に自動選択される口座です
                </p>
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
                <Label htmlFor="monthlyLimit">月間利用限度額</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  step="0.01"
                  value={formData.monthlyLimit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, monthlyLimit: e.target.value }))
                  }
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

  if (!card) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>カード設定を編集</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  {CARD_TYPE_LABELS[card.type]} • {card.account.name}
                </div>
                <div className="font-mono">•••• •••• •••• {card.lastFourDigits}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                <Label htmlFor="isActive">{formData.isActive ? '有効' : '無効'}</Label>
              </div>
            </div>
          </div>

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

          <Separator />
          {renderTypeSpecificFields()}

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
              {loading ? '保存中...' : '変更を保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
