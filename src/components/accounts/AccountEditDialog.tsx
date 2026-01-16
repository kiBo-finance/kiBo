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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { accountsAtom } from '@/lib/atoms/accounts'
import { activeCurrenciesAtom } from '@/lib/atoms/currency'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AppAccount } from '@prisma/client'
import { useAtomValue } from 'jotai'
import { Edit, CreditCard, Wallet, PiggyBank, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
  description: z.string().max(500).optional(),
  fixedDepositRate: z.string().optional(),
  fixedDepositMaturity: z.string().optional(),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface AccountEditDialogProps {
  accountId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountUpdated?: (account: AppAccount) => void
}

export function AccountEditDialog({
  accountId,
  open,
  onOpenChange,
  onAccountUpdated,
}: AccountEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateAccount } = useAccounts()
  const accounts = useAtomValue(accountsAtom)

  const account = accounts.find((acc) => acc.id === accountId)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      fixedDepositRate: '',
      fixedDepositMaturity: '',
      isActive: true,
    },
  })

  // Update form when account changes
  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        description: account.description || '',
        fixedDepositRate: account.fixedDepositRate ? account.fixedDepositRate.toString() : '',
        fixedDepositMaturity: account.fixedDepositMaturity
          ? new Date(account.fixedDepositMaturity).toISOString().split('T')[0]
          : '',
        isActive: account.isActive,
      })
    }
  }, [account, form])

  const selectedAccountType = ACCOUNT_TYPES.find((t) => t.value === account?.type)
  const IconComponent = selectedAccountType?.icon || CreditCard

  const onSubmit = async (values: FormData) => {
    if (!accountId) return

    setIsSubmitting(true)

    try {
      const result = await updateAccount(accountId, {
        name: values.name,
        description: values.description || undefined,
        fixedDepositRate: values.fixedDepositRate ? parseFloat(values.fixedDepositRate) : undefined,
        fixedDepositMaturity: values.fixedDepositMaturity
          ? new Date(values.fixedDepositMaturity)
          : undefined,
        isActive: values.isActive,
      })

      if (!result.success) {
        throw new Error(result.error || '口座更新に失敗しました')
      }

      if (result.data) {
        onAccountUpdated?.(result.data)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Account update error:', error)
      toast.error(error instanceof Error ? error.message : '口座更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!account) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            口座の編集
          </DialogTitle>
          <DialogDescription>口座の詳細情報を編集してください</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Type (Read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">口座の種類</label>
              <Card className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        selectedAccountType?.color
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{selectedAccountType?.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAccountType?.description}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {account.currencyRef?.symbol} {account.currency}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">口座の種類と通貨は変更できません</p>
            </div>

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

            {account.type === 'FIXED_DEPOSIT' && (
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
                          step="0.01"
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

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">口座を有効にする</FormLabel>
                    <FormDescription>
                      無効にすると取引履歴は保持されますが、新しい取引はできません
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? '更新中...' : '口座を更新'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
