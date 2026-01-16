'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryReport } from '@/lib/atoms/reports'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { cn } from '@/lib/utils'
import { PieChart, Tag } from 'lucide-react'

interface CategoryBreakdownProps {
  report: CategoryReport | null
  type?: 'expense' | 'income'
}

export function CategoryBreakdown({ report, type = 'expense' }: CategoryBreakdownProps) {
  const { formatAmount } = useCurrencyFormatter('JPY')

  const data = type === 'expense' ? report?.expenses : report?.incomes
  const total = data?.reduce((sum, item) => sum + item.total, 0) || 0

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {type === 'expense' ? '支出カテゴリ' : '収入カテゴリ'}
        </CardTitle>
        <CardDescription>
          {type === 'expense' ? '支出の内訳' : '収入の内訳'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Tag className="mb-2 h-8 w-8" />
            <p>データがありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => {
              const percentage = total > 0 ? Math.round((item.total / total) * 100) : 0

              return (
                <div key={item.category?.id || `uncategorized-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: item.category?.color || '#6B7280',
                        }}
                      />
                      <span className="text-sm font-medium">
                        {item.category?.name || '未分類'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatAmount(item.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {percentage}% ({item.count}件)
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.category?.color || '#6B7280',
                      }}
                    />
                  </div>
                </div>
              )
            })}

            {type === 'expense' && report.uncategorizedExpense.count > 0 && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400" />
                    <span className="text-sm font-medium">未分類</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatAmount(report.uncategorizedExpense.total)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {report.uncategorizedExpense.count}件
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
