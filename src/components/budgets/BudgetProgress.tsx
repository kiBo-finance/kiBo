'use client'

import { cn } from '@/lib/utils'
import { useCurrencyFormatter } from '@/lib/hooks/useCurrencyFormatter'

interface BudgetProgressProps {
  amount: number
  spent: number
  currency: string
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BudgetProgress({
  amount,
  spent,
  currency,
  showLabels = true,
  size = 'md',
  className,
}: BudgetProgressProps) {
  const { formatAmount } = useCurrencyFormatter(currency)

  const percentUsed = amount > 0 ? Math.round((spent / amount) * 100) : 0
  const remaining = amount - spent

  const getProgressColor = () => {
    if (percentUsed > 100) return 'bg-red-500'
    if (percentUsed >= 80) return 'bg-yellow-500'
    if (percentUsed >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getTextColor = () => {
    if (percentUsed > 100) return 'text-red-600 dark:text-red-400'
    if (percentUsed >= 80) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-muted-foreground'
  }

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size]

  return (
    <div className={cn('space-y-1', className)}>
      {showLabels && (
        <div className="flex justify-between text-sm">
          <span className={getTextColor()}>
            {formatAmount(spent)} / {formatAmount(amount)}
          </span>
          <span className={cn('font-medium', getTextColor())}>{percentUsed}%</span>
        </div>
      )}

      <div className={cn('w-full rounded-full bg-muted', heightClass)}>
        <div
          className={cn('rounded-full transition-all duration-300', heightClass, getProgressColor())}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {showLabels && remaining !== 0 && (
        <div className="text-xs text-muted-foreground">
          {remaining > 0 ? (
            <span>残り {formatAmount(remaining)}</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">
              {formatAmount(Math.abs(remaining))} 超過
            </span>
          )}
        </div>
      )}
    </div>
  )
}
