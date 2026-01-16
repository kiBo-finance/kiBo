import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { PostpayPaymentStatus, Prisma } from '@prisma/client'

/**
 * iCalendar形式の日付文字列を生成
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * iCalendar形式の日付のみ（終日イベント用）
 */
function formatICalDateOnly(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '')
}

/**
 * 文字列をiCalendar用にエスケープ
 */
function escapeICalString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * 金額をフォーマット
 */
function formatAmount(amount: number | string | { toString(): string }, currency: string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString())
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency,
  }).format(num)
}

const TRANSACTION_TYPE_LABELS = {
  INCOME: '収入',
  EXPENSE: '支出',
  TRANSFER: '振替',
} as const

/**
 * GET /api/postpay-payments/calendar.ics
 * ポストペイ支払い＆予定取引スケジュールをiCal形式でエクスポート
 *
 * Query params:
 * - cardId: カードIDでフィルター（ポストペイのみ）
 * - status: ステータスでフィルター（カンマ区切り）
 * - includeScheduled: 予定取引も含める（デフォルト: true）
 * - scheduledOnly: 予定取引のみ出力
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('cardId')
    const statusFilter = searchParams.get('status')
    const includeScheduled = searchParams.get('includeScheduled') !== 'false'
    const scheduledOnly = searchParams.get('scheduledOnly') === 'true'

    // iCalendar形式を生成
    const now = new Date()
    const calendarLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//kiBoアプリ//Payment Schedule//JA',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:kiBoアプリ - 支払いスケジュール',
      'X-WR-TIMEZONE:Asia/Tokyo',
    ]

    // ポストペイ支払いを取得（scheduledOnlyでない場合）
    if (!scheduledOnly) {
      const postpayWhereClause: Prisma.PostpayPaymentWhereInput = {
        userId: session.user.id,
      }

      if (cardId) {
        postpayWhereClause.cardId = cardId
      }

      // デフォルトは未払いの支払いのみ
      if (statusFilter) {
        postpayWhereClause.status = { in: statusFilter.split(',') as PostpayPaymentStatus[] }
      } else {
        postpayWhereClause.status = { in: ['PENDING', 'SCHEDULED'] as PostpayPaymentStatus[] }
      }

      const payments = await prisma.postpayPayment.findMany({
        where: postpayWhereClause,
        include: {
          card: {
            select: {
              name: true,
              brand: true,
              lastFourDigits: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      })

      for (const payment of payments) {
        const uid = `postpay-${payment.id}@kibo.bktsk.com`
        const dueDate = new Date(payment.dueDate)
        const cardInfo = payment.card.brand
          ? `${payment.card.name} (${payment.card.brand} ****${payment.card.lastFourDigits})`
          : `${payment.card.name} (****${payment.card.lastFourDigits})`

        const summary = `💳 支払い: ${formatAmount(payment.chargeAmount, payment.currency)}`
        const description = [
          `カード: ${cardInfo}`,
          `金額: ${formatAmount(payment.chargeAmount, payment.currency)}`,
          `利用内容: ${payment.description}`,
          `チャージ日: ${new Date(payment.chargeDate).toLocaleDateString('ja-JP')}`,
          payment.notes ? `メモ: ${payment.notes}` : '',
        ]
          .filter(Boolean)
          .join('\\n')

        // 終日イベントとして作成（支払い期限日）
        calendarLines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${formatICalDate(now)}`,
          `DTSTART;VALUE=DATE:${formatICalDateOnly(dueDate)}`,
          `DTEND;VALUE=DATE:${formatICalDateOnly(new Date(dueDate.getTime() + 86400000))}`,
          `SUMMARY:${escapeICalString(summary)}`,
          `DESCRIPTION:${escapeICalString(description)}`,
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT',
          // 1日前にリマインダー
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeICalString(`明日が支払い期限です: ${summary}`)}`,
          'TRIGGER:-P1D',
          'END:VALARM',
          // 当日朝にもリマインダー
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeICalString(`本日が支払い期限です: ${summary}`)}`,
          'TRIGGER:-PT9H',
          'END:VALARM',
          'END:VEVENT'
        )
      }
    }

    // 予定取引を取得（includeScheduledの場合）
    if (includeScheduled || scheduledOnly) {
      const scheduledTransactions = await prisma.scheduledTransaction.findMany({
        where: {
          userId: session.user.id,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { gte: new Date() },
        },
        include: {
          account: {
            select: {
              name: true,
            },
          },
          category: {
            select: {
              name: true,
              icon: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      })

      for (const tx of scheduledTransactions) {
        const uid = `scheduled-${tx.id}@kibo.bktsk.com`
        const dueDate = new Date(tx.dueDate)
        const typeLabel = TRANSACTION_TYPE_LABELS[tx.type] || tx.type
        const typeIcon = tx.type === 'INCOME' ? '📈' : tx.type === 'EXPENSE' ? '📉' : '🔄'

        const summary = `${typeIcon} ${typeLabel}: ${formatAmount(tx.amount, tx.currency)}`
        const description = [
          `内容: ${tx.description}`,
          `金額: ${formatAmount(tx.amount, tx.currency)}`,
          `種類: ${typeLabel}`,
          `口座: ${tx.account.name}`,
          tx.category ? `カテゴリ: ${tx.category.name}` : '',
          tx.isRecurring ? `繰り返し: ${tx.frequency}` : '',
          tx.notes ? `メモ: ${tx.notes}` : '',
        ]
          .filter(Boolean)
          .join('\\n')

        calendarLines.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${formatICalDate(now)}`,
          `DTSTART;VALUE=DATE:${formatICalDateOnly(dueDate)}`,
          `DTEND;VALUE=DATE:${formatICalDateOnly(new Date(dueDate.getTime() + 86400000))}`,
          `SUMMARY:${escapeICalString(summary)}`,
          `DESCRIPTION:${escapeICalString(description)}`,
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT',
          // リマインダー日数前に通知
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeICalString(`予定取引があります: ${summary}`)}`,
          `TRIGGER:-P${tx.reminderDays}D`,
          'END:VALARM',
          'END:VEVENT'
        )
      }
    }

    calendarLines.push('END:VCALENDAR')

    const icsContent = calendarLines.join('\r\n')

    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="kibo-payment-schedule.ics"',
      },
    })
  } catch (error) {
    console.error('Failed to generate iCal:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
