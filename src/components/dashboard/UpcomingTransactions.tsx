'use client'

import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  upcomingScheduledTransactionsAtom,
  type ScheduledTransaction,
} from '../../lib/atoms/transactions'
import { useAtomValue } from 'jotai'
import { Calendar, Clock, Repeat } from 'lucide-react'
import { Link } from 'waku/router/client'

export function UpcomingTransactions() {
  const upcomingTransactions = useAtomValue(upcomingScheduledTransactionsAtom)

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(Math.abs(parseFloat(amount)))
  }

  const getRecurringIcon = (frequency?: ScheduledTransaction['frequency']) => {
    if (!frequency) {
      return <Calendar className="h-4 w-4 text-gray-500" />
    }
    return <Repeat className="h-4 w-4 text-blue-500" />
  }

  const getRecurringText = (frequency?: ScheduledTransaction['frequency']) => {
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
        return '単発'
    }
  }

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今日'
    if (diffDays === 1) return '明日'
    if (diffDays < 0) return '期限切れ'
    return `${diffDays}日後`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>予定取引</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={"/scheduled" as any}>すべて表示</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingTransactions.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p>今週の予定取引はありません</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to={"/scheduled" as any}>予定取引を追加</Link>
              </Button>
            </div>
          ) : (
            upcomingTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getRecurringIcon(transaction.frequency)}
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{new Date(transaction.dueDate).toLocaleDateString('ja-JP')}</span>
                      <span>•</span>
                      <span>{getRecurringText(transaction.frequency)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-medium ${
                      transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getDaysUntil(transaction.dueDate)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
