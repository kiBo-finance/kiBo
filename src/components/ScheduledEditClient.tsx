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
import { ArrowLeft, Calendar, Repeat, Save } from 'lucide-react'
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

interface ScheduledTransaction {
  id: string
  amount: number
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  dueDate: string
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
  endDate?: string | null
  isRecurring: boolean
  reminderDays: number
  notes?: string | null
  accountId: string
  categoryId?: string | null
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
}

interface ScheduledEditClientProps {
  id: string
}

export function ScheduledEditClient({ id }: ScheduledEditClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [originalTransaction, setOriginalTransaction] = useState<ScheduledTransaction | null>(null)

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
    Promise.all([fetchTransaction(), fetchAccounts(), fetchCategories()]).finally(
      () => setInitialLoading(false)
    )
  }, [id])

  const fetchTransaction = async () => {
    if (!id) return

    try {
      const response = await fetch(`/api/scheduled-transactions/${id}`)
      if (response.ok) {
        const transaction = await response.json()
        setOriginalTransaction(transaction)

        // フォームデータを設定
        setFormData({
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          type: transaction.type,
          description: transaction.description,
          dueDate: transaction.dueDate.split('T')[0], // YYYY-MM-DD形式に変換
          accountId: transaction.accountId,
          categoryId: transaction.categoryId || '',
          isRecurring: transaction.isRecurring,
          frequency: transaction.frequency || undefined,
          endDate: transaction.endDate ? transaction.endDate.split('T')[0] : '',
          reminderDays: transaction.reminderDays,
          notes: transaction.notes || '',
        })
      } else if (response.status === 404) {
        toast.error('予定取引が見つかりません')
        router.push('/dashboard/scheduled' as any)
      }
    } catch (error) {
      console.error('Failed to fetch scheduled transaction:', error)
      toast.error('予定取引の読み込みに失敗しました')
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
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

    if (!originalTransaction) {
      toast.error('元の取引データが見つかりません')
      return
    }

    // 完了済みまたはキャンセル済みの場合は編集不可
    if (originalTransaction.status === 'COMPLETED' || originalTransaction.status === 'CANCELLED') {
      toast.error('完了済みまたはキャンセル済みの取引は編集できません')
      return
    }

    setLoading(true)

    try {
      // バリデーション
      if (!formData.amount || !formData.description || !formData.dueDate || !formData.accountId) {
        toast.error('必須項目を入力してください')
        return
      }

      const payload = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        type: formData.type,
        description: formData.description,
        dueDate: new Date(formData.dueDate).toISOString(),
        accountId: formData.accountId,
        categoryId: formData.categoryId || null,
        isRecurring: formData.isRecurring,
        frequency: formData.isRecurring ? formData.frequency : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        reminderDays: formData.reminderDays,
        notes: formData.notes || null,
      }

      const response = await fetch(`/api/scheduled-transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('予定取引を更新しました')
        router.push(`/dashboard/scheduled/${id}` as any)
      } else {
        const error = await response.json()
        toast.error(error.error || '予定取引の更新に失敗しました')
      }
    } catch (error) {
      console.error('Error updating scheduled transaction:', error)
      toast.error('予定取引の更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter((cat) => cat.type === formData.type)

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!originalTransaction) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-lg font-medium text-gray-900">予定取引が見つかりません</h2>
        <p className="mt-2 text-gray-500">指定された予定取引は存在しないか削除されました</p>
        <Link to={"/dashboard/scheduled" as any}>
          <Button className="mt-4">予定取引一覧に戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center space-x-4">
        <Link to={`/dashboard/scheduled/${id}` as any}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">予定取引を編集</h1>
          <p className="text-muted-foreground">
            {originalTransaction.description} の詳細を変更します
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              基本情報
            </CardTitle>
            <CardDescription>取引の基本的な情報を編集してください</CardDescription>
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
                    <SelectItem key={account.id} value={account.id}>
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
          <Link to={`/dashboard/scheduled/${id}` as any}>
            <Button variant="outline">キャンセル</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? '更新中...' : '変更を保存'}
          </Button>
        </div>
      </form>
    </div>
  )
}
