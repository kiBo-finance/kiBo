'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScheduledTransactionCard } from '@/components/scheduled/ScheduledTransactionCard'

interface ScheduledTransaction {
  id: string
  amount: number
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  dueDate: string
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  isRecurring: boolean
  account?: {
    name: string
  }
  category?: {
    name: string
  }
}

export function ScheduledTransactionsOverview() {
  const [todayTransactions, setTodayTransactions] = useState<ScheduledTransaction[]>([])
  const [overdueTransactions, setOverdueTransactions] = useState<ScheduledTransaction[]>([])
  const [upcomingTransactions, setUpcomingTransactions] = useState<ScheduledTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheduledTransactions()
  }, [])

  const fetchScheduledTransactions = async () => {
    try {
      const response = await fetch('/api/scheduled-transactions')
      if (response.ok) {
        const transactions = await response.json()
        
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

        // 今日の予定取引
        const todayTxs = transactions.filter((tx: ScheduledTransaction) => {
          const txDate = new Date(tx.dueDate)
          const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())
          return tx.status === 'PENDING' && txDateOnly.getTime() === today.getTime()
        })

        // 期限切れの予定取引
        const overdueTxs = transactions.filter((tx: ScheduledTransaction) => {
          const txDate = new Date(tx.dueDate)
          const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())
          return tx.status === 'PENDING' && txDateOnly < today
        })

        // 今後7日間の予定取引（今日と期限切れを除く）
        const upcomingTxs = transactions.filter((tx: ScheduledTransaction) => {
          const txDate = new Date(tx.dueDate)
          const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())
          return tx.status === 'PENDING' && txDateOnly >= tomorrow && txDateOnly <= nextWeek
        }).slice(0, 3) // 最大3件表示

        setTodayTransactions(todayTxs)
        setOverdueTransactions(overdueTxs)
        setUpcomingTransactions(upcomingTxs)
      }
    } catch (error) {
      console.error('Failed to fetch scheduled transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            予定取引
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPending = todayTransactions.length + overdueTransactions.length + upcomingTransactions.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              予定取引
            </CardTitle>
            <CardDescription>
              今日の予定と期限切れの取引をチェック
            </CardDescription>
          </div>
          <Link href="/dashboard/scheduled">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4 mr-2" />
              すべて表示
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {totalPending === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">今日の予定取引はありません</p>
            <Link href="/dashboard/scheduled/create">
              <Button size="sm" className="mt-2">
                予定を追加
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 期限切れ */}
            {overdueTransactions.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h4 className="font-medium text-red-600">期限切れ</h4>
                  <Badge variant="destructive" className="text-xs">
                    {overdueTransactions.length}件
                  </Badge>
                </div>
                <div className="space-y-2">
                  {overdueTransactions.slice(0, 2).map((transaction) => (
                    <ScheduledTransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      compact={true}
                    />
                  ))}
                  {overdueTransactions.length > 2 && (
                    <Link href="/dashboard/scheduled?status=overdue">
                      <Button variant="ghost" size="sm" className="w-full">
                        他 {overdueTransactions.length - 2} 件を表示
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* 今日の予定 */}
            {todayTransactions.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium text-blue-600">今日の予定</h4>
                  <Badge variant="secondary" className="text-xs">
                    {todayTransactions.length}件
                  </Badge>
                </div>
                <div className="space-y-2">
                  {todayTransactions.slice(0, 2).map((transaction) => (
                    <ScheduledTransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      compact={true}
                    />
                  ))}
                  {todayTransactions.length > 2 && (
                    <Link href="/dashboard/scheduled?status=today">
                      <Button variant="ghost" size="sm" className="w-full">
                        他 {todayTransactions.length - 2} 件を表示
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* 今後の予定 */}
            {upcomingTransactions.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium text-green-600">今後の予定</h4>
                  <Badge variant="outline" className="text-xs">
                    {upcomingTransactions.length}件
                  </Badge>
                </div>
                <div className="space-y-2">
                  {upcomingTransactions.map((transaction) => (
                    <ScheduledTransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* フッター */}
            <div className="pt-2 border-t">
              <Link href="/dashboard/scheduled">
                <Button variant="ghost" size="sm" className="w-full">
                  予定取引の管理画面を開く
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}