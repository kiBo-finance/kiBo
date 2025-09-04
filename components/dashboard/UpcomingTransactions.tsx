'use client'

import { useAtomValue } from 'jotai'
import { upcomingTransactionsAtom } from '@/lib/atoms/transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Repeat } from 'lucide-react'
import Link from 'next/link'

export function UpcomingTransactions() {
  const upcomingTransactions = useAtomValue(upcomingTransactionsAtom)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(Math.abs(amount))
  }

  const getRecurringIcon = (recurringType?: string) => {
    if (!recurringType || recurringType === 'NONE') {
      return <Calendar className="h-4 w-4 text-gray-500" />
    }
    return <Repeat className="h-4 w-4 text-blue-500" />
  }

  const getRecurringText = (recurringType?: string) => {
    switch (recurringType) {
      case 'DAILY': return '毎日'
      case 'WEEKLY': return '毎週'
      case 'MONTHLY': return '毎月'
      case 'YEARLY': return '毎年'
      default: return '単発'
    }
  }

  const getDaysUntil = (date: Date) => {
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
          <Link href="/scheduled">すべて表示</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingTransactions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>今週の予定取引はありません</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href="/scheduled">予定取引を追加</Link>
              </Button>
            </div>
          ) : (
            upcomingTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getRecurringIcon(transaction.recurringType)}
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{transaction.scheduledDate.toLocaleDateString('ja-JP')}</span>
                      <span>•</span>
                      <span>{getRecurringText(transaction.recurringType)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getDaysUntil(transaction.scheduledDate)}
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