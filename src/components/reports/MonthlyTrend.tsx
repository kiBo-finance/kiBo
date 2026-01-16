'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { MonthlyReport } from '@/lib/atoms/reports'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { cn } from '@/lib/utils'
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react'

interface MonthlyTrendProps {
  report: MonthlyReport | null
}

export function MonthlyTrend({ report }: MonthlyTrendProps) {
  const { formatAmount, formatCompact } = useCurrencyFormatter('JPY')

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  // 最大値を計算（グラフのスケール用）
  const maxValue = Math.max(
    ...report.months.map((m) => Math.max(m.income, m.expense)),
    1
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          月次推移
        </CardTitle>
        <CardDescription>過去12ヶ月の収支推移</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* グラフ */}
          <div className="flex h-48 items-end gap-1">
            {report.months.map((month, index) => {
              const incomeHeight = (month.income / maxValue) * 100
              const expenseHeight = (month.expense / maxValue) * 100

              return (
                <div
                  key={`${month.year}-${month.month}`}
                  className="group relative flex flex-1 flex-col items-center gap-1"
                >
                  {/* 収入バー */}
                  <div
                    className="w-full max-w-[20px] rounded-t bg-green-500 transition-all hover:bg-green-400"
                    style={{ height: `${incomeHeight}%`, minHeight: month.income > 0 ? '4px' : '0' }}
                    title={`収入: ${formatAmount(month.income)}`}
                  />
                  {/* 支出バー */}
                  <div
                    className="w-full max-w-[20px] rounded-b bg-red-500 transition-all hover:bg-red-400"
                    style={{ height: `${expenseHeight}%`, minHeight: month.expense > 0 ? '4px' : '0' }}
                    title={`支出: ${formatAmount(month.expense)}`}
                  />

                  {/* ツールチップ */}
                  <div className="absolute -top-16 left-1/2 hidden -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs shadow-lg group-hover:block">
                    <div className="text-green-600">+{formatCompact(month.income)}</div>
                    <div className="text-red-600">-{formatCompact(month.expense)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 月ラベル */}
          <div className="flex gap-1">
            {report.months.map((month) => (
              <div
                key={`label-${month.year}-${month.month}`}
                className="flex-1 text-center text-xs text-muted-foreground"
              >
                {month.month}月
              </div>
            ))}
          </div>

          {/* 凡例 */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>収入</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-red-500" />
              <span>支出</span>
            </div>
          </div>

          {/* 平均値 */}
          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">平均収入</div>
              <div className="font-medium text-green-600">
                {formatAmount(report.averages.income)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">平均支出</div>
              <div className="font-medium text-red-600">
                {formatAmount(report.averages.expense)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">平均収支</div>
              <div
                className={cn(
                  'flex items-center justify-center gap-1 font-medium',
                  report.averages.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {report.averages.netIncome >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatAmount(Math.abs(report.averages.netIncome))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
