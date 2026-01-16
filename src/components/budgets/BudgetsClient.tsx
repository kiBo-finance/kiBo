'use client'

import { Target } from 'lucide-react'
import { BudgetList } from './BudgetList'

export function BudgetsClient() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">予算管理</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          カテゴリごとの支出上限を設定し、お金の使い方を管理します
        </p>
      </div>

      <BudgetList />
    </div>
  )
}
