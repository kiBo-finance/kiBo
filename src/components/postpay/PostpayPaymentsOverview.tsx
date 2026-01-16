'use client'

import { PostpayPaymentCard } from '@/components/postpay/PostpayPaymentCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, AlertTriangle, Clock, Calendar, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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

export function PostpayPaymentsOverview() {
  const [overduePayments, setOverduePayments] = useState<PostpayPayment[]>([])
  const [dueSoonPayments, setDueSoonPayments] = useState<PostpayPayment[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<PostpayPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/postpay-payments')
      if (response.ok) {
        const payments: PostpayPayment[] = await response.json()

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
        const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

        // 期限超過（未払いで期限が過去）
        const overdue = payments.filter((p) => {
          const dueDate = new Date(p.dueDate)
          return (p.status === 'PENDING' || p.status === 'SCHEDULED') && dueDate < today
        })

        // もうすぐ期限（3日以内）
        const dueSoon = payments.filter((p) => {
          const dueDate = new Date(p.dueDate)
          const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
          return (
            (p.status === 'PENDING' || p.status === 'SCHEDULED') &&
            dueDateOnly >= today &&
            dueDateOnly <= threeDaysLater
          )
        })

        // 今後の支払い（3日以降2週間以内）
        const upcoming = payments
          .filter((p) => {
            const dueDate = new Date(p.dueDate)
            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
            return (
              (p.status === 'PENDING' || p.status === 'SCHEDULED') &&
              dueDateOnly > threeDaysLater &&
              dueDateOnly <= twoWeeksLater
            )
          })
          .slice(0, 3)

        setOverduePayments(overdue)
        setDueSoonPayments(dueSoon)
        setUpcomingPayments(upcoming)
      }
    } catch (error) {
      console.error('Failed to fetch postpay payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    try {
      const response = await fetch(`/api/postpay-payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })

      if (response.ok) {
        toast.success('支払いを完了にしました')
        fetchPayments()
      } else {
        toast.error('更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error)
      toast.error('更新に失敗しました')
    }
  }

  const handleExportCalendar = () => {
    window.open('/api/postpay-payments/calendar.ics', '_blank')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ポストペイ支払い
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPending = overduePayments.length + dueSoonPayments.length + upcomingPayments.length

  // ポストペイカードがない場合は表示しない
  if (totalPending === 0 && !loading) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              ポストペイ支払い
            </CardTitle>
            <CardDescription>後払いの支払いスケジュール</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCalendar}>
            <Download className="mr-2 h-4 w-4" />
            カレンダー出力
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 期限超過 */}
          {overduePayments.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h4 className="font-medium text-red-600">期限超過</h4>
                <Badge variant="destructive" className="text-xs">
                  {overduePayments.length}件
                </Badge>
              </div>
              <div className="space-y-2">
                {overduePayments.slice(0, 2).map((payment) => (
                  <PostpayPaymentCard
                    key={payment.id}
                    payment={payment}
                    compact
                    showActions
                    onMarkAsPaid={handleMarkAsPaid}
                  />
                ))}
                {overduePayments.length > 2 && (
                  <Button variant="ghost" size="sm" className="w-full">
                    他 {overduePayments.length - 2} 件を表示
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* もうすぐ期限 */}
          {dueSoonPayments.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <h4 className="font-medium text-yellow-600">もうすぐ期限</h4>
                <Badge variant="secondary" className="text-xs">
                  {dueSoonPayments.length}件
                </Badge>
              </div>
              <div className="space-y-2">
                {dueSoonPayments.slice(0, 2).map((payment) => (
                  <PostpayPaymentCard
                    key={payment.id}
                    payment={payment}
                    compact
                    showActions
                    onMarkAsPaid={handleMarkAsPaid}
                  />
                ))}
                {dueSoonPayments.length > 2 && (
                  <Button variant="ghost" size="sm" className="w-full">
                    他 {dueSoonPayments.length - 2} 件を表示
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 今後の支払い */}
          {upcomingPayments.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-blue-600">今後の支払い</h4>
                <Badge variant="outline" className="text-xs">
                  {upcomingPayments.length}件
                </Badge>
              </div>
              <div className="space-y-2">
                {upcomingPayments.map((payment) => (
                  <PostpayPaymentCard key={payment.id} payment={payment} compact />
                ))}
              </div>
            </div>
          )}

          {totalPending === 0 && (
            <div className="py-6 text-center text-muted-foreground">
              <CreditCard className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="text-sm">予定されている支払いはありません</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
