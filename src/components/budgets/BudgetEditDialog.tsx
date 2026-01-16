'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Budget } from '@/lib/atoms/budgets'
import { updateBudgetAtom } from '@/lib/atoms/budgets'
import { activeCurrenciesAtom } from '@/lib/atoms/currency'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'
import { useAtomValue, useSetAtom } from 'jotai'
import { Pencil } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  color: string
}

interface BudgetEditDialogProps {
  budget: Budget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function BudgetEditDialog({
  budget,
  open,
  onOpenChange,
  onSuccess,
}: BudgetEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const currencies = useAtomValue(activeCurrenciesAtom)
  const updateBudget = useSetAtom(updateBudgetAtom)
  const { handleError, showSuccess } = useErrorHandler()

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: 'JPY',
    categoryId: '',
    startDate: '',
    endDate: '',
    isActive: true,
  })

  const { getInputStep, getPlaceholder } = useCurrencyFormatter(formData.currency)

  useEffect(() => {
    if (open && budget) {
      setFormData({
        name: budget.name,
        amount: String(budget.amount),
        currency: budget.currency,
        categoryId: budget.categoryId,
        startDate: budget.startDate.split('T')[0],
        endDate: budget.endDate.split('T')[0],
        isActive: budget.isActive,
      })
      fetchCategories()
    }
  }, [open, budget])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?type=EXPENSE')
      if (response.ok) {
        const result = await response.json()
        setCategories(result.data || result)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budget) return

    setLoading(true)

    try {
      const result = await updateBudget({
        id: budget.id,
        data: {
          name: formData.name,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          categoryId: formData.categoryId,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          isActive: formData.isActive,
        },
      })

      if (result.success) {
        showSuccess('予算を更新しました')
        onOpenChange(false)
        onSuccess?.()
      } else {
        handleError(new Error(result.error), '予算の更新に失敗しました')
      }
    } catch (error) {
      handleError(error, '予算の更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!budget) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            予算を編集
          </DialogTitle>
          <DialogDescription>予算の設定を変更します</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <div>
              <Label htmlFor="isActive">予算の状態</Label>
              <p className="text-sm text-muted-foreground">
                {formData.isActive ? '有効' : '無効'}
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, categoryId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} textValue={category.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">予算名 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="例：食費の予算"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">金額 *</Label>
              <Input
                id="amount"
                type="number"
                step={getInputStep()}
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder={getPlaceholder()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">通貨</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem
                      key={currency.code}
                      value={currency.code}
                      textValue={`${currency.symbol} ${currency.code}`}
                    >
                      {currency.symbol} {currency.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">開始日 *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">終了日 *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '更新中...' : '変更を保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
