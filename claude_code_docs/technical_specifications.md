# 技術実装仕様書

## データベース設計

### Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 認証関連（better-auth用）
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?
  baseCurrency  String    @default("JPY")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // リレーション
  accounts             Account[]
  cards               Card[]
  transactions        Transaction[]
  scheduledTx         ScheduledTransaction[]
  categories          Category[]
  budgets             Budget[]
  notificationSettings NotificationSettings[]

  @@map("users")
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// 通貨マスター
model Currency {
  code      String  @id // 'JPY', 'USD', 'EUR'
  symbol    String      // '¥', '$', '€'
  name      String      // '日本円', '米ドル'
  decimals  Int         // 0 for JPY, 2 for USD
  isActive  Boolean @default(true)

  // リレーション
  accounts         Account[]
  transactions     Transaction[]
  scheduledTx      ScheduledTransaction[]
  exchangeRatesFrom ExchangeRate[] @relation("FromCurrency")
  exchangeRatesTo   ExchangeRate[] @relation("ToCurrency")

  @@map("currencies")
}

// 為替レート
model ExchangeRate {
  id           String   @id @default(cuid())
  fromCurrency String
  toCurrency   String
  rate         Decimal  @db.Decimal(15,8)
  timestamp    DateTime @default(now())
  source       String?  // API source name

  // リレーション
  fromCurrencyRef Currency @relation("FromCurrency", fields: [fromCurrency], references: [code])
  toCurrencyRef   Currency @relation("ToCurrency", fields: [toCurrency], references: [code])

  @@unique([fromCurrency, toCurrency, timestamp])
  @@map("exchange_rates")
}

// 口座
model Account {
  id          String      @id @default(cuid())
  name        String
  type        AccountType
  balance     Decimal     @db.Decimal(15,4)
  currency    String
  isActive    Boolean     @default(true)
  description String?
  userId      String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // 定期預金用フィールド
  fixedDepositRate     Decimal?  @db.Decimal(5,4) // 年利率
  fixedDepositMaturity DateTime? // 満期日

  // リレーション
  user            User         @relation(fields: [userId], references: [id])
  currencyRef     Currency     @relation(fields: [currency], references: [code])
  cards           Card[]
  transactions    Transaction[]
  scheduledTx     ScheduledTransaction[]

  @@map("accounts")
}

enum AccountType {
  CASH
  CHECKING
  SAVINGS
  FIXED_DEPOSIT
}

// カード
model Card {
  id           String   @id @default(cuid())
  name         String
  type         CardType
  lastFourDigits String @db.VarChar(4)
  creditLimit  Decimal? @db.Decimal(15,4)
  accountId    String
  userId       String
  isActive     Boolean  @default(true)
  expiryDate   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // リレーション
  user         User          @relation(fields: [userId], references: [id])
  account      Account       @relation(fields: [accountId], references: [id])
  transactions Transaction[]

  @@map("cards")
}

enum CardType {
  CREDIT
  DEBIT
}

// カテゴリ
model Category {
  id          String  @id @default(cuid())
  name        String
  color       String  @default("#6B7280")
  icon        String  @default("tag")
  type        TransactionType
  userId      String
  parentId    String? // サブカテゴリ用
  isActive    Boolean @default(true)

  // リレーション
  user         User          @relation(fields: [userId], references: [id])
  parent       Category?     @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children     Category[]    @relation("CategoryHierarchy")
  transactions Transaction[]
  scheduledTx  ScheduledTransaction[]
  budgets      Budget[]

  @@map("categories")
}

// 取引
model Transaction {
  id          String          @id @default(cuid())
  amount      Decimal         @db.Decimal(15,4)
  currency    String
  type        TransactionType
  description String
  date        DateTime
  accountId   String
  cardId      String?
  categoryId  String?
  userId      String

  // 為替関連
  exchangeRate     Decimal? @db.Decimal(15,8) // 記録時の為替レート
  baseCurrencyAmount Decimal? @db.Decimal(15,4) // 基準通貨での金額

  // メタデータ
  attachments String[] // ファイルパス配列
  tags        String[]
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // リレーション
  user        User      @relation(fields: [userId], references: [id])
  account     Account   @relation(fields: [accountId], references: [id])
  card        Card?     @relation(fields: [cardId], references: [id])
  category    Category? @relation(fields: [categoryId], references: [id])
  currencyRef Currency  @relation(fields: [currency], references: [code])

  @@map("transactions")
}

// 予定取引（重要機能）
model ScheduledTransaction {
  id          String          @id @default(cuid())
  amount      Decimal         @db.Decimal(15,4)
  currency    String
  type        TransactionType
  description String
  accountId   String
  categoryId  String?
  userId      String

  // スケジュール設定
  dueDate     DateTime
  frequency   ScheduleFrequency?
  endDate     DateTime?
  isRecurring Boolean         @default(false)

  // ステータス管理
  status      ScheduledStatus @default(PENDING)
  completedAt DateTime?

  // 通知設定
  reminderDays Int @default(1) // 何日前に通知するか
  isReminderSent Boolean @default(false)

  // メタデータ
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // リレーション
  user        User      @relation(fields: [userId], references: [id])
  account     Account   @relation(fields: [accountId], references: [id])
  category    Category? @relation(fields: [categoryId], references: [id])
  currencyRef Currency  @relation(fields: [currency], references: [code])

  @@map("scheduled_transactions")
}

enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER
}

enum ScheduleFrequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

enum ScheduledStatus {
  PENDING
  COMPLETED
  OVERDUE
  CANCELLED
}

// 予算管理
model Budget {
  id         String   @id @default(cuid())
  name       String
  amount     Decimal  @db.Decimal(15,4)
  currency   String
  categoryId String
  userId     String
  startDate  DateTime
  endDate    DateTime
  isActive   Boolean  @default(true)

  // リレーション
  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@map("budgets")
}

// 通知設定
model NotificationSettings {
  id          String            @id @default(cuid())
  userId      String
  type        NotificationType  @default(DISABLED)

  // Webhook設定
  webhookUrl  String?
  webhookType WebhookType?      // SLACK or DISCORD

  // 通知対象
  scheduledTransactionReminders Boolean @default(true)
  overdueTransactions          Boolean @default(true)
  budgetAlerts                Boolean @default(true)

  // メタデータ
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  // リレーション
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
  @@map("notification_settings")
}

model NotificationLog {
  id              String               @id @default(cuid())
  userId          String
  type            NotificationType
  webhookType     WebhookType?
  title           String
  message         String
  status          NotificationStatus   @default(PENDING)
  scheduledFor    DateTime?
  sentAt          DateTime?
  errorMessage    String?
  retryCount      Int                  @default(0)
  maxRetries      Int                  @default(3)

  // 関連エンティティ
  scheduledTransactionId String?
  budgetId              String?

  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@map("notification_logs")
}

enum NotificationType {
  DISABLED
  WEBHOOK
  EMAIL
}

enum WebhookType {
  SLACK
  DISCORD
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  CANCELLED
}
```

### 環境変数設定

```env
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/kakeibo_db"
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"
EXCHANGE_RATE_API_KEY="your-api-key"
NOTIFICATION_API_KEY="your-notification-api-key-for-cron-jobs"

# Production
# DATABASE_URL="postgresql://prod-connection-string"
# BETTER_AUTH_URL="https://your-domain.com"
# NOTIFICATION_API_KEY="production-api-key"
```

## API設計

### REST API Endpoints

#### 認証

- `POST /api/auth/sign-up` - ユーザー登録
- `POST /api/auth/sign-in` - ログイン
- `POST /api/auth/sign-out` - ログアウト
- `GET /api/auth/session` - セッション取得

#### 通貨・為替

- `GET /api/currencies` - 対応通貨一覧
- `GET /api/exchange-rates` - 最新為替レート
- `POST /api/exchange-rates/refresh` - レート更新

#### 口座管理

- `GET /api/accounts` - 口座一覧
- `POST /api/accounts` - 口座作成
- `PUT /api/accounts/:id` - 口座更新
- `DELETE /api/accounts/:id` - 口座削除
- `GET /api/accounts/:id/balance` - 残高取得

#### カード管理

- `GET /api/cards` - カード一覧
- `POST /api/cards` - カード作成
- `PUT /api/cards/:id` - カード更新
- `DELETE /api/cards/:id` - カード削除

#### 予定取引

- `GET /api/scheduled-transactions` - 予定一覧
- `POST /api/scheduled-transactions` - 予定作成
- `PUT /api/scheduled-transactions/:id` - 予定更新
- `DELETE /api/scheduled-transactions/:id` - 予定削除
- `POST /api/scheduled-transactions/:id/complete` - 予定完了

#### 取引管理

- `GET /api/transactions` - 取引履歴
- `POST /api/transactions` - 取引作成
- `PUT /api/transactions/:id` - 取引更新
- `DELETE /api/transactions/:id` - 取引削除

#### 通知管理 (Phase 6)

- `GET /api/notifications/settings` - 通知設定取得
- `POST /api/notifications/settings` - 通知設定作成・更新
- `DELETE /api/notifications/settings/:id` - 通知設定削除
- `POST /api/notifications/send-reminders` - リマインダー送信（cron用）
- `POST /api/notifications/test` - Webhook テスト送信

### Server Actions

```typescript
// 重要なServer Actions一覧
'use server'

// 口座操作
export async function createAccount(data: CreateAccountData)
export async function updateAccountBalance(accountId: string, amount: number)
export async function transferBetweenAccounts(fromId: string, toId: string, amount: number)

// 予定取引操作
export async function createScheduledTransaction(data: ScheduledTransactionData)
export async function completeScheduledTransaction(id: string)
export async function getUpcomingTransactions(days: number)

// 通貨操作
export async function refreshExchangeRates()
export async function convertCurrency(amount: number, from: string, to: string)
```

## Jotai状態管理設計

### Atoms設計

```typescript
// lib/atoms/index.ts

// 認証状態
export const userAtom = atom<User | null>(null)
export const sessionAtom = atom<Session | null>(null)

// 通貨状態
export const currenciesAtom = atom<Currency[]>([])
export const baseCurrencyAtom = atomWithStorage<string>('baseCurrency', 'JPY')
export const exchangeRatesAtom = atom<ExchangeRate[]>([])

// 口座・カード状態
export const accountsAtom = atom<Account[]>([])
export const cardsAtom = atom<Card[]>([])
export const selectedAccountAtom = atom<string | null>(null)

// 取引状態
export const transactionsAtom = atom<Transaction[]>([])
export const categoriesAtom = atom<Category[]>([])

// 予定取引状態
export const scheduledTransactionsAtom = atom<ScheduledTransaction[]>([])
export const upcomingTransactionsAtom = atom<ScheduledTransaction[]>([])

// UI状態
export const sidebarOpenAtom = atom<boolean>(false)
export const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light')
export const loadingStatesAtom = atom<Record<string, boolean>>({})

// 計算されたAtoms（Derived Atoms）
export const totalAssetsAtom = atom((get) => {
  const accounts = get(accountsAtom)
  const rates = get(exchangeRatesAtom)
  const baseCurrency = get(baseCurrencyAtom)

  return accounts.reduce((total, account) => {
    if (account.currency === baseCurrency) {
      return total + Number(account.balance)
    }

    const rate =
      rates.find((r) => r.fromCurrency === account.currency && r.toCurrency === baseCurrency)
        ?.rate || 1

    return total + Number(account.balance) * Number(rate)
  }, 0)
})

export const overdueTransactionsAtom = atom((get) => {
  const scheduled = get(scheduledTransactionsAtom)
  const now = new Date()

  return scheduled.filter((tx) => tx.status === 'PENDING' && new Date(tx.dueDate) < now)
})

export const accountsByCurrencyAtom = atom((get) => {
  const accounts = get(accountsAtom)
  return accounts.reduce(
    (acc, account) => {
      if (!acc[account.currency]) {
        acc[account.currency] = []
      }
      acc[account.currency].push(account)
      return acc
    },
    {} as Record<string, Account[]>
  )
})
```

### カスタムHooks

```typescript
// lib/hooks/useAccounts.ts
export function useAccounts() {
  const [accounts, setAccounts] = useAtom(accountsAtom)
  const [loading, setLoading] = useAtom(
    focusAtom(loadingStatesAtom, (optic) => optic.prop('accounts'))
  )

  const createAccount = useCallback(
    async (data: CreateAccountData) => {
      setLoading(true)
      try {
        const newAccount = await createAccountAction(data)
        setAccounts((prev) => [...prev, newAccount])
        return newAccount
      } finally {
        setLoading(false)
      }
    },
    [setAccounts, setLoading]
  )

  const updateAccount = useCallback(
    async (id: string, data: UpdateAccountData) => {
      setLoading(true)
      try {
        const updated = await updateAccountAction(id, data)
        setAccounts((prev) => prev.map((acc) => (acc.id === id ? updated : acc)))
        return updated
      } finally {
        setLoading(false)
      }
    },
    [setAccounts, setLoading]
  )

  return {
    accounts,
    loading,
    createAccount,
    updateAccount,
  }
}

// lib/hooks/useCurrency.ts
export function useCurrency() {
  const [baseCurrency] = useAtom(baseCurrencyAtom)
  const [exchangeRates] = useAtom(exchangeRatesAtom)

  const convertToBase = useCallback(
    (amount: number, fromCurrency: string) => {
      if (fromCurrency === baseCurrency) return amount

      const rate = exchangeRates.find(
        (r) => r.fromCurrency === fromCurrency && r.toCurrency === baseCurrency
      )?.rate

      return rate ? amount * Number(rate) : amount
    },
    [baseCurrency, exchangeRates]
  )

  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }, [])

  return {
    baseCurrency,
    convertToBase,
    formatCurrency,
  }
}
```

## API実装仕様

### Exchange Rate API Integration

```typescript
// lib/services/exchangeRate.ts
import { Decimal } from 'decimal.js'

export class ExchangeRateService {
  private static readonly API_URL = 'https://api.exchangerate-api.com/v4/latest'

  static async fetchRates(baseCurrency: string = 'JPY'): Promise<ExchangeRate[]> {
    try {
      const response = await fetch(`${this.API_URL}/${baseCurrency}`, {
        next: { revalidate: 3600 }, // 1時間キャッシュ
      })

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates')
      }

      const data = await response.json()

      return Object.entries(data.rates).map(([currency, rate]) => ({
        id: `${baseCurrency}-${currency}-${Date.now()}`,
        fromCurrency: baseCurrency,
        toCurrency: currency,
        rate: new Decimal(rate as number),
        timestamp: new Date(),
        source: 'exchangerate-api',
      }))
    } catch (error) {
      console.error('Exchange rate fetch error:', error)
      throw error
    }
  }

  static async updateRatesInDB(): Promise<void> {
    const rates = await this.fetchRates()

    for (const rate of rates) {
      await prisma.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency_timestamp: {
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
            timestamp: rate.timestamp,
          },
        },
        update: { rate: rate.rate },
        create: rate,
      })
    }
  }
}
```

### API Route Examples

```typescript
// app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CASH', 'CHECKING', 'SAVINGS', 'FIXED_DEPOSIT']),
  balance: z.number().min(0),
  currency: z.string().length(3),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      include: { currencyRef: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAccountSchema.parse(body)

    const account = await prisma.account.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
      include: { currencyRef: true },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
```

## 通知システム (Phase 6)

### 概要

kiBoアプリの通知システムは、予定取引のリマインダーや期限切れ通知をSlackやDiscordに送信する機能を提供します。

### 機能仕様

#### 1. 通知タイプ

- **予定取引リマインダー**: 設定した日数前に予定取引を通知
- **期限切れ通知**: 期限を過ぎた予定取引の通知
- **予算アラート**: 予算超過警告（将来実装予定）

#### 2. 配信方法

- **Slack Webhook**: Slack Incoming Webhookを使用
- **Discord Webhook**: Discord Webhook URLを使用
- **メール通知**: 将来実装予定

### アーキテクチャ

#### データベース設計

```typescript
// 通知設定モデル
model NotificationSettings {
  id          String            @id @default(cuid())
  userId      String
  type        NotificationType  @default(DISABLED) // DISABLED, WEBHOOK, EMAIL

  // Webhook設定
  webhookUrl  String?
  webhookType WebhookType?      // SLACK or DISCORD

  // 通知対象
  scheduledTransactionReminders Boolean @default(true)
  overdueTransactions          Boolean @default(true)
  budgetAlerts                Boolean @default(true)

  // メタデータ
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
}

// 通知ログモデル
model NotificationLog {
  id              String               @id @default(cuid())
  userId          String
  type            NotificationType
  webhookType     WebhookType?
  title           String
  message         String
  status          NotificationStatus   @default(PENDING) // PENDING, SENT, FAILED, CANCELLED
  scheduledFor    DateTime?
  sentAt          DateTime?
  errorMessage    String?
  retryCount      Int                  @default(0)
  maxRetries      Int                  @default(3)

  // 関連エンティティ
  scheduledTransactionId String?
  budgetId              String?

  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
}
```

#### サービスクラス

```typescript
// WebhookNotificationService
export class WebhookNotificationService {
  // Slack通知送信
  static async sendSlackNotification(
    webhookUrl: string,
    payload: NotificationPayload
  ): Promise<boolean>

  // Discord通知送信
  static async sendDiscordNotification(
    webhookUrl: string,
    payload: NotificationPayload
  ): Promise<boolean>

  // 汎用Webhook送信
  static async sendWebhookNotification(
    webhookUrl: string,
    webhookType: WebhookType,
    payload: NotificationPayload
  ): Promise<boolean>
}

// ReminderService
export class ReminderService {
  // 送信待ちリマインダー取得
  static async getPendingReminders(): Promise<ScheduledTransaction[]>

  // 期限切れ取引取得
  static async getOverdueTransactions(): Promise<ScheduledTransaction[]>

  // リマインダー送信処理
  static async sendReminders(): Promise<void>

  // 全通知処理実行
  static async processAllNotifications(): Promise<void>
}
```

### API実装

#### 通知設定管理

```typescript
// GET /api/notifications/settings
export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.notificationSettings.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(settings)
}

// POST /api/notifications/settings
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Webhook URL形式バリデーション
  if (body.type === 'WEBHOOK' && body.webhookUrl) {
    const isValidWebhookUrl = await WebhookNotificationService.validateWebhookUrl(
      body.webhookUrl,
      body.webhookType
    )

    if (!isValidWebhookUrl) {
      return NextResponse.json({ error: 'Invalid webhook URL format' }, { status: 400 })
    }
  }

  // 設定保存またはupsert
  const settings = await prisma.notificationSettings.upsert({
    where: {
      userId_type: {
        userId: session.user.id,
        type: body.type,
      },
    },
    create: {
      userId: session.user.id,
      ...body,
    },
    update: body,
  })

  return NextResponse.json(settings, { status: 201 })
}
```

#### リマインダー処理API

```typescript
// POST /api/notifications/send-reminders
export async function POST(request: Request) {
  // API Key または セッション認証
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (apiKey) {
    // Cron job からのAPI Key認証
    if (apiKey !== process.env.NOTIFICATION_API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
  } else {
    // セッション認証
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    await ReminderService.processAllNotifications()
    return NextResponse.json({
      success: true,
      message: 'Notifications processed successfully',
    })
  } catch (error) {
    console.error('Failed to process notifications:', error)
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 })
  }
}
```

### UI コンポーネント

#### 通知設定画面

```typescript
// components/notifications/NotificationSettings.tsx
export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 設定取得
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const response = await fetch('/api/notifications/settings')
    if (response.ok) {
      const data = await response.json()
      setSettings(data)
    }
  }

  // Webhook設定保存
  const handleSaveWebhook = async (data: WebhookData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WEBHOOK',
          webhookType: data.type,
          webhookUrl: data.url,
          scheduledTransactionReminders: data.reminders,
          overdueTransactions: data.overdue,
          budgetAlerts: data.budgets
        })
      })

      if (response.ok) {
        toast.success('Webhook設定を保存しました')
        fetchSettings()
      } else {
        const error = await response.json()
        toast.error(error.error || '設定の保存に失敗しました')
      }
    } catch (error) {
      toast.error('設定の保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // テスト送信
  const handleTestWebhook = async (webhookUrl: string, webhookType: WebhookType) => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, webhookType })
      })

      if (response.ok) {
        toast.success('テスト通知を送信しました')
      } else {
        toast.error('テスト送信に失敗しました')
      }
    } catch (error) {
      toast.error('テスト送信に失敗しました')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          通知設定
        </CardTitle>
        <CardDescription>
          SlackやDiscordに予定取引のリマインダーを送信する設定
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Webhook設定UI */}
        <WebhookConfigForm
          onSave={handleSaveWebhook}
          onTest={handleTestWebhook}
          isLoading={isLoading}
        />

        {/* 設定済みWebhook一覧 */}
        <WebhookList
          settings={settings}
          onDelete={handleDeleteWebhook}
          onToggle={handleToggleWebhook}
        />
      </CardContent>
    </Card>
  )
}
```

### Cron Job 統合

定期実行はプラットフォーム別に設定が必要です。詳細は `DEPLOYMENT.md` を参照してください。

#### プラットフォーム別設定例

**Vercel:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/notifications/send-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**外部Cronサービス:**

- EasyCron, cron-job.org などの外部サービスを利用
- Webhook形式でAPIエンドポイントを定期実行

**自前サーバー:**

```bash
# crontab設定
0 9 * * * curl -X POST -H "Authorization: Bearer $API_KEY" https://your-domain.com/api/notifications/send-reminders
```

#### 手動実行（開発時）

```bash
# ローカル開発環境での手動実行
curl -X POST http://localhost:3001/api/notifications/send-reminders \
  -H "Authorization: Bearer your-notification-api-key"

# 本番環境での手動実行
curl -X POST https://your-domain.com/api/notifications/send-reminders \
  -H "Authorization: Bearer production-api-key"
```

### テスト

#### 単体テスト

```typescript
// __tests__/api/notifications.test.ts
describe('Notification API', () => {
  describe('POST /api/notifications/settings', () => {
    it('should create webhook settings successfully', async () => {
      const response = await POST(
        mockRequest({
          type: 'WEBHOOK',
          webhookType: 'SLACK',
          webhookUrl:
            'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
          scheduledTransactionReminders: true,
          overdueTransactions: true,
          budgetAlerts: false,
        })
      )

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.type).toBe('WEBHOOK')
      expect(data.webhookType).toBe('SLACK')
    })

    it('should validate webhook URL format', async () => {
      const response = await POST(
        mockRequest({
          type: 'WEBHOOK',
          webhookType: 'SLACK',
          webhookUrl: 'invalid-url',
          scheduledTransactionReminders: true,
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid webhook URL format')
    })
  })

  describe('POST /api/notifications/send-reminders', () => {
    it('should process reminders with valid API key', async () => {
      const response = await POST(mockRequestWithAuth('valid-api-key'))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should reject invalid API key', async () => {
      const response = await POST(mockRequestWithAuth('invalid-key'))

      expect(response.status).toBe(401)
    })
  })
})
```

### セキュリティ考慮事項

1. **API Key保護**: `NOTIFICATION_API_KEY`は環境変数で管理
2. **Webhook URL検証**: URLの形式とアクセス可能性をテスト送信で確認
3. **レート制限**: 通知送信の頻度制限を実装
4. **ログ記録**: 全ての通知送信ログを記録・追跡
5. **エラーハンドリング**: リトライ機構と失敗時の適切な処理

### 運用監視

- 通知送信成功・失敗率の監視
- Webhook URLの有効性確認
- リトライ処理の動作監視
- ユーザー別通知設定の使用状況

## ファイル構造

```
kakeibo-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── dashboard/
│   │   ├── accounts/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── cards/
│   │   │   ├── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── scheduled/
│   │   │   ├── page.tsx
│   │   │   ├── income/
│   │   │   │   └── page.tsx
│   │   │   └── expenses/
│   │   │       └── page.tsx
│   │   ├── transactions/
│   │   │   ├── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   └── notifications/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all]/
│   │   │       └── route.ts
│   │   ├── accounts/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── cards/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── scheduled-transactions/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── upcoming/
│   │   │       └── route.ts
│   │   ├── transactions/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── exchange-rates/
│   │   │   ├── route.ts
│   │   │   └── refresh/
│   │   │       └── route.ts
│   │   ├── notifications/
│   │   │   ├── settings/
│   │   │   │   └── route.ts
│   │   │   ├── send-reminders/
│   │   │   │   └── route.ts
│   │   │   └── test/
│   │   │       └── route.ts
│   │   └── currencies/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── not-found.tsx
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthProvider.tsx
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── AccountCard.tsx
│   │   ├── BalanceSummary.tsx
│   │   └── QuickActions.tsx
│   ├── accounts/
│   │   ├── AccountList.tsx
│   │   ├── AccountForm.tsx
│   │   └── AccountDetail.tsx
│   ├── cards/
│   │   ├── CardList.tsx
│   │   └── CardForm.tsx
│   ├── scheduled/
│   │   ├── ScheduledList.tsx
│   │   ├── ScheduledForm.tsx
│   │   ├── UpcomingTransactions.tsx
│   │   └── Calendar.tsx
│   ├── transactions/
│   │   ├── TransactionList.tsx
│   │   ├── TransactionForm.tsx
│   │   └── TransactionFilters.tsx
│   ├── currency/
│   │   ├── CurrencySelector.tsx
│   │   ├── ExchangeRateDisplay.tsx
│   │   └── CurrencyConverter.tsx
│   ├── notifications/
│   │   ├── NotificationSettings.tsx
│   │   ├── WebhookConfigForm.tsx
│   │   └── WebhookList.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
├── __tests__/
│   ├── api/
│   │   ├── notifications.test.ts
│   │   ├── accounts.test.ts
│   │   └── auth.test.ts
│   ├── lib/
│   │   ├── notifications/
│   │   │   ├── webhook-service.test.ts
│   │   │   └── reminder-service.test.ts
│   │   ├── auth.test.ts
│   │   ├── db.test.ts
│   │   └── utils.test.ts
│   ├── config.test.ts
│   └── schema.test.ts
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── validations/
│   │   ├── account.ts
│   │   ├── card.ts
│   │   └── transaction.ts
│   ├── atoms/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── accounts.ts
│   │   ├── currency.ts
│   │   └── transactions.ts
│   ├── hooks/
│   │   ├── useAccounts.ts
│   │   ├── useCards.ts
│   │   ├── useCurrency.ts
│   │   └── useScheduled.ts
│   ├── services/
│   │   ├── exchangeRate.ts
│   │   ├── account.ts
│   │   └── notification.ts
│   ├── notifications/
│   │   ├── webhook-service.ts
│   │   └── reminder-service.ts
│   ├── utils/
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   └── actions/
│       ├── account.ts
│       ├── card.ts
│       ├── transaction.ts
│       └── scheduled.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
├── biome.json
├── tailwind.config.js
├── next.config.js
├── package.json
├── tsconfig.json
├── DEPLOYMENT.md      # Multi-platform deployment guide
└── CLAUDE.md          # Development guidelines
```

## 開発開始時の設定ファイル

### Next.js設定

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
```

### TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

この技術仕様書により、Claude Codeは具体的な実装作業を効率的に進められます。次に、初期設定とセットアップの詳細手順書を作成します。
