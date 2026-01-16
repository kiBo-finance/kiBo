'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Budget } from '@/lib/atoms/budgets'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'
import { cn } from '@/lib/utils'
import { Calendar, MoreHorizontal, Pencil, Target, Trash2 } from 'lucide-react'
import { BudgetProgress } from './BudgetProgress'

interface BudgetCardProps {
  budget: Budget
  onEdit?: (budget: Budget) => void
  onDelete?: (budget: Budget) => void
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const { formatAmount } = useCurrencyFormatter(budget.currency)

  const startDate = new Date(budget.startDate)
  const endDate = new Date(budget.endDate)
  const now = new Date()

  const isActive = budget.isActive && startDate <= now && endDate >= now
  const isPast = endDate < now
  const isFuture = startDate > now

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${startDate.toLocaleDateString('ja-JP', options)} - ${endDate.toLocaleDateString('ja-JP', options)}`
  }

  const getStatusBadge = () => {
    if (!budget.isActive) {
      return <Badge variant="secondary">無効</Badge>
    }
    if (isPast) {
      return <Badge variant="outline">終了</Badge>
    }
    if (isFuture) {
      return <Badge variant="outline">予定</Badge>
    }
    if (budget.percentUsed !== undefined && budget.percentUsed > 100) {
      return <Badge variant="destructive">超過</Badge>
    }
    if (budget.percentUsed !== undefined && budget.percentUsed >= 80) {
      return <Badge className="bg-yellow-500">要注意</Badge>
    }
    return <Badge className="bg-green-500">正常</Badge>
  }

  return (
    <Card className={cn(!budget.isActive && 'opacity-60')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {budget.category && (
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: budget.category.color }}
            />
          )}
          <CardTitle className="text-base font-medium">{budget.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(budget)}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(budget)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDateRange()}</span>
        </div>

        {budget.category && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{budget.category.name}</span>
          </div>
        )}

        {budget.spent !== undefined && budget.percentUsed !== undefined ? (
          <BudgetProgress
            amount={budget.amount}
            spent={budget.spent}
            currency={budget.currency}
          />
        ) : (
          <div className="text-lg font-semibold">{formatAmount(budget.amount)}</div>
        )}
      </CardContent>
    </Card>
  )
}
