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
} from '../ui/alert-dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import {
  scheduledTransactionsAtom,
  upcomingScheduledTransactionsAtom,
  overdueScheduledTransactionsAtom,
  type ScheduledTransaction,
} from '../../lib/atoms/transactions'
import { cn } from '../../lib/utils'
import { format, isPast, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import Decimal from 'decimal.js'
import { useAtom, useAtomValue } from 'jotai'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Repeat,
  Play,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { useState } from 'react'

interface ScheduledTransactionListProps {
  onEdit?: (transaction: ScheduledTransaction) => void
  showActions?: boolean
  filterStatus?: 'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED'
  compact?: boolean
}

export function ScheduledTransactionList({
  onEdit,
  showActions = true,
  filterStatus = 'ALL',
  compact = false,
}: ScheduledTransactionListProps) {
  const [scheduledTransactions, setScheduledTransactions] = useAtom(scheduledTransactionsAtom)
  const upcomingTransactions = useAtomValue(upcomingScheduledTransactionsAtom)
  const overdueTransactions = useAtomValue(overdueScheduledTransactionsAtom)

  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<ScheduledTransaction | null>(null)

  // フィルタリング
  const filteredTransactions =
    filterStatus === 'ALL'
      ? scheduledTransactions
      : filterStatus === 'OVERDUE'
        ? overdueTransactions
        : scheduledTransactions.filter((t) => t.status === filterStatus)

  const handleExecute = async (transaction: ScheduledTransaction) => {
    setSelectedTransaction(transaction)
    setExecuteDialogOpen(true)
  }

  const confirmExecute = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      const response = await fetch(`/api/scheduled-transactions/${selectedTransaction.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executeDate: new Date().toISOString(),
          createRecurring: selectedTransaction.isRecurring,
        }),
      })

      if (!response.ok) {
        throw new Error('実行に失敗しました')
      }

      const result = await response.json()

      // ステータスを更新
      setScheduledTransactions(
        scheduledTransactions.map((t) =>
          t.id === selectedTransaction.id
            ? { ...t, status: 'COMPLETED', completedAt: new Date().toISOString() }
            : t
        )
      )

      // 繰り返し取引の場合、新しい予定を追加
      if (result.data.nextScheduledTransaction) {
        setScheduledTransactions([...scheduledTransactions, result.data.nextScheduledTransaction])
      }

      setExecuteDialogOpen(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error('Execute error:', error)
      alert('予定取引の実行に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (transaction: ScheduledTransaction) => {
    setSelectedTransaction(transaction)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      const response = await fetch(`/api/scheduled-transactions/${selectedTransaction.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      setScheduledTransactions(scheduledTransactions.filter((t) => t.id !== selectedTransaction.id))
      setDeleteDialogOpen(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error('Delete error:', error)
      alert('予定取引の削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string, dueDate: string) => {
    const isOverdue = isPast(new Date(dueDate)) && status === 'PENDING'

    if (isOverdue) {
      return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
    }

    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = isPast(new Date(dueDate)) && status === 'PENDING'

    if (isOverdue) {
      return <Badge variant="destructive">期限切れ</Badge>
    }

    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">予定</Badge>
      case 'COMPLETED':
        return <Badge variant="default">完了</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary">キャンセル</Badge>
      default:
        return null
    }
  }

  const getFrequencyLabel = (frequency?: string) => {
    switch (frequency) {
      case 'DAILY':
        return '毎日'
      case 'WEEKLY':
        return '毎週'
      case 'MONTHLY':
        return '毎月'
      case 'YEARLY':
        return '毎年'
      default:
        return null
    }
  }

  const formatAmount = (amount: string, currency?: string, symbol?: string) => {
    const value = new Decimal(amount)
    const formatted = new Intl.NumberFormat('ja-JP', {
      style: 'decimal',
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(value.toNumber())

    return `${symbol || currency || ''}${formatted}`
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600 dark:text-green-400'
      case 'EXPENSE':
        return 'text-red-600 dark:text-red-400'
      case 'TRANSFER':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return ''
    }
  }

  if (compact) {
    // コンパクトビュー（ダッシュボード用）
    const displayTransactions =
      filterStatus === 'OVERDUE'
        ? overdueTransactions.slice(0, 5)
        : upcomingTransactions.slice(0, 5)

    return (
      <div className="space-y-2">
        {displayTransactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {filterStatus === 'OVERDUE' ? '期限切れの予定はありません' : '今後の予定はありません'}
          </p>
        ) : (
          displayTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(transaction.status, transaction.dueDate)}
                <div>
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(transaction.dueDate), 'MM/dd', { locale: ja })}</span>
                    {transaction.isRecurring && (
                      <>
                        <Repeat className="h-3 w-3" />
                        <span>{getFrequencyLabel(transaction.frequency)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={cn('font-semibold text-sm', getTransactionColor(transaction.type))}>
                  {transaction.type === 'EXPENSE' && '-'}
                  {formatAmount(
                    transaction.amount,
                    transaction.currency,
                    transaction.currencyRef?.symbol
                  )}
                </p>
                {transaction.status === 'PENDING' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleExecute(transaction)}
                    className="h-7 w-7 cursor-pointer"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  // フルビュー
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>予定取引</CardTitle>
          <CardDescription>今後の支払い予定と繰り返し取引の管理</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>予定日</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>繰り返し</TableHead>
                  <TableHead>口座</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  {showActions && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showActions ? 8 : 7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      予定取引がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {getStatusIcon(transaction.status, transaction.dueDate)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {isPast(new Date(transaction.dueDate)) &&
                                transaction.status === 'PENDING' &&
                                '期限切れ'}
                              {transaction.status === 'PENDING' &&
                                !isPast(new Date(transaction.dueDate)) &&
                                '予定'}
                              {transaction.status === 'COMPLETED' && '完了'}
                              {transaction.status === 'CANCELLED' && 'キャンセル'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(transaction.dueDate), 'yyyy/MM/dd', { locale: ja })}
                          </span>
                        </div>
                        {transaction.reminderDays > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {transaction.reminderDays}日前に通知
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {transaction.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.isRecurring ? (
                          <div className="flex items-center gap-1">
                            <Repeat className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {getFrequencyLabel(transaction.frequency)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{transaction.account?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className={cn('font-semibold', getTransactionColor(transaction.type))}>
                          {transaction.type === 'EXPENSE' && '-'}
                          {formatAmount(
                            transaction.amount,
                            transaction.currency,
                            transaction.currencyRef?.symbol
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status, transaction.dueDate)}
                      </TableCell>
                      {showActions && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {transaction.status === 'PENDING' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleExecute(transaction)}
                                    className="cursor-pointer"
                                  >
                                    <Play className="mr-2 h-4 w-4" />
                                    実行
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => onEdit?.(transaction)}
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(transaction)}
                                className="cursor-pointer text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>予定取引を実行しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedTransaction?.description}」を実行し、実際の取引として記録します。
              {selectedTransaction?.isRecurring &&
                '繰り返し設定により、次の予定も自動的に作成されます。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExecute}>実行</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>予定取引を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消すことができません。予定取引「{selectedTransaction?.description}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
