'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, CreditCard, Check, Download } from 'lucide-react'

interface PostpayPayment {
  id: string
  chargeAmount: number | string
  currency: string
  chargeDate: string
  description: string
  dueDate: string
  status: 'PENDING' | 'SCHEDULED' | 'PAID' | 'OVERDUE'
  paidAt?: string | null
  notes?: string | null
  card: {
    id: string
    name: string
    brand?: string | null
    lastFourDigits: string
  }
}

interface PostpayPaymentCardProps {
  payment: PostpayPayment
  compact?: boolean
  showActions?: boolean
  onMarkAsPaid?: (id: string) => Promise<void>
  onExportCalendar?: (id: string) => void
}

export function PostpayPaymentCard({
  payment,
  compact = false,
  showActions = false,
  onMarkAsPaid,
  onExportCalendar,
}: PostpayPaymentCardProps) {
  const formatCurrency = (amount: number | string, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(num)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: compact ? undefined : 'short',
    }).format(new Date(date))
  }

  const getStatusBadge = (status: PostpayPayment['status']) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, label: '支払い待ち', color: 'text-yellow-600' },
      SCHEDULED: { variant: 'outline' as const, label: 'カレンダー登録済', color: 'text-blue-600' },
      PAID: { variant: 'default' as const, label: '支払い完了', color: 'text-green-600' },
      OVERDUE: { variant: 'destructive' as const, label: '期限超過', color: 'text-red-600' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getDaysUntilDue = () => {
    const now = new Date()
    const due = new Date(payment.dueDate)
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const daysUntilDue = getDaysUntilDue()
  const isOverdue = daysUntilDue < 0 && payment.status !== 'PAID'
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3 && payment.status !== 'PAID'

  const cardInfo = payment.card.brand
    ? `${payment.card.brand} ****${payment.card.lastFourDigits}`
    : `****${payment.card.lastFourDigits}`

  return (
    <Card
      className={`transition-colors hover:bg-muted/50 ${isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-900/10' : ''} ${isDueSoon ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
    >
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="truncate font-medium">{payment.description}</h3>
                {getStatusBadge(payment.status)}
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {payment.card.name} ({cardInfo})
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      期限: {formatDate(payment.dueDate)}
                      {isOverdue && <span className="ml-1 text-red-600">({Math.abs(daysUntilDue)}日超過)</span>}
                      {isDueSoon && !isOverdue && (
                        <span className="ml-1 text-yellow-600">
                          (あと{daysUntilDue === 0 ? '今日' : `${daysUntilDue}日`})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {!compact && payment.notes && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {payment.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(payment.chargeAmount, payment.currency)}
              </div>
              {!compact && (
                <div className="text-xs text-muted-foreground">
                  利用日: {formatDate(payment.chargeDate)}
                </div>
              )}
            </div>

            {showActions && payment.status !== 'PAID' && (
              <div className="flex gap-2">
                {onMarkAsPaid && (
                  <Button
                    size="sm"
                    onClick={() => onMarkAsPaid(payment.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    支払い完了
                  </Button>
                )}
                {onExportCalendar && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onExportCalendar(payment.id)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    iCal
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
