'use client'

import { useState, useEffect } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { CalendarIcon, PlusCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { accountsAtom } from '@/lib/atoms/accounts'
import { currenciesAtom } from '@/lib/atoms/currency'
import { 
  transactionFormAtom, 
  transactionLoadingAtom,
  transactionErrorAtom,
  transactionsAtom,
  type TransactionFormData 
} from '@/lib/atoms/transactions'
import { Badge } from '@/components/ui/badge'

interface TransactionFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  editingId?: string
}

export function TransactionForm({ onSuccess, onCancel, editingId }: TransactionFormProps) {
  const [formData, setFormData] = useAtom(transactionFormAtom)
  const [loading, setLoading] = useAtom(transactionLoadingAtom)
  const [error, setError] = useAtom(transactionErrorAtom)
  const [transactions, setTransactions] = useAtom(transactionsAtom)
  const accounts = useAtomValue(accountsAtom)
  const currencies = useAtomValue(currenciesAtom)
  
  const [tags, setTags] = useState<string[]>(formData.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  // カテゴリのモックデータ（後でAPIから取得）
  const categories = [
    { id: 'food', name: '食費', type: 'EXPENSE' },
    { id: 'transport', name: '交通費', type: 'EXPENSE' },
    { id: 'housing', name: '住居費', type: 'EXPENSE' },
    { id: 'utilities', name: '光熱費', type: 'EXPENSE' },
    { id: 'entertainment', name: '娯楽費', type: 'EXPENSE' },
    { id: 'salary', name: '給与', type: 'INCOME' },
    { id: 'bonus', name: 'ボーナス', type: 'INCOME' },
    { id: 'investment', name: '投資収益', type: 'INCOME' },
  ]

  // 選択された口座の通貨を取得
  const selectedAccount = accounts.find(acc => acc.id === formData.accountId)
  const defaultCurrency = selectedAccount?.currency || 'JPY'

  useEffect(() => {
    if (selectedAccount && formData.currency !== selectedAccount.currency) {
      setFormData({ ...formData, currency: selectedAccount.currency })
    }
  }, [selectedAccount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = editingId 
        ? `/api/transactions/${editingId}`
        : '/api/transactions'
      
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '取引の保存に失敗しました')
      }

      const result = await response.json()
      
      if (editingId) {
        // 既存の取引を更新
        setTransactions(transactions.map(t => 
          t.id === editingId ? result.data : t
        ))
      } else {
        // 新しい取引を追加
        setTransactions([result.data, ...transactions])
      }

      // フォームをリセット
      setFormData({
        amount: 0,
        currency: 'JPY',
        type: 'EXPENSE',
        description: '',
        date: new Date().toISOString(),
        accountId: '',
        attachments: [],
        tags: [],
      })
      setTags([])
      
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '取引の保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const filteredCategories = categories.filter(cat => cat.type === formData.type)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingId ? '取引を編集' : '新しい取引を追加'}</CardTitle>
        <CardDescription>
          収入、支出、または振替を記録します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 取引タイプ */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={formData.type === 'INCOME' ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, type: 'INCOME' })}
              className="cursor-pointer"
            >
              収入
            </Button>
            <Button
              type="button"
              variant={formData.type === 'EXPENSE' ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
              className="cursor-pointer"
            >
              支出
            </Button>
            <Button
              type="button"
              variant={formData.type === 'TRANSFER' ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, type: 'TRANSFER' })}
              className="cursor-pointer"
            >
              振替
            </Button>
          </div>

          {/* 金額と通貨 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="amount">金額</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">通貨</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger id="currency" className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 説明 */}
          <div>
            <Label htmlFor="description">説明</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="取引の説明を入力"
              required
            />
          </div>

          {/* 日付 */}
          <div>
            <Label htmlFor="date">日付</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal cursor-pointer",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? (
                    format(new Date(formData.date), 'PPP', { locale: ja })
                  ) : (
                    <span>日付を選択</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date ? new Date(formData.date) : undefined}
                  onSelect={(date) => {
                    setFormData({ ...formData, date: date?.toISOString() || new Date().toISOString() })
                    setDatePopoverOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 口座 */}
          <div>
            <Label htmlFor="account">口座</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger id="account" className="cursor-pointer">
                <SelectValue placeholder="口座を選択" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currencyRef?.symbol}{new Intl.NumberFormat('ja-JP').format(parseFloat(account.balance))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* カテゴリ */}
          <div>
            <Label htmlFor="category">カテゴリ</Label>
            <Select
              value={formData.categoryId || ''}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger id="category" className="cursor-pointer">
                <SelectValue placeholder="カテゴリを選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* タグ */}
          <div>
            <Label htmlFor="tags">タグ</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="タグを追加"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                className="cursor-pointer"
              >
                追加
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* メモ */}
          <div>
            <Label htmlFor="notes">メモ</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="メモを追加（任意）"
              rows={3}
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="cursor-pointer"
              >
                キャンセル
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={loading || !formData.accountId || !formData.description}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {editingId ? '更新' : '追加'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}