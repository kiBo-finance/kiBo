'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { recentTransactionsAtom } from '@/lib/atoms/transactions'
import { useAtomValue } from 'jotai'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'
import { Link } from 'waku/router/client'

export function RecentTransactions() {
  const recentTransactions = useAtomValue(recentTransactionsAtom)

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(Math.abs(parseFloat(amount)))
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />
      case 'EXPENSE':
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />
      case 'TRANSFER':
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />
      default:
        return <ArrowLeftRight className="h-4 w-4 text-gray-600" />
    }
  }

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600'
      case 'EXPENSE':
        return 'text-red-600'
      case 'TRANSFER':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>最近の取引</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={"/transactions" as any}>すべて表示</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <p>取引データがありません</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to={"/transactions" as any}>取引を追加</Link>
              </Button>
            </div>
          ) : (
            recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
                <div className={`text-sm font-medium ${getAmountColor(transaction.type)}`}>
                  {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
