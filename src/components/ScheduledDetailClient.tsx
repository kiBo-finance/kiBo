'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Repeat,
  Bell,
} from 'lucide-react'
import { Link, useRouter } from 'waku/router/client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

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
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  reminderDays: number
  isReminderSent: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
  account: {
    id: string
    name: string
    currency: string
  }
  category?: {
    id: string
    name: string
  } | null
}

interface ScheduledDetailClientProps {
  id: string
}

export function ScheduledDetailClient({ id }: ScheduledDetailClientProps) {
  const router = useRouter()
  const [transaction, setTransaction] = useState<ScheduledTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    fetchTransaction()
  }, [id])

  const fetchTransaction = async () => {
    if (!id) return

    try {
      const response = await fetch(`/api/scheduled-transactions/${id}`)
      if (response.ok) {
        const data = await response.json()
        setTransaction(data)
      } else if (response.status === 404) {
        toast.error('予定取引が見つかりません')
        router.push('/dashboard/scheduled' as any)
      }
    } catch (error) {
      console.error('Failed to fetch scheduled transaction:', error)
      toast.error('予定取引の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!transaction) return

    setActionLoading('complete')
    try {
      const response = await fetch(`/api/scheduled-transactions/${transaction.id}/complete`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('予定取引を完了しました')
        fetchTransaction() // 再読み込み
      } else {
        const error = await response.json()
        toast.error(error.error || '完了処理に失敗しました')
      }
    } catch (error) {
      console.error('Error completing transaction:', error)
      toast.error('完了処理に失敗しました')
    } finally {
      setActionLoading('')
    }
  }

  const handleCancel = async () => {
    if (!transaction) return

    setActionLoading('cancel')
    try {
      const response = await fetch(`/api/scheduled-transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (response.ok) {
        toast.success('予定取引をキャンセルしました')
        fetchTransaction() // 再読み込み
      } else {
        const error = await response.json()
        toast.error(error.error || 'キャンセル処理に失敗しました')
      }
    } catch (error) {
      console.error('Error cancelling transaction:', error)
      toast.error('キャンセル処理に失敗しました')
    } finally {
      setActionLoading('')
    }
  }

  const handleDelete = async () => {
    if (!transaction) return

    setActionLoading('delete')
    try {
      const response = await fetch(`/api/scheduled-transactions/${transaction.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('予定取引を削除しました')
        router.push('/dashboard/scheduled' as any)
      } else {
        const error = await response.json()
        toast.error(error.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error('削除に失敗しました')
    } finally {
      setActionLoading('')
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(new Date(date))
  }

  const formatDateTime = (date: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const getStatusBadge = (status: ScheduledTransaction['status']) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, label: '予定', color: 'text-blue-600' },
      COMPLETED: { variant: 'default' as const, label: '完了', color: 'text-green-600' },
      OVERDUE: { variant: 'destructive' as const, label: '期限切れ', color: 'text-red-600' },
      CANCELLED: { variant: 'outline' as const, label: 'キャンセル', color: 'text-gray-500' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeInfo = (type: ScheduledTransaction['type']) => {
    switch (type) {
      case 'INCOME':
        return { icon: '↗️', label: '収入', color: 'text-green-600' }
      case 'EXPENSE':
        return { icon: '↘️', label: '支出', color: 'text-red-600' }
      case 'TRANSFER':
        return { icon: '↔️', label: '振替', color: 'text-blue-600' }
      default:
        return { icon: '💰', label: '取引', color: 'text-gray-600' }
    }
  }

  const getFrequencyLabel = (frequency?: string) => {
    const labels = {
      DAILY: '毎日',
      WEEKLY: '毎週',
      MONTHLY: '毎月',
      YEARLY: '毎年',
    } as const
    return frequency ? labels[frequency as keyof typeof labels] : ''
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!transaction) {
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

  const typeInfo = getTypeInfo(transaction.type)
  const canComplete = transaction.status === 'PENDING' || transaction.status === 'OVERDUE'
  const canCancel = transaction.status === 'PENDING' || transaction.status === 'OVERDUE'
  const canEdit = transaction.status === 'PENDING' || transaction.status === 'OVERDUE'

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to={"/dashboard/scheduled" as any}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{typeInfo.icon}</span>
              <h1 className="text-3xl font-bold tracking-tight">{transaction.description}</h1>
              {getStatusBadge(transaction.status)}
            </div>
            <p className="mt-1 text-muted-foreground">
              {typeInfo.label} • {formatDate(transaction.dueDate)}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          {canEdit && (
            <Link to={`/dashboard/scheduled/${transaction.id}/edit` as any}>
              <Button variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />
                編集
              </Button>
            </Link>
          )}

          {canComplete && (
            <Button
              onClick={handleComplete}
              disabled={actionLoading === 'complete'}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {actionLoading === 'complete' ? '処理中...' : '完了'}
            </Button>
          )}

          {canCancel && (
            <Button variant="outline" onClick={handleCancel} disabled={actionLoading === 'cancel'}>
              <XCircle className="mr-2 h-4 w-4" />
              {actionLoading === 'cancel' ? '処理中...' : 'キャンセル'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* メイン情報 */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>取引詳細</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">金額</span>
                <span className={`text-2xl font-bold ${typeInfo.color}`}>
                  {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">口座</span>
                <span className="font-medium">{transaction.account.name}</span>
              </div>

              {transaction.category && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">カテゴリ</span>
                    <span className="font-medium">{transaction.category.name}</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">実行予定日</span>
                <span className="font-medium">{formatDate(transaction.dueDate)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ステータス</span>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            </CardContent>
          </Card>

          {transaction.notes && (
            <Card>
              <CardHeader>
                <CardTitle>メモ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 繰り返し情報 */}
          {transaction.isRecurring && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  繰り返し設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">間隔</span>
                  <span className="text-sm font-medium">
                    {getFrequencyLabel(transaction.frequency || undefined)}
                  </span>
                </div>

                {transaction.endDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">終了日</span>
                    <span className="text-sm font-medium">{formatDate(transaction.endDate)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 通知設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                通知設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">事前通知</span>
                <span className="text-sm font-medium">
                  {transaction.reminderDays === 0 ? '当日' : `${transaction.reminderDays}日前`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">通知状況</span>
                <Badge variant={transaction.isReminderSent ? 'default' : 'secondary'}>
                  {transaction.isReminderSent ? '送信済み' : '未送信'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* システム情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                システム情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">作成日時</span>
                <span className="text-sm">{formatDateTime(transaction.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">更新日時</span>
                <span className="text-sm">{formatDateTime(transaction.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 削除 */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">危険な操作</CardTitle>
              <CardDescription>この操作は取り消すことができません</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={actionLoading === 'delete'}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {actionLoading === 'delete' ? '削除中...' : '予定取引を削除'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      この予定取引を完全に削除します。この操作は取り消すことができません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      削除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
