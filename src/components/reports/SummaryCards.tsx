'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SummaryReport } from '@/lib/atoms/reports'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryCardsProps {
  report: SummaryReport | null
}

export function SummaryCards({ report }: SummaryCardsProps) {
  const { formatAmount } = useCurrencyFormatter('JPY')

  if (!report) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">収入</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            +{formatAmount(report.income.total)}
          </div>
          <p className="text-xs text-muted-foreground">{report.income.count}件の取引</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">支出</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            -{formatAmount(report.expense.total)}
          </div>
          <p className="text-xs text-muted-foreground">{report.expense.count}件の取引</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">収支</CardTitle>
          {report.netIncome >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'text-2xl font-bold',
              report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {report.netIncome >= 0 ? '+' : ''}
            {formatAmount(report.netIncome)}
          </div>
          <p className="text-xs text-muted-foreground">
            {report.netIncome >= 0 ? '黒字' : '赤字'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総資産</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAmount(report.totalBalance)}</div>
          <p className="text-xs text-muted-foreground">{report.accounts.length}件の口座</p>
        </CardContent>
      </Card>
    </div>
  )
}
