'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { Link } from 'waku/router/client'
import { useEffect, useState } from 'react'

// 型定義（実際はlib/types.tsから）
interface ScheduledTransaction {
  id: string
  amount: number
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  dueDate: string
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
  isRecurring: boolean
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  accountId: string
  categoryId?: string
  account?: {
    name: string
  }
  category?: {
    name: string
  }
}

export function ScheduledClient() {
  const [scheduledTransactions, setScheduledTransactions] = useState<ScheduledTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheduledTransactions()
  }, [])

  const fetchScheduledTransactions = async () => {
    try {
      const response = await fetch('/api/scheduled-transactions')
      if (response.ok) {
        const result = await response.json()
        // API returns { success, data, pagination }, extract the data array
        const data = Array.isArray(result) ? result : result.data || []
        setScheduledTransactions(data)
      }
    } catch (error) {
      console.error('Failed to fetch scheduled transactions:', error)
    } finally {
      setLoading(false)
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
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getStatusBadge = (status: ScheduledTransaction['status']) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, label: '予定' },
      COMPLETED: { variant: 'default' as const, label: '完了' },
      OVERDUE: { variant: 'destructive' as const, label: '期限切れ' },
      CANCELLED: { variant: 'outline' as const, label: 'キャンセル' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeIcon = (type: ScheduledTransaction['type']) => {
    switch (type) {
      case 'INCOME':
        return '↗️'
      case 'EXPENSE':
        return '↘️'
      case 'TRANSFER':
        return '↔️'
      default:
        return '💰'
    }
  }

  const filterTransactions = (status?: ScheduledTransaction['status']) => {
    return scheduledTransactions.filter((tx) => (status ? tx.status === status : true))
  }

  const upcomingTransactions = filterTransactions('PENDING')
  const overdueTransactions = filterTransactions('OVERDUE')
  const completedTransactions = filterTransactions('COMPLETED')

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">予定取引</h1>
          <p className="text-muted-foreground">将来の収入・支出の予定を管理します</p>
        </div>
        <div className="flex gap-2">
          <Link to={"/dashboard/scheduled/calendar" as any}>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              カレンダー
            </Button>
          </Link>
          <Link to={"/dashboard/scheduled/create" as any}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              予定追加
            </Button>
          </Link>
        </div>
      </div>

      {/* 概要カード */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">予定中</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTransactions.length}件</div>
            <p className="text-xs text-muted-foreground">今後実行予定の取引</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">期限切れ</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTransactions.length}件</div>
            <p className="text-xs text-muted-foreground">期限を過ぎた取引</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了済み</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedTransactions.length}件
            </div>
            <p className="text-xs text-muted-foreground">実行済みの取引</p>
          </CardContent>
        </Card>
      </div>

      {/* 取引一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>予定取引一覧</CardTitle>
          <CardDescription>全ての予定取引の管理・確認ができます</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">予定中 ({upcomingTransactions.length})</TabsTrigger>
              <TabsTrigger value="overdue">期限切れ ({overdueTransactions.length})</TabsTrigger>
              <TabsTrigger value="completed">完了 ({completedTransactions.length})</TabsTrigger>
              <TabsTrigger value="all">全て ({scheduledTransactions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {upcomingTransactions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  予定中の取引はありません
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTransactions.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="overdue" className="space-y-4">
              {overdueTransactions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  期限切れの取引はありません
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueTransactions.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTransactions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  完了済みの取引はありません
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTransactions.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {scheduledTransactions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  予定取引がありません
                  <br />
                  <Link to={"/dashboard/scheduled/create" as any}>
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      最初の予定取引を作成
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledTransactions.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: ScheduledTransaction }) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getStatusBadge = (status: ScheduledTransaction['status']) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, label: '予定' },
      COMPLETED: { variant: 'default' as const, label: '完了' },
      OVERDUE: { variant: 'destructive' as const, label: '期限切れ' },
      CANCELLED: { variant: 'outline' as const, label: 'キャンセル' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeIcon = (type: ScheduledTransaction['type']) => {
    switch (type) {
      case 'INCOME':
        return '↗️'
      case 'EXPENSE':
        return '↘️'
      case 'TRANSFER':
        return '↔️'
      default:
        return '💰'
    }
  }

  return (
    <Link to={`/dashboard/scheduled/${transaction.id}` as any}>
      <div className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-center space-x-4">
          <div className="text-2xl">{getTypeIcon(transaction.type)}</div>
          <div>
            <div className="font-medium">{transaction.description}</div>
            <div className="text-sm text-muted-foreground">
              {transaction.account?.name}
              {transaction.category?.name && ` • ${transaction.category.name}`}
              {transaction.isRecurring && ` • 定期 (${transaction.frequency})`}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div
              className={`font-medium ${
                transaction.type === 'INCOME'
                  ? 'text-green-600'
                  : transaction.type === 'EXPENSE'
                    ? 'text-red-600'
                    : 'text-blue-600'
              }`}
            >
              {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
              {formatCurrency(transaction.amount, transaction.currency)}
            </div>
            <div className="text-sm text-muted-foreground">{formatDate(transaction.dueDate)}</div>
          </div>
          {getStatusBadge(transaction.status)}
        </div>
      </div>
    </Link>
  )
}
