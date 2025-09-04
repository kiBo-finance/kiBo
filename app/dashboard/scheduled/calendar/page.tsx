'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ScheduledTransaction {
  id: string
  amount: number
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  dueDate: string
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  account?: {
    name: string
  }
}

export default function ScheduledCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [transactions, setTransactions] = useState<ScheduledTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [currentDate])

  const fetchTransactions = async () => {
    try {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      
      const response = await fetch(
        `/api/scheduled-transactions?start=${start.toISOString()}&end=${end.toISOString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
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

  const getTransactionsForDate = (date: Date) => {
    return transactions.filter(tx => 
      isSameDay(new Date(tx.dueDate), date)
    )
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

  const getStatusColor = (status: ScheduledTransaction['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-500'
      case 'COMPLETED':
        return 'bg-green-500'
      case 'OVERDUE':
        return 'bg-red-500'
      case 'CANCELLED':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    )
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // カレンダーの日付を生成
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay()) // 週の開始日から

  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay())) // 週の終了日まで

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  })

  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : []

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/scheduled">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">予定取引カレンダー</h1>
            <p className="text-muted-foreground">
              月別の予定取引をカレンダー形式で確認できます
            </p>
          </div>
        </div>
        <Link href="/dashboard/scheduled/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            予定追加
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* カレンダー */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {format(currentDate, 'yyyy年M月', { locale: ja })}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                  >
                    今日
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 gap-1 text-sm font-medium text-center">
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                      <div
                        key={day}
                        className={`py-3 ${
                          index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* カレンダーグリッド */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                      const dayTransactions = getTransactionsForDate(day)
                      const isCurrentMonth = isSameMonth(day, currentDate)
                      const isTodayDate = isToday(day)
                      const isSelected = selectedDate && isSameDay(day, selectedDate)

                      return (
                        <div
                          key={day.toISOString()}
                          className={`
                            min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors
                            ${isCurrentMonth 
                              ? 'bg-white hover:bg-gray-50' 
                              : 'bg-gray-50 text-gray-400'
                            }
                            ${isTodayDate ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                            ${isSelected ? 'ring-2 ring-blue-500' : ''}
                          `}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className={`
                            text-sm font-medium mb-1
                            ${isTodayDate ? 'text-blue-600' : ''}
                            ${!isCurrentMonth ? 'text-gray-400' : ''}
                          `}>
                            {format(day, 'd')}
                          </div>

                          <div className="space-y-1">
                            {dayTransactions.slice(0, 3).map((transaction) => (
                              <Link
                                key={transaction.id}
                                href={`/dashboard/scheduled/${transaction.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={`
                                  text-xs p-1 rounded truncate
                                  ${transaction.type === 'INCOME' 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : transaction.type === 'EXPENSE'
                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  }
                                `}>
                                  <div className="flex items-center space-x-1">
                                    <span>{getTypeIcon(transaction.type)}</span>
                                    <span className="truncate">
                                      {transaction.description}
                                    </span>
                                  </div>
                                  <div className="text-xs opacity-75">
                                    {formatCurrency(transaction.amount, transaction.currency)}
                                  </div>
                                </div>
                              </Link>
                            ))}
                            
                            {dayTransactions.length > 3 && (
                              <div className="text-xs text-center py-1 text-gray-500">
                                +{dayTransactions.length - 3}件
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* サイドパネル */}
        <div className="space-y-6">
          {/* 選択日の詳細 */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate 
                  ? format(selectedDate, 'M月d日（E）', { locale: ja })
                  : '日付を選択'
                }
              </CardTitle>
              <CardDescription>
                {selectedDate 
                  ? `${selectedDateTransactions.length}件の予定取引`
                  : 'カレンダーから日付をクリックしてください'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateTransactions.map((transaction) => (
                      <Link
                        key={transaction.id}
                        href={`/dashboard/scheduled/${transaction.id}`}
                      >
                        <div className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span>{getTypeIcon(transaction.type)}</span>
                              <span className="font-medium text-sm">
                                {transaction.description}
                              </span>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(transaction.status)}`} />
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.account?.name}
                          </div>
                          <div className={`text-sm font-medium ${
                            transaction.type === 'INCOME' 
                              ? 'text-green-600' 
                              : transaction.type === 'EXPENSE'
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }`}>
                            {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    この日の予定はありません
                  </div>
                )
              ) : (
                <div className="text-center py-6 text-gray-500">
                  カレンダーから日付を選択してください
                </div>
              )}
            </CardContent>
          </Card>

          {/* ステータス凡例 */}
          <Card>
            <CardHeader>
              <CardTitle>凡例</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">予定</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">完了</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">期限切れ</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm">キャンセル</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}