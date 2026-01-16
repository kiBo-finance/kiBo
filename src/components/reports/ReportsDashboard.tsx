'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  reportPeriodAtom,
  summaryReportAtom,
  categoryReportAtom,
  monthlyReportAtom,
  accountReportAtom,
  reportsLoadingAtom,
  fetchAllReportsAtom,
} from '@/lib/atoms/reports'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { SummaryCards } from './SummaryCards'
import { CategoryBreakdown } from './CategoryBreakdown'
import { MonthlyTrend } from './MonthlyTrend'
import { AccountSummary } from './AccountSummary'

export function ReportsDashboard() {
  const [period, setPeriod] = useAtom(reportPeriodAtom)
  const loading = useAtomValue(reportsLoadingAtom)
  const summaryReport = useAtomValue(summaryReportAtom)
  const categoryReport = useAtomValue(categoryReportAtom)
  const monthlyReport = useAtomValue(monthlyReportAtom)
  const accountReport = useAtomValue(accountReportAtom)
  const fetchAllReports = useSetAtom(fetchAllReportsAtom)

  useEffect(() => {
    fetchAllReports()
  }, [fetchAllReports, period.type, period.startDate, period.endDate])

  const handleRefresh = () => {
    fetchAllReports()
  }

  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      const now = new Date()
      setPeriod({
        type: 'custom',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      })
    } else {
      setPeriod({
        type: value as 'thisMonth' | 'lastMonth' | 'thisYear',
        startDate: null,
        endDate: null,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>期間</Label>
          <Select value={period.type} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth" textValue="今月">今月</SelectItem>
              <SelectItem value="lastMonth" textValue="先月">先月</SelectItem>
              <SelectItem value="thisYear" textValue="今年">今年</SelectItem>
              <SelectItem value="custom" textValue="カスタム">カスタム</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {period.type === 'custom' && (
          <>
            <div className="space-y-2">
              <Label>開始日</Label>
              <Input
                type="date"
                value={period.startDate || ''}
                onChange={(e) =>
                  setPeriod((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>終了日</Label>
              <Input
                type="date"
                value={period.endDate || ''}
                onChange={(e) =>
                  setPeriod((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </>
        )}

        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* サマリーカード */}
      <SummaryCards report={summaryReport} />

      {/* グラフとチャート */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyTrend report={monthlyReport} />
        <CategoryBreakdown report={categoryReport} type="expense" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AccountSummary report={accountReport} />
        <CategoryBreakdown report={categoryReport} type="income" />
      </div>
    </div>
  )
}
