'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AccountReport } from '@/lib/atoms/reports'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { cn } from '@/lib/utils'
import { Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface AccountSummaryProps {
  report: AccountReport | null
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: '現金',
  CHECKING: '普通預金',
  SAVINGS: '貯蓄預金',
  FIXED_DEPOSIT: '定期預金',
}

export function AccountSummary({ report }: AccountSummaryProps) {
  const { formatAmount } = useCurrencyFormatter('JPY')

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded bg-muted" />
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
          <Landmark className="h-5 w-5" />
          口座別サマリー
        </CardTitle>
        <CardDescription>口座ごとの収支状況</CardDescription>
      </CardHeader>
      <CardContent>
        {report.accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Landmark className="mb-2 h-8 w-8" />
            <p>口座がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {report.accounts.map((item) => (
              <div
                key={item.account.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{item.account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[item.account.type] || item.account.type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatAmount(item.account.balance)}</div>
                    <div className="text-sm text-muted-foreground">{item.account.currency}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded bg-green-50 p-2 text-center dark:bg-green-900/20">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>収入</span>
                    </div>
                    <div className="font-medium text-green-700 dark:text-green-400">
                      {formatAmount(item.income.total)}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.income.count}件</div>
                  </div>

                  <div className="rounded bg-red-50 p-2 text-center dark:bg-red-900/20">
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <ArrowDownRight className="h-3 w-3" />
                      <span>支出</span>
                    </div>
                    <div className="font-medium text-red-700 dark:text-red-400">
                      {formatAmount(item.expense.total)}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.expense.count}件</div>
                  </div>

                  <div className="rounded bg-muted p-2 text-center">
                    <div className="text-muted-foreground">収支</div>
                    <div
                      className={cn(
                        'font-medium',
                        item.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {item.netFlow >= 0 ? '+' : ''}
                      {formatAmount(item.netFlow)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
