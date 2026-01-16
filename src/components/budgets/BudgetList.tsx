'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Budget } from '@/lib/atoms/budgets'
import {
  budgetsFiltersAtom,
  budgetStatsAtom,
  deleteBudgetAtom,
  filteredBudgetsAtom,
  refreshBudgetsAtom,
  budgetsLoadingAtom,
} from '@/lib/atoms/budgets'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { AlertTriangle, Target, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BudgetCard } from './BudgetCard'
import { BudgetCreateDialog } from './BudgetCreateDialog'
import { BudgetEditDialog } from './BudgetEditDialog'
import { BudgetProgress } from './BudgetProgress'

interface Category {
  id: string
  name: string
  type: string
}

export function BudgetList() {
  const [filters, setFilters] = useAtom(budgetsFiltersAtom)
  const budgets = useAtomValue(filteredBudgetsAtom)
  const stats = useAtomValue(budgetStatsAtom)
  const loading = useAtomValue(budgetsLoadingAtom)
  const refreshBudgets = useSetAtom(refreshBudgetsAtom)
  const deleteBudget = useSetAtom(deleteBudgetAtom)
  const { handleError, showSuccess } = useErrorHandler()

  const [categories, setCategories] = useState<Category[]>([])
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)

  const { formatAmount } = useCurrencyFormatter('JPY')

  useEffect(() => {
    refreshBudgets()
    fetchCategories()
  }, [refreshBudgets])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?type=EXPENSE&active=true')
      if (response.ok) {
        const result = await response.json()
        setCategories(result.data || result)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleDelete = async () => {
    if (!deletingBudget) return

    try {
      const result = await deleteBudget(deletingBudget.id)
      if (result.success) {
        showSuccess('予算を削除しました')
      } else {
        handleError(new Error(result.error || ''), '予算の削除に失敗しました')
      }
    } catch (error) {
      handleError(error, '予算の削除に失敗しました')
    } finally {
      setDeletingBudget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総予算額</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.totalBudgeted)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.currentPeriod}件の有効な予算
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">支出済み</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.totalSpent)}</div>
            {stats.totalBudgeted > 0 && (
              <BudgetProgress
                amount={stats.totalBudgeted}
                spent={stats.totalSpent}
                currency="JPY"
                showLabels={false}
                size="sm"
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">注意が必要</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overBudget + stats.nearLimit}件
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overBudget}件超過、{stats.nearLimit}件が80%以上
            </p>
          </CardContent>
        </Card>
      </div>

      {/* フィルターとアクション */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.categoryId}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, categoryId: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" textValue="すべてのカテゴリ">すべてのカテゴリ</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id} textValue={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.period}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                period: value as 'current' | 'past' | 'all',
              }))
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="期間" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current" textValue="現在の期間">現在の期間</SelectItem>
              <SelectItem value="past" textValue="過去の期間">過去の期間</SelectItem>
              <SelectItem value="all" textValue="すべて">すべて</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <BudgetCreateDialog onSuccess={() => refreshBudgets()} />
      </div>

      {/* 予算リスト */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">予算がありません</CardTitle>
            <CardDescription className="mt-2 text-center">
              カテゴリごとに支出上限を設定して、
              <br />
              お金の管理を始めましょう
            </CardDescription>
            <BudgetCreateDialog
              trigger={
                <button className="mt-4 text-sm text-primary hover:underline">
                  最初の予算を作成する
                </button>
              }
              onSuccess={() => refreshBudgets()}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={setEditingBudget}
              onDelete={setDeletingBudget}
            />
          ))}
        </div>
      )}

      {/* 編集ダイアログ */}
      <BudgetEditDialog
        budget={editingBudget}
        open={!!editingBudget}
        onOpenChange={(open) => !open && setEditingBudget(null)}
        onSuccess={() => refreshBudgets()}
      />

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deletingBudget} onOpenChange={(open) => !open && setDeletingBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>予算を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingBudget?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
