import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'waku/router/client'

interface ScheduledTransaction {
  id: string
  amount: number
  currency: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description: string
  dueDate: string
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  isRecurring: boolean
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
  account?: {
    name: string
  }
  category?: {
    name: string
  }
}

interface ScheduledTransactionCardProps {
  transaction: ScheduledTransaction
  compact?: boolean
  showActions?: boolean
  onComplete?: (id: string) => Promise<void>
  onCancel?: (id: string) => Promise<void>
}

export function ScheduledTransactionCard({
  transaction,
  compact = false,
  showActions = false,
  onComplete,
  onCancel,
}: ScheduledTransactionCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: compact ? undefined : 'short',
    }).format(new Date(date))
  }

  const getTypeIcon = (type: ScheduledTransaction['type']) => {
    switch (type) {
      case 'INCOME':
        return '↗️'
      case 'EXPENSE':
        return '↘️'
      case 'TRANSFER':
        return '↔️'
      default:
        return '💰'
    }
  }

  const getStatusBadge = (status: ScheduledTransaction['status']) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, label: '予定' },
      COMPLETED: { variant: 'default' as const, label: '完了' },
      OVERDUE: { variant: 'destructive' as const, label: '期限切れ' },
      CANCELLED: { variant: 'outline' as const, label: 'キャンセル' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getAmountColor = (type: ScheduledTransaction['type']) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600'
      case 'EXPENSE':
        return 'text-red-600'
      case 'TRANSFER':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getFrequencyLabel = (frequency?: string) => {
    const labels = {
      DAILY: '毎日',
      WEEKLY: '毎週',
      MONTHLY: '毎月',
      YEARLY: '毎年',
    } as const
    return frequency ? labels[frequency as keyof typeof labels] : ''
  }

  const canComplete = transaction.status === 'PENDING' || transaction.status === 'OVERDUE'
  const canCancel = transaction.status === 'PENDING' || transaction.status === 'OVERDUE'

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="flex items-start justify-between">
          <div className="flex flex-1 items-start space-x-4">
            <div className="text-2xl">{getTypeIcon(transaction.type)}</div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center space-x-2">
                <h3 className="truncate font-medium">{transaction.description}</h3>
                {getStatusBadge(transaction.status)}
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {transaction.account?.name}
                  {transaction.category?.name && ` • ${transaction.category.name}`}
                  {transaction.isRecurring &&
                    ` • ${getFrequencyLabel(transaction.frequency || undefined)}`}
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(transaction.dueDate)}</span>
                  </div>
                  {transaction.isRecurring && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>定期</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className={`font-medium ${getAmountColor(transaction.type)}`}>
                {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
                {formatCurrency(transaction.amount, transaction.currency)}
              </div>
            </div>

            {showActions && (
              <div className="flex space-x-2">
                {canComplete && onComplete && (
                  <Button
                    size="sm"
                    onClick={() => onComplete(transaction.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    完了
                  </Button>
                )}
                {canCancel && onCancel && (
                  <Button size="sm" variant="outline" onClick={() => onCancel(transaction.id)}>
                    キャンセル
                  </Button>
                )}
                <Link to={`/dashboard/scheduled/${transaction.id}` as any}>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}

            {!showActions && (
              <Link to={`/dashboard/scheduled/${transaction.id}` as any}>
                <Button size="sm" variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
