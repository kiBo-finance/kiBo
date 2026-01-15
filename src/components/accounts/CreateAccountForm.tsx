'use client'

import { CurrencySelect } from '../currency/CurrencySelect'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Textarea } from '../ui/textarea'
import { addAccountAtom } from '../../lib/atoms/accounts'
import { activeCurrenciesAtom, baseCurrencyAtom } from '../../lib/atoms/currency'
import { cn } from '../../lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAtomValue, useSetAtom } from 'jotai'
import { Wallet, CreditCard, PiggyBank, Clock, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const accountFormSchema = z.object({
  name: z.string().min(1, '口座名は必須です').max(100, '口座名は100文字以内で入力してください'),
  type: z.enum(['CASH', 'CHECKING', 'SAVINGS', 'FIXED_DEPOSIT'], {
    message: '口座種別を選択してください',
  }),
  currency: z.string().min(1, '通貨を選択してください'),
  balance: z
    .string()
    .regex(/^\d*\.?\d*$/, '正しい金額を入力してください')
    .optional(),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
  fixedDepositRate: z
    .string()
    .regex(/^\d*\.?\d*$/, '正しい利率を入力してください')
    .optional(),
  fixedDepositMaturity: z.string().optional(),
})

type AccountFormData = z.infer<typeof accountFormSchema>

interface CreateAccountFormProps {
  className?: string
  onSuccess?: (accountId: string) => void
  onCancel?: () => void
}

const ACCOUNT_TYPES = [
  {
    value: 'CASH',
    label: '現金',
    description: '手元現金や小銭入れ',
    icon: Wallet,
  },
  {
    value: 'CHECKING',
    label: '普通預金',
    description: '日常使いの銀行口座',
    icon: CreditCard,
  },
  {
    value: 'SAVINGS',
    label: '貯蓄預金',
    description: '貯蓄用の銀行口座',
    icon: PiggyBank,
  },
  {
    value: 'FIXED_DEPOSIT',
    label: '定期預金',
    description: '固定期間の預金口座',
    icon: Clock,
  },
] as const

export function CreateAccountForm({ className, onSuccess, onCancel }: CreateAccountFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const activeCurrencies = useAtomValue(activeCurrenciesAtom)
  const baseCurrency = useAtomValue(baseCurrencyAtom)
  const addAccount = useSetAtom(addAccountAtom)

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      type: 'CHECKING',
      currency: baseCurrency,
      description: '',
      fixedDepositRate: '',
      fixedDepositMaturity: '',
    },
  })

  const selectedType = form.watch('type')
  const isFixedDeposit = selectedType === 'FIXED_DEPOSIT'

  const onSubmit = async (data: AccountFormData) => {
    setIsLoading(true)

    try {
      const payload = {
        name: data.name,
        type: data.type,
        currency: data.currency,
        balance: parseFloat(data.balance || '0') || 0,
        description: data.description || undefined,
        fixedDepositRate:
          isFixedDeposit && data.fixedDepositRate ? parseFloat(data.fixedDepositRate) : undefined,
        fixedDepositMaturity:
          isFixedDeposit && data.fixedDepositMaturity ? data.fixedDepositMaturity : undefined,
      }

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create account')
      }

      const newAccount = await response.json()

      // Jotai stateを更新
      addAccount(newAccount)

      // 成功コールバック
      onSuccess?.(newAccount.id)

      // フォームリセット
      form.reset()
    } catch (error) {
      console.error('Account creation failed:', error)
      // TODO: エラーハンドリング（toast表示など）
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          新しい口座を作成
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 口座名 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>口座名 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例: メインバンク普通預金" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 口座種別 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>口座種別 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="口座種別を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => {
                        const IconComponent = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {type.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 通貨選択 */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>通貨 *</FormLabel>
                  <FormControl>
                    <CurrencySelect
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="通貨を選択"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 初期残高 */}
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>初期残高</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>口座の現在の残高を入力してください</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 定期預金専用フィールド */}
            {isFixedDeposit && (
              <div className="space-y-4 rounded-lg border bg-muted/50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
                <h3 className="text-sm font-medium">定期預金設定</h3>

                <FormField
                  control={form.control}
                  name="fixedDepositRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>年利率 (%) *</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="1.5" {...field} />
                      </FormControl>
                      <FormDescription>年間の利率をパーセントで入力</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fixedDepositMaturity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>満期日 *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>定期預金の満期日</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* 説明 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="口座についての備考や説明"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>口座の用途や備考を記録できます（任意）</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* アクションボタン */}
            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                  キャンセル
                </Button>
              )}
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? '作成中...' : '口座を作成'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
