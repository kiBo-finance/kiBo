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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  transactionsAtom,
  filteredTransactionsAtom,
  transactionLoadingAtom,
  type Transaction,
} from '@/lib/atoms/transactions'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Decimal from 'decimal.js'
import { useAtom, useAtomValue } from 'jotai'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightCircle,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  Tag,
  FileText,
} from 'lucide-react'
import { useState } from 'react'

interface TransactionListProps {
  onEdit?: (transaction: Transaction) => void
  showActions?: boolean
  compact?: boolean
}

export function TransactionList({
  onEdit,
  showActions = true,
  compact = false,
}: TransactionListProps) {
  const [transactions, setTransactions] = useAtom(transactionsAtom)
  const filteredTransactions = useAtomValue(filteredTransactionsAtom)
  const [loading, setLoading] = useAtom(transactionLoadingAtom)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const handleDelete = async (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      // ローカルステートから削除
      setTransactions(transactions.filter((t) => t.id !== selectedTransaction.id))
      setDeleteDialogOpen(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error('Delete error:', error)
      alert('取引の削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return <ArrowDownCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'EXPENSE':
        return <ArrowUpCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      case 'TRANSFER':
        return <ArrowRightCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      default:
        return null
    }
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

  const formatAmount = (amount: string, currency?: string, symbol?: string) => {
    const value = new Decimal(amount)
    const formatted = new Intl.NumberFormat('ja-JP', {
      style: 'decimal',
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(value.toNumber())

    return `${symbol || currency || ''}${formatted}`
  }

  if (compact) {
    // コンパクトビュー（ダッシュボード用）
    return (
      <div className="space-y-2">
        {filteredTransactions?.slice(0, 5).map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              {getTransactionIcon(transaction.type)}
              <div>
                <p className="text-sm font-medium">{transaction.description}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(transaction.date), 'MM/dd', { locale: ja })} •{' '}
                  {transaction.account?.name}
                </p>
              </div>
            </div>
            <p className={cn('font-semibold', getTransactionColor(transaction.type))}>
              {transaction.type === 'EXPENSE' && '-'}
              {formatAmount(
                transaction.amount,
                transaction.currency,
                transaction.currencyRef?.symbol
              )}
            </p>
          </div>
        ))}
      </div>
    )
  }

  // フルビュー
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>取引履歴</CardTitle>
          <CardDescription>すべての収入、支出、振替の記録</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>口座</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  {showActions && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showActions ? 7 : 6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      取引データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions?.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>{getTransactionIcon(transaction.type)}</TooltipTrigger>
                            <TooltipContent>
                              {transaction.type === 'INCOME' && '収入'}
                              {transaction.type === 'EXPENSE' && '支出'}
                              {transaction.type === 'TRANSFER' && '振替'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(transaction.date), 'yyyy/MM/dd', { locale: ja })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.notes && (
                            <div className="mt-1 flex items-start gap-1">
                              <FileText className="mt-0.5 h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">{transaction.notes}</p>
                            </div>
                          )}
                          {transaction.tags && transaction.tags.length > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <div className="flex gap-1">
                                {transaction.tags?.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="py-0 text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.category ? (
                          <Badge variant="outline">{transaction.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{transaction.account?.name}</p>
                          {transaction.card && (
                            <p className="text-xs text-muted-foreground">{transaction.card.name}</p>
                          )}
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
                        {transaction.exchangeRate && (
                          <p className="text-xs text-muted-foreground">
                            為替: {transaction.exchangeRate}
                          </p>
                        )}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取引を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消すことができません。取引「{selectedTransaction?.description}
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
