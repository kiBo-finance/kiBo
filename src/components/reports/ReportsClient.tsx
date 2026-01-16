'use client'

import { BarChart3 } from 'lucide-react'
import { ReportsDashboard } from './ReportsDashboard'

export function ReportsClient() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">レポート</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          収支の推移やカテゴリ別の支出を確認できます
        </p>
      </div>

      <ReportsDashboard />
    </div>
  )
}
