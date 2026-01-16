'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { accountsAtom } from '@/lib/atoms/accounts'
import { currenciesAtom } from '@/lib/atoms/currency'
import {
  transactionFormAtom,
  transactionLoadingAtom,
  transactionErrorAtom,
  transactionsAtom,
  type TransactionFormData,
} from '@/lib/atoms/transactions'
import { cn } from '@/lib/utils'
import { saveOfflineTransaction } from '@/lib/offline-store'
import { isOnline } from '@/lib/sync-service'
import { useServiceWorker } from '@/components/providers/ServiceWorkerProvider'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAtom, useAtomValue } from 'jotai'
import { CalendarIcon, PlusCircle, Loader2, CloudOff } from 'lucide-react'
import { useState, useEffect } from 'react'

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
  const { isOnline: online, syncNow } = useServiceWorker()

  const [tags, setTags] = useState<string[]>(formData.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [savedOffline, setSavedOffline] = useState(false)

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
  const selectedAccount = accounts.find((acc) => acc.id === formData.accountId)
  const defaultCurrency = selectedAccount?.currency || 'JPY'

  // 編集時に既存データを読み込む
  useEffect(() => {
    if (editingId) {
      const loadTransaction = async () => {
        try {
          const response = await fetch(`/api/transactions/${editingId}`, {
            credentials: 'include',
          })
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              const tx = result.data
              setFormData({
                amount: parseFloat(tx.amount) || 0,
                currency: tx.currency || 'JPY',
                type: tx.type || 'EXPENSE',
                description: tx.description || '',
                date: tx.date || new Date().toISOString(),
                accountId: tx.accountId || '',
                categoryId: tx.categoryId,
                attachments: tx.attachments || [],
                tags: tx.tags || [],
              })
              setTags(tx.tags || [])
            }
          }
        } catch (error) {
          console.error('Failed to load transaction:', error)
        }
      }
      loadTransaction()
    }
  }, [editingId, setFormData])

  useEffect(() => {
    if (selectedAccount && formData.currency !== selectedAccount.currency) {
      setFormData({ ...formData, currency: selectedAccount.currency })
    }
  }, [selectedAccount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSavedOffline(false)

    const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions'
    const method = editingId ? 'PUT' : 'POST'
    const transactionData = { ...formData, tags }

    try {
      // Try online submission first
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '取引の保存に失敗しました')
      }

      const result = await response.json()

      if (editingId) {
        // 既存の取引を更新
        setTransactions(transactions.map((t) => (t.id === editingId ? result.data : t)))
      } else {
        // 新しい取引を追加
        setTransactions([result.data, ...transactions])
      }

      // フォームをリセット
      resetForm()
      onSuccess?.()
    } catch (err) {
      // Check if it's a network error (offline)
      if (!online || (err instanceof TypeError && err.message.includes('fetch'))) {
        // Save offline
        try {
          await saveOfflineTransaction(
            'transaction',
            editingId ? 'update' : 'create',
            url,
            method,
            transactionData
          )

          // Add to local state with offline indicator
          const offlineTransaction = {
            ...transactionData,
            id: `offline_${Date.now()}`,
            _offline: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          if (!editingId) {
            setTransactions([offlineTransaction as any, ...transactions])
          }

          setSavedOffline(true)
          resetForm()

          // Show success message briefly, then call onSuccess
          setTimeout(() => {
            onSuccess?.()
          }, 1500)
        } catch (offlineError) {
          setError('オフラインでの保存に失敗しました')
        }
      } else {
        setError(err instanceof Error ? err.message : '取引の保存に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
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
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const filteredCategories = categories.filter((cat) => cat.type === formData.type)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingId ? '取引を編集' : '新しい取引を追加'}</CardTitle>
        <CardDescription>収入、支出、または振替を記録します</CardDescription>
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
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
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
                  {currencies?.map((currency) => (
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
                    'w-full justify-start text-left font-normal cursor-pointer',
                    !formData.date && 'text-muted-foreground'
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
                    setFormData({
                      ...formData,
                      date: date?.toISOString() || new Date().toISOString(),
                    })
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
                {accounts?.map((account) => {
                  const balanceNum =
                    typeof account.balance === 'object' && 'toNumber' in account.balance
                      ? account.balance.toNumber()
                      : typeof account.balance === 'string'
                        ? parseFloat(account.balance)
                        : account.balance
                  const displayText = `${account.name} (${account.currencyRef?.symbol || ''}${new Intl.NumberFormat('ja-JP').format(balanceNum)})`
                  return (
                    <SelectItem key={account.id} value={account.id} textValue={displayText}>
                      {displayText}
                    </SelectItem>
                  )
                })}
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
                {filteredCategories?.map((category) => (
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
                {tags?.map((tag) => (
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
          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

          {/* オフライン保存成功表示 */}
          {savedOffline && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-700 dark:text-amber-300">
              <CloudOff className="h-4 w-4" />
              <span>オフラインで保存しました。オンライン復帰時に自動同期されます。</span>
            </div>
          )}

          {/* オフラインモード警告 */}
          {!online && !savedOffline && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300">
              <CloudOff className="h-4 w-4" />
              <span>オフラインモード - 保存した取引はオンライン復帰時に同期されます</span>
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
