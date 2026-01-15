'use client'

import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import Decimal from 'decimal.js'
import { BarChart3, PieChart, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { useEffect, useState } from 'react'

interface StatsData {
  summary: {
    totalIncome: string
    totalExpense: string
    netIncome: string
    transactionCount: number
    period: {
      start: string
      end: string
      days: number
    }
  }
  breakdown: {
    byCategory: Array<{
      categoryId?: string
      category?: { name: string }
      type: string
      amount: string
      count: number
    }>
    byAccount: Array<{
      accountId: string
      account?: { name: string }
      amount: string
      count: number
    }>
    topExpenseCategories: Array<{
      categoryId: string
      category: { name: string }
      amount: string
    }>
  }
  trends: {
    daily: Array<{
      date: string
      type: string
      amount: string
      count: number
    }>
  }
}

export function TransactionStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/transactions/stats?period=${period}`)
        if (response.ok) {
          const data = await response.json()
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [period])

  const formatAmount = (amount: string, showSign = false) => {
    const value = new Decimal(amount)
    const formatted = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value.toNumber()))

    if (showSign && value.isPositive()) {
      return `+${formatted}`
    }
    return formatted
  }

  const getPercentage = (part: string, total: string) => {
    const partValue = new Decimal(part)
    const totalValue = new Decimal(total)
    if (totalValue.isZero()) return 0
    return partValue.dividedBy(totalValue).times(100).toNumber()
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">統計データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          統計データがありません
        </CardContent>
      </Card>
    )
  }

  const totalExpense = new Decimal(stats.summary.totalExpense)
  const incomeCategories = stats.breakdown.byCategory.filter((c) => c.type === 'INCOME')
  const expenseCategories = stats.breakdown.byCategory.filter((c) => c.type === 'EXPENSE')

  return (
    <div className="space-y-6">
      {/* 期間選択 */}
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="week">週間</TabsTrigger>
            <TabsTrigger value="month">月間</TabsTrigger>
            <TabsTrigger value="year">年間</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総収入</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatAmount(stats.summary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.summary.period.days}日間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総支出</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatAmount(stats.summary.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.summary.period.days}日間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">純利益</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                new Decimal(stats.summary.netIncome).isPositive()
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatAmount(stats.summary.netIncome, true)}
            </div>
            <p className="text-xs text-muted-foreground">収入 - 支出</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">取引数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.transactionCount}</div>
            <p className="text-xs text-muted-foreground">件の取引</p>
          </CardContent>
        </Card>
      </div>

      {/* カテゴリ別内訳 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              支出カテゴリ別
            </CardTitle>
            <CardDescription>カテゴリごとの支出割合</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenseCategories.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">データがありません</p>
            ) : (
              expenseCategories
                .sort((a, b) => new Decimal(b.amount).minus(new Decimal(a.amount)).toNumber())
                .slice(0, 10)
                .map((category) => {
                  const percentage = getPercentage(category.amount, stats.summary.totalExpense)
                  return (
                    <div key={category.categoryId || 'uncategorized'} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{category.category?.name || '未分類'}</Badge>
                          <span className="text-sm text-muted-foreground">{category.count}件</span>
                        </div>
                        <span className="font-semibold">{formatAmount(category.amount)}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-right text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  )
                })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              口座別集計
            </CardTitle>
            <CardDescription>各口座の取引額</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.breakdown.byAccount.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">データがありません</p>
            ) : (
              stats.breakdown.byAccount
                .sort((a, b) => new Decimal(b.amount).minus(new Decimal(a.amount)).toNumber())
                .map((account) => (
                  <div key={account.accountId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{account.account?.name || '不明な口座'}</p>
                      <p className="text-sm text-muted-foreground">{account.count}件の取引</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatAmount(account.amount)}</p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* トップ支出カテゴリ */}
      <Card>
        <CardHeader>
          <CardTitle>支出上位カテゴリ</CardTitle>
          <CardDescription>最も支出の多いカテゴリ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.breakdown.topExpenseCategories.length === 0 ? (
              <p className="col-span-full py-4 text-center text-muted-foreground">
                データがありません
              </p>
            ) : (
              stats.breakdown.topExpenseCategories.slice(0, 6).map((category, index) => (
                <div key={category.categoryId} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{category.category.name}</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatAmount(category.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
