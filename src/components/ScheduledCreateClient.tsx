'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Calendar, Repeat } from 'lucide-react'
import { Link, useRouter } from 'waku/router/client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface Account {
  id: string
  name: string
  currency: string
}

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
}

export function ScheduledCreateClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'JPY',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE' | 'TRANSFER',
    description: '',
    dueDate: '',
    accountId: '',
    categoryId: '',
    isRecurring: false,
    frequency: undefined as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | undefined,
    endDate: '',
    reminderDays: 1,
    notes: '',
  })

  useEffect(() => {
    fetchAccounts()
    fetchCategories()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const json = await response.json()
        const data = json.success ? json.data : json
        setAccounts(data)
        // デフォルトで最初の口座を選択
        if (data.length > 0 && !formData.accountId) {
          setFormData((prev) => ({
            ...prev,
            accountId: data[0].id,
            currency: data[0].currency,
          }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean | Date) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // 口座変更時に通貨も更新
    if (field === 'accountId') {
      const selectedAccount = accounts.find((acc) => acc.id === value)
      if (selectedAccount) {
        setFormData((prev) => ({ ...prev, currency: selectedAccount.currency }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // バリデーション
      if (!formData.amount || !formData.description || !formData.dueDate || !formData.accountId) {
        toast.error('必須項目を入力してください')
        return
      }

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        frequency: formData.isRecurring ? formData.frequency : null,
      }

      const response = await fetch('/api/scheduled-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('予定取引を作成しました')
        router.push('/dashboard/scheduled' as any)
      } else {
        const error = await response.json()
        toast.error(error.error || '予定取引の作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating scheduled transaction:', error)
      toast.error('予定取引の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter((cat) => cat.type === formData.type)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center space-x-4">
        <Link to={"/dashboard/scheduled" as any}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">予定取引を作成</h1>
          <p className="text-muted-foreground">将来の収入・支出を予定として登録します</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              基本情報
            </CardTitle>
            <CardDescription>取引の基本的な情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 取引タイプ */}
            <div className="space-y-2">
              <Label htmlFor="type">取引タイプ</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">収入</SelectItem>
                  <SelectItem value="EXPENSE">支出</SelectItem>
                  <SelectItem value="TRANSFER">振替</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 金額 */}
            <div className="space-y-2">
              <Label htmlFor="amount">金額 *</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 説明 */}
            <div className="space-y-2">
              <Label htmlFor="description">説明 *</Label>
              <Input
                id="description"
                placeholder="例：給料、家賃、食費など"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
              />
            </div>

            {/* 口座 */}
            <div className="space-y-2">
              <Label htmlFor="account">口座 *</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => handleInputChange('accountId', value)}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="口座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id}
                      textValue={`${account.name} (${account.currency})`}
                    >
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* カテゴリ */}
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => handleInputChange('categoryId', value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="カテゴリを選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 実行予定日 */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">実行予定日 *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 繰り返し設定 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              繰り返し設定
            </CardTitle>
            <CardDescription>定期的に実行する取引の場合に設定してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 繰り返し有効化 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recurring">定期実行</Label>
                <div className="text-sm text-muted-foreground">
                  指定した間隔で自動的に取引を作成します
                </div>
              </div>
              <Switch
                id="recurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => handleInputChange('isRecurring', checked)}
              />
            </div>

            {formData.isRecurring && (
              <>
                {/* 繰り返し間隔 */}
                <div className="space-y-2">
                  <Label htmlFor="frequency">繰り返し間隔</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => handleInputChange('frequency', value)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="間隔を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">毎日</SelectItem>
                      <SelectItem value="WEEKLY">毎週</SelectItem>
                      <SelectItem value="MONTHLY">毎月</SelectItem>
                      <SelectItem value="YEARLY">毎年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 終了日 */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">終了日（任意）</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                  <div className="text-sm text-muted-foreground">
                    空白の場合は無期限で繰り返されます
                  </div>
                </div>
              </>
            )}

            {/* リマインダー */}
            <div className="space-y-2">
              <Label htmlFor="reminderDays">事前通知</Label>
              <Select
                value={formData.reminderDays.toString()}
                onValueChange={(value) => handleInputChange('reminderDays', parseInt(value))}
              >
                <SelectTrigger id="reminderDays">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">当日</SelectItem>
                  <SelectItem value="1">1日前</SelectItem>
                  <SelectItem value="3">3日前</SelectItem>
                  <SelectItem value="7">1週間前</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <Label htmlFor="notes">メモ（任意）</Label>
              <Textarea
                id="notes"
                placeholder="追加の詳細情報があれば入力してください"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* アクション */}
        <div className="mt-8 flex justify-end space-x-4">
          <Link to={"/dashboard/scheduled" as any}>
            <Button variant="outline">キャンセル</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? '作成中...' : '予定取引を作成'}
          </Button>
        </div>
      </form>
    </div>
  )
}
