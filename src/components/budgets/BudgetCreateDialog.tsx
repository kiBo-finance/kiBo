'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createBudgetAtom } from '@/lib/atoms/budgets'
import { activeCurrenciesAtom } from '@/lib/atoms/currency'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'
import { useAtomValue, useSetAtom } from 'jotai'
import { Plus, Target } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  color: string
}

interface BudgetCreateDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function BudgetCreateDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: BudgetCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const currencies = useAtomValue(activeCurrenciesAtom)
  const createBudget = useSetAtom(createBudgetAtom)
  const { handleError, showSuccess } = useErrorHandler()

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: 'JPY',
    categoryId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split('T')[0],
  })

  const { getInputStep, getPlaceholder, isJPY } = useCurrencyFormatter(formData.currency)

  useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?type=EXPENSE&active=true')
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
    setLoading(true)

    try {
      const result = await createBudget({
        name: formData.name,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        categoryId: formData.categoryId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      })

      if (result.success) {
        showSuccess('予算を作成しました')
        setOpen(false)
        onSuccess?.()
        // Reset form
        setFormData({
          name: '',
          amount: '',
          currency: 'JPY',
          categoryId: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
            .toISOString()
            .split('T')[0],
        })
      } else {
        handleError(new Error(result.error), '予算の作成に失敗しました')
      }
    } catch (error) {
      handleError(error, '予算の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // カテゴリ選択時に予算名を自動設定
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    setFormData((prev) => ({
      ...prev,
      categoryId,
      name: prev.name || (category ? `${category.name}の予算` : ''),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            予算を作成
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            新しい予算を作成
          </DialogTitle>
          <DialogDescription>カテゴリごとの支出上限を設定します</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ *</Label>
            <Select value={formData.categoryId} onValueChange={handleCategoryChange}>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '作成中...' : '予算を作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
