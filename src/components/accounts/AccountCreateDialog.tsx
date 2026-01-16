'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { accountsAtom } from '@/lib/atoms/accounts'
import { activeCurrenciesAtom } from '@/lib/atoms/currency'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AppAccount } from '@prisma/client'
import { useAtomValue } from 'jotai'
import { Plus, CreditCard, Wallet, PiggyBank, Clock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const ACCOUNT_TYPES = [
  {
    value: 'CHECKING',
    label: '普通預金',
    icon: CreditCard,
    description: '日常的な入出金に使用する口座',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    value: 'SAVINGS',
    label: '貯蓄預金',
    icon: PiggyBank,
    description: '貯蓄目的で使用する口座',
    color:
      'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/50 dark:border-green-600 dark:text-green-200',
  },
  {
    value: 'CASH',
    label: '現金',
    icon: Wallet,
    description: '手持ちの現金を管理',
    color:
      'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/50 dark:border-yellow-600 dark:text-yellow-200',
  },
  {
    value: 'FIXED_DEPOSIT',
    label: '定期預金',
    icon: Clock,
    description: '満期まで引き出しができない預金',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
] as const

const formSchema = z.object({
  name: z.string().min(1, 'アカウント名を入力してください').max(100),
  type: z.enum(['CHECKING', 'SAVINGS', 'CASH', 'FIXED_DEPOSIT']),
  currency: z.string().min(1, '通貨を選択してください'),
  initialBalance: z.string().min(1, '初期残高を入力してください'),
  description: z.string().max(500).optional(),
  fixedDepositRate: z.string().optional(),
  fixedDepositMaturity: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AccountCreateDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAccountCreated?: (account: AppAccount) => void
}

export function AccountCreateDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onAccountCreated,
}: AccountCreateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createAccount } = useAccounts()
  const currencies = useAtomValue(activeCurrenciesAtom)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'CHECKING',
      currency: 'JPY',
      initialBalance: '0',
      description: '',
      fixedDepositRate: '',
      fixedDepositMaturity: '',
    },
  })

  const selectedType = form.watch('type')
  const selectedCurrencyCode = form.watch('currency')
  const isJPY = selectedCurrencyCode === 'JPY'
  const selectedAccountType = ACCOUNT_TYPES.find((t) => t.value === selectedType)
  const IconComponent = selectedAccountType?.icon || CreditCard

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true)

    try {
      const result = await createAccount({
        name: values.name,
        type: values.type,
        currency: values.currency,
        balance: parseFloat(values.initialBalance) || 0,
        description: values.description || undefined,
        fixedDepositRate: values.fixedDepositRate ? parseFloat(values.fixedDepositRate) : undefined,
        fixedDepositMaturity: values.fixedDepositMaturity
          ? new Date(values.fixedDepositMaturity)
          : undefined,
      })

      if (!result.success) {
        throw new Error(result.error || '口座作成に失敗しました')
      }

      if (result.data) {
        onAccountCreated?.(result.data)
      }
      setOpen(false)
      form.reset()
    } catch (error) {
      console.error('Account creation error:', error)
      alert(error instanceof Error ? error.message : '口座作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            新しい口座を作成
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            新しい口座を作成
          </DialogTitle>
          <DialogDescription>新しい口座の詳細情報を入力してください</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>口座名</FormLabel>
                  <FormControl>
                    <Input placeholder="例: メイン普通預金" {...field} className="cursor-text" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>口座の種類</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCOUNT_TYPES.map((accountType) => {
                      const Icon = accountType.icon
                      return (
                        <Card
                          key={accountType.value}
                          className={cn(
                            'cursor-pointer transition-all hover:shadow-md',
                            field.value === accountType.value
                              ? 'ring-2 ring-primary border-primary'
                              : 'hover:border-muted-foreground/20'
                          )}
                          onClick={() => field.onChange(accountType.value)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2 text-center">
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-full flex items-center justify-center mx-auto',
                                  accountType.color
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="text-sm font-medium">{accountType.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {accountType.description}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => {
                  const selectedCurrency = currencies.find((c) => c.code === field.value)
                  return (
                    <FormItem>
                      <FormLabel>通貨</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            {selectedCurrency ? (
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-sm">{selectedCurrency.symbol}</span>
                                <span>{selectedCurrency.code}</span>
                              </span>
                            ) : (
                              <SelectValue placeholder="通貨を選択" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem
                              key={currency.code}
                              value={currency.code}
                              className="cursor-pointer"
                              textValue={`${currency.symbol} ${currency.code} ${currency.name}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{currency.symbol}</span>
                                <span>{currency.code}</span>
                                <span className="text-sm text-muted-foreground">{currency.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>初期残高</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step={isJPY ? '1' : '0.01'}
                        placeholder="0"
                        {...field}
                        className="cursor-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedType === 'FIXED_DEPOSIT' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fixedDepositRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>年利率 (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={isJPY ? '1' : '0.01'}
                          placeholder="0.5"
                          {...field}
                          className="cursor-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fixedDepositMaturity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>満期日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="cursor-pointer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明（任意）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="口座の用途や説明を入力..."
                      className="cursor-text resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>口座の用途や特記事項があれば記入してください</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="cursor-pointer"
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? '作成中...' : '口座を作成'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
