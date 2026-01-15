# 口座間振替機能 - 詳細設計仕様

## 概要

口座間振替は家計簿アプリにとって重要な機能です。現金から銀行口座への入金、口座間の資金移動、異なる通貨間の振替などに対応する必要があります。

## 振替の種類

### 1. 同一通貨間振替

- 現金 → 銀行口座
- 普通預金 → 貯蓄預金
- 口座A → 口座B（同じ通貨）

### 2. 異なる通貨間振替

- JPY口座 → USD口座
- 現金（JPY） → 外貨預金（USD）
- 外貨預金間の振替

### 3. 手数料を伴う振替

- 振込手数料
- 外貨両替手数料
- ATM利用手数料

## データベース設計更新

### Transaction拡張

```prisma
// prisma/schema.prisma - Transaction拡張
model Transaction {
  id          String          @id @default(cuid())
  amount      Decimal         @db.Decimal(15,4)
  currency    String
  type        TransactionType
  description String
  date        DateTime
  accountId   String          // 基本となる口座
  cardId      String?
  categoryId  String?
  userId      String

  // 振替機能用フィールド
  transferToAccountId   String?  // 振替先口座ID
  transferFromAccountId String?  // 振替元口座ID（明示的）
  transferAmount       Decimal? @db.Decimal(15,4) // 振替先での金額
  transferCurrency     String?  // 振替先通貨
  exchangeRateUsed     Decimal? @db.Decimal(15,8) // 使用した為替レート
  transferFee          Decimal? @db.Decimal(15,4) // 手数料
  transferFeeAccountId String?  // 手数料を差し引く口座
  isTransfer          Boolean  @default(false)   // 振替取引フラグ
  transferPairId      String?  // 対となる取引のID

  // 既存フィールド
  exchangeRate         Decimal? @db.Decimal(15,8)
  baseCurrencyAmount   Decimal? @db.Decimal(15,4)
  attachments          String[]
  tags                 String[]
  notes                String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // リレーション
  user                 User      @relation(fields: [userId], references: [id])
  account              Account   @relation(fields: [accountId], references: [id])
  card                 Card?     @relation(fields: [cardId], references: [id])
  category             Category? @relation(fields: [categoryId], references: [id])
  currencyRef          Currency  @relation(fields: [currency], references: [code])

  // 振替用リレーション
  transferToAccount    Account?  @relation("TransferTo", fields: [transferToAccountId], references: [id])
  transferFromAccount  Account?  @relation("TransferFrom", fields: [transferFromAccountId], references: [id])
  transferFeeAccount   Account?  @relation("TransferFee", fields: [transferFeeAccountId], references: [id])
  transferPair         Transaction? @relation("TransferPair", fields: [transferPairId], references: [id])
  transferPairReverse  Transaction? @relation("TransferPair")

  @@map("transactions")
}

// Accountモデルにリレーション追加
model Account {
  // 既存フィールド...

  // リレーション追加
  transfersTo          Transaction[] @relation("TransferTo")
  transfersFrom        Transaction[] @relation("TransferFrom")
  transferFees         Transaction[] @relation("TransferFee")
}

enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER    // 既存
}
```

## 振替処理のビジネスロジック

### 1. 同一通貨間振替

```typescript
// lib/services/transfer.ts
import { Decimal } from 'decimal.js'
import { prisma } from '@/lib/db'
import { CurrencyCalculator } from '@/lib/utils/currency'

export interface TransferData {
  fromAccountId: string
  toAccountId: string
  amount: number
  description: string
  date: Date
  fee?: number
  feeAccountId?: string // 手数料を差し引く口座（通常は振替元）
  notes?: string
}

export interface CurrencyTransferData extends TransferData {
  fromCurrency: string
  toCurrency: string
  exchangeRate: number // 手動入力または自動取得
  toAmount: number // 振替先での受取金額
}

export class TransferService {
  /**
   * 同一通貨間振替
   */
  static async createSameCurrencyTransfer(
    userId: string,
    data: TransferData
  ): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    return await prisma.$transaction(async (tx) => {
      // 振替元口座の残高確認
      const fromAccount = await tx.account.findFirst({
        where: { id: data.fromAccountId, userId },
      })

      if (!fromAccount) {
        throw new Error('振替元口座が見つかりません')
      }

      const totalAmount = CurrencyCalculator.add(data.amount, data.fee || 0)
      if (Number(fromAccount.balance) < totalAmount) {
        throw new Error('残高が不足しています')
      }

      // 振替先口座の確認
      const toAccount = await tx.account.findFirst({
        where: { id: data.toAccountId, userId },
      })

      if (!toAccount) {
        throw new Error('振替先口座が見つかりません')
      }

      if (fromAccount.currency !== toAccount.currency) {
        throw new Error('通貨が異なる口座間の振替です。通貨間振替機能を使用してください')
      }

      // 振替元取引作成（支出）
      const fromTransaction = await tx.transaction.create({
        data: {
          amount: new Decimal(data.amount),
          currency: fromAccount.currency,
          type: 'TRANSFER',
          description: `${data.description} (→ ${toAccount.name})`,
          date: data.date,
          accountId: data.fromAccountId,
          userId,
          isTransfer: true,
          transferToAccountId: data.toAccountId,
          transferFromAccountId: data.fromAccountId,
          transferAmount: new Decimal(data.amount),
          transferCurrency: toAccount.currency,
          transferFee: data.fee ? new Decimal(data.fee) : null,
          transferFeeAccountId: data.feeAccountId || data.fromAccountId,
          notes: data.notes,
        },
      })

      // 振替先取引作成（収入）
      const toTransaction = await tx.transaction.create({
        data: {
          amount: new Decimal(data.amount),
          currency: toAccount.currency,
          type: 'TRANSFER',
          description: `${data.description} (← ${fromAccount.name})`,
          date: data.date,
          accountId: data.toAccountId,
          userId,
          isTransfer: true,
          transferToAccountId: data.toAccountId,
          transferFromAccountId: data.fromAccountId,
          transferAmount: new Decimal(data.amount),
          transferCurrency: toAccount.currency,
          transferPairId: fromTransaction.id,
          notes: data.notes,
        },
      })

      // 振替元取引に対となる取引IDを設定
      await tx.transaction.update({
        where: { id: fromTransaction.id },
        data: { transferPairId: toTransaction.id },
      })

      // 口座残高更新
      await tx.account.update({
        where: { id: data.fromAccountId },
        data: {
          balance: {
            decrement: totalAmount,
          },
        },
      })

      await tx.account.update({
        where: { id: data.toAccountId },
        data: {
          balance: {
            increment: data.amount,
          },
        },
      })

      // 手数料処理（振替元口座と異なる場合）
      if (data.fee && data.feeAccountId && data.feeAccountId !== data.fromAccountId) {
        await tx.transaction.create({
          data: {
            amount: new Decimal(data.fee),
            currency: fromAccount.currency,
            type: 'EXPENSE',
            description: `振替手数料 - ${data.description}`,
            date: data.date,
            accountId: data.feeAccountId,
            userId,
          },
        })

        await tx.account.update({
          where: { id: data.feeAccountId },
          data: {
            balance: { decrement: data.fee },
          },
        })
      }

      return { fromTransaction, toTransaction }
    })
  }

  /**
   * 異なる通貨間振替
   */
  static async createCurrencyTransfer(
    userId: string,
    data: CurrencyTransferData
  ): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    return await prisma.$transaction(async (tx) => {
      // 口座確認
      const fromAccount = await tx.account.findFirst({
        where: { id: data.fromAccountId, userId },
      })

      const toAccount = await tx.account.findFirst({
        where: { id: data.toAccountId, userId },
      })

      if (!fromAccount || !toAccount) {
        throw new Error('口座が見つかりません')
      }

      // 残高確認
      const totalAmount = CurrencyCalculator.add(data.amount, data.fee || 0)
      if (Number(fromAccount.balance) < totalAmount) {
        throw new Error('残高が不足しています')
      }

      // 振替元取引作成
      const fromTransaction = await tx.transaction.create({
        data: {
          amount: new Decimal(data.amount),
          currency: data.fromCurrency,
          type: 'TRANSFER',
          description: `${data.description} (→ ${toAccount.name})`,
          date: data.date,
          accountId: data.fromAccountId,
          userId,
          isTransfer: true,
          transferToAccountId: data.toAccountId,
          transferFromAccountId: data.fromAccountId,
          transferAmount: new Decimal(data.toAmount),
          transferCurrency: data.toCurrency,
          exchangeRateUsed: new Decimal(data.exchangeRate),
          transferFee: data.fee ? new Decimal(data.fee) : null,
          transferFeeAccountId: data.feeAccountId || data.fromAccountId,
          notes: data.notes,
        },
      })

      // 振替先取引作成
      const toTransaction = await tx.transaction.create({
        data: {
          amount: new Decimal(data.toAmount),
          currency: data.toCurrency,
          type: 'TRANSFER',
          description: `${data.description} (← ${fromAccount.name})`,
          date: data.date,
          accountId: data.toAccountId,
          userId,
          isTransfer: true,
          transferToAccountId: data.toAccountId,
          transferFromAccountId: data.fromAccountId,
          transferAmount: new Decimal(data.toAmount),
          transferCurrency: data.toCurrency,
          exchangeRateUsed: new Decimal(data.exchangeRate),
          transferPairId: fromTransaction.id,
          notes: data.notes,
        },
      })

      // ペア関係設定
      await tx.transaction.update({
        where: { id: fromTransaction.id },
        data: { transferPairId: toTransaction.id },
      })

      // 残高更新
      await tx.account.update({
        where: { id: data.fromAccountId },
        data: { balance: { decrement: totalAmount } },
      })

      await tx.account.update({
        where: { id: data.toAccountId },
        data: { balance: { increment: data.toAmount } },
      })

      return { fromTransaction, toTransaction }
    })
  }
}
```

## UI コンポーネント設計

### 振替フォームコンポーネント

```typescript
// components/transfers/TransferForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { accountsAtom, exchangeRateMapAtom } from '@/lib/atoms'
import { CurrencyCalculator } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowRightLeft, Calculator } from 'lucide-react'

interface TransferFormData {
  fromAccountId: string
  toAccountId: string
  amount: number
  description: string
  date: Date
  fee: number
  feeAccountId: string
  notes: string
  useCustomRate: boolean
  customRate: number
}

export function TransferForm({ onSubmit }: { onSubmit: (data: TransferFormData) => void }) {
  const accounts = useAtomValue(accountsAtom)
  const rateMap = useAtomValue(exchangeRateMapAtom)

  const [formData, setFormData] = useState<TransferFormData>({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
    date: new Date(),
    fee: 0,
    feeAccountId: '',
    notes: '',
    useCustomRate: false,
    customRate: 1,
  })

  const [calculatedAmount, setCalculatedAmount] = useState(0)
  const [isDifferentCurrency, setIsDifferentCurrency] = useState(false)

  const fromAccount = accounts.find(a => a.id === formData.fromAccountId)
  const toAccount = accounts.find(a => a.id === formData.toAccountId)

  // 通貨が異なるかチェック
  useEffect(() => {
    if (fromAccount && toAccount) {
      setIsDifferentCurrency(fromAccount.currency !== toAccount.currency)
      setFormData(prev => ({ ...prev, feeAccountId: prev.feeAccountId || fromAccount.id }))
    }
  }, [fromAccount, toAccount])

  // 金額自動計算
  useEffect(() => {
    if (fromAccount && toAccount && formData.amount > 0) {
      if (isDifferentCurrency) {
        const rate = formData.useCustomRate
          ? formData.customRate
          : rateMap.get(`${fromAccount.currency}-${toAccount.currency}`) || 1

        setCalculatedAmount(CurrencyCalculator.multiply(formData.amount, rate))
      } else {
        setCalculatedAmount(formData.amount)
      }
    }
  }, [formData.amount, fromAccount, toAccount, isDifferentCurrency, formData.useCustomRate, formData.customRate, rateMap])

  const handleSwapAccounts = () => {
    setFormData(prev => ({
      ...prev,
      fromAccountId: prev.toAccountId,
      toAccountId: prev.fromAccountId,
    }))
  }

  const getCurrentRate = () => {
    if (!fromAccount || !toAccount || !isDifferentCurrency) return 1
    return rateMap.get(`${fromAccount.currency}-${toAccount.currency}`) || 1
  }

  const canTransfer = fromAccount && toAccount && formData.amount > 0 &&
    Number(fromAccount.balance) >= (formData.amount + formData.fee)

  return (
    <Card>
      <CardHeader>
        <CardTitle>口座間振替</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 口座選択 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>振替元口座</Label>
            <Select
              value={formData.fromAccountId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, fromAccountId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="口座を選択" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currency} {CurrencyCalculator.formatCurrency(Number(account.balance), account.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSwapAccounts}
              disabled={!formData.fromAccountId || !formData.toAccountId}
              className="rounded-full"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>振替先口座</Label>
            <Select
              value={formData.toAccountId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, toAccountId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="口座を選択" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter(account => account.id !== formData.fromAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 金額入力 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>振替金額</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              placeholder="金額を入力"
            />
            {fromAccount && (
              <div className="text-sm text-gray-600">
                残高: {CurrencyCalculator.formatCurrency(Number(fromAccount.balance), fromAccount.currency)}
              </div>
            )}
          </div>

          {isDifferentCurrency && (
            <div className="space-y-2">
              <Label>受取金額</Label>
              <div className="p-3 bg-gray-50 rounded border">
                {toAccount && (
                  <div className="text-lg font-medium">
                    {CurrencyCalculator.formatCurrency(calculatedAmount, toAccount.currency)}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  レート: 1 {fromAccount?.currency} = {getCurrentRate()} {toAccount?.currency}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* カスタムレート（通貨間振替時） */}
        {isDifferentCurrency && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.useCustomRate}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useCustomRate: checked }))}
              />
              <Label>カスタム為替レートを使用</Label>
            </div>

            {formData.useCustomRate && (
              <div className="space-y-2">
                <Label>為替レート</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={formData.customRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, customRate: Number(e.target.value) }))}
                />
                <div className="text-sm text-gray-600">
                  1 {fromAccount?.currency} = {formData.customRate} {toAccount?.currency}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 手数料 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>手数料</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.fee || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, fee: Number(e.target.value) }))}
              placeholder="手数料（任意）"
            />
          </div>

          {formData.fee > 0 && (
            <div className="space-y-2">
              <Label>手数料支払口座</Label>
              <Select
                value={formData.feeAccountId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, feeAccountId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 説明・メモ */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>説明</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="振替の説明を入力"
            />
          </div>

          <div className="space-y-2">
            <Label>メモ（任意）</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="メモを入力"
              rows={3}
            />
          </div>
        </div>

        {/* 実行ボタン */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            onClick={() => onSubmit(formData)}
            disabled={!canTransfer}
            className="min-w-32"
          >
            <Calculator className="w-4 h-4 mr-2" />
            振替実行
          </Button>
        </div>

        {/* 警告表示 */}
        {fromAccount && formData.amount > 0 &&
         Number(fromAccount.balance) < (formData.amount + formData.fee) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            残高が不足しています。振替金額と手数料の合計が残高を超えています。
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## Server Actions

```typescript
// lib/actions/transfers.ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { TransferService } from '@/lib/services/transfer'
import type { TransferData, CurrencyTransferData } from '@/lib/services/transfer'

export async function createTransferAction(data: TransferData) {
  const session = await auth.api.getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const result = await TransferService.createSameCurrencyTransfer(session.user.id, data)

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard')

  return result
}

export async function createCurrencyTransferAction(data: CurrencyTransferData) {
  const session = await auth.api.getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const result = await TransferService.createCurrencyTransfer(session.user.id, data)

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard')

  return result
}
```

## Jotai Atoms追加

```typescript
// lib/atoms/transfers.ts
import { atom } from 'jotai'
import type { Transaction } from '@prisma/client'

// 振替取引のフィルタリング
export const transferTransactionsAtom = atom((get) => {
  const transactions = get(transactionsAtom)
  return transactions.filter((tx) => tx.isTransfer)
})

// 振替ペアの取得
export const getTransferPairAtom = atom(null, (get, set, transactionId: string) => {
  const transactions = get(transactionsAtom)
  const transaction = transactions.find((tx) => tx.id === transactionId)

  if (!transaction?.transferPairId) return null

  return transactions.find((tx) => tx.id === transaction.transferPairId) || null
})
```

## API Routes

```typescript
// app/api/transfers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { TransferService } from '@/lib/services/transfer'
import { createTransferSchema, createCurrencyTransferSchema } from '@/lib/validations/transfer'
import { handleApiError } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 通貨間振替か同一通貨振替かを判定
    if (body.fromCurrency && body.toCurrency && body.fromCurrency !== body.toCurrency) {
      const validatedData = createCurrencyTransferSchema.parse(body)
      const result = await TransferService.createCurrencyTransfer(session.user.id, validatedData)
      return NextResponse.json(result, { status: 201 })
    } else {
      const validatedData = createTransferSchema.parse(body)
      const result = await TransferService.createSameCurrencyTransfer(
        session.user.id,
        validatedData
      )
      return NextResponse.json(result, { status: 201 })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
```

## バリデーションスキーマ

```typescript
// lib/validations/transfer.ts
import { z } from 'zod'

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().cuid('有効な振替元口座を選択してください'),
    toAccountId: z.string().cuid('有効な振替先口座を選択してください'),
    amount: z.number().positive('金額は正の数で入力してください'),
    description: z.string().min(1, '説明は必須です').max(200),
    date: z.date(),
    fee: z.number().min(0).optional(),
    feeAccountId: z.string().cuid().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: '振替元と振替先は異なる口座を選択してください',
    path: ['toAccountId'],
  })

export const createCurrencyTransferSchema = createTransferSchema.extend({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  exchangeRate: z.number().positive('為替レートは正の数で入力してください'),
  toAmount: z.number().positive('受取金額は正の数で入力してください'),
})

export type CreateTransferData = z.infer<typeof createTransferSchema>
export type CreateCurrencyTransferData = z.infer<typeof createCurrencyTransferSchema>
```

## 振替履歴表示コンポーネント

```typescript
// components/transfers/TransferHistory.tsx
'use client'

import { useAtomValue } from 'jotai'
import { transferTransactionsAtom } from '@/lib/atoms/transfers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRightLeft } from 'lucide-react'
import { CurrencyCalculator } from '@/lib/utils/currency'
import { formatDate } from 'date-fns'

export function TransferHistory() {
  const transfers = useAtomValue(transferTransactionsAtom)

  // 振替ペアをグループ化
  const groupedTransfers = transfers.reduce((acc, transfer) => {
    if (!transfer.transferPairId) return acc

    const existingGroup = acc.find(group =>
      group.some(tx => tx.id === transfer.transferPairId || tx.transferPairId === transfer.id)
    )

    if (existingGroup) {
      existingGroup.push(transfer)
    } else {
      acc.push([transfer])
    }

    return acc
  }, [] as Transaction[][])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ArrowRightLeft className="w-5 h-5 mr-2" />
          振替履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        {groupedTransfers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">振替履歴はありません</p>
        ) : (
          <div className="space-y-4">
            {groupedTransfers.map((pair, index) => {
              const fromTx = pair.find(tx => tx.transferFromAccountId === tx.accountId)
              const toTx = pair.find(tx => tx.transferToAccountId === tx.accountId)

              if (!fromTx || !toTx) return null

              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">
                      {formatDate(new Date(fromTx.date), 'yyyy/MM/dd HH:mm')}
                    </div>
                    {fromTx.transferFee && Number(fromTx.transferFee) > 0 && (
                      <Badge variant="outline">
                        手数料: {CurrencyCalculator.formatCurrency(Number(fromTx.transferFee), fromTx.currency)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">振替元</div>
                      <div className="font-medium">{fromTx.account.name}</div>
                      <div className="text-red-600">
                        -{CurrencyCalculator.formatCurrency(Number(fromTx.amount), fromTx.currency)}
                      </div>
                    </div>

                    <div className="text-center">
                      <ArrowRightLeft className="w-6 h-6 mx-auto text-gray-400" />
                      <div className="text-sm mt-1">{fromTx.description}</div>
                      {fromTx.exchangeRateUsed && (
                        <div className="text-xs text-gray-500">
                          レート: {Number(fromTx.exchangeRateUsed)}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-gray-600">振替先</div>
                      <div className="font-medium">{toTx.account.name}</div>
                      <div className="text-green-600">
                        +{CurrencyCalculator.formatCurrency(Number(toTx.amount), toTx.currency)}
                      </div>
                    </div>
                  </div>

                  {fromTx.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      {fromTx.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

これで口座間振替機能が完全に対応できます。主な特徴：

## 🔧 実装される機能

1. **同一通貨間振替** - 手数料対応
2. **異なる通貨間振替** - 為替レート自動計算・手動設定
3. **振替ペア管理** - 関連取引の自動リンク
4. **残高自動更新** - トランザクション処理による整合性保証
5. **振替履歴表示** - ペア表示で分かりやすい履歴

## 📊 データ整合性

- データベーストランザクションによる原子性保証
- 振替ペアIDによる関連取引の追跡
- 残高不足チェック
- 通貨間換算の記録

この設計により、複雑な振替処理にも対応できる堅牢な家計簿アプリが構築できます。
