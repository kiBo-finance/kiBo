'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { updateAccountAtom } from '@/lib/atoms/accounts'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSetAtom } from 'jotai'
import { Pencil, Wallet, CreditCard, PiggyBank, Clock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const editAccountFormSchema = z.object({
  name: z.string().min(1, '口座名は必須です').max(100, '口座名は100文字以内で入力してください'),
  balance: z
    .string()
    .regex(/^-?\d*\.?\d*$/, '正しい金額を入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().nullable(),
  isActive: z.boolean(),
  fixedDepositRate: z
    .string()
    .regex(/^\d*\.?\d*$/, '正しい利率を入力してください')
    .optional()
    .nullable(),
  fixedDepositMaturity: z.string().optional().nullable(),
})

type EditAccountFormData = z.infer<typeof editAccountFormSchema>

interface Account {
  id: string
  name: string
  type: 'CASH' | 'CHECKING' | 'SAVINGS' | 'FIXED_DEPOSIT'
  currency: string
  balance: string
  description: string | null
  isActive: boolean
  fixedDepositRate: string | null
  fixedDepositMaturity: string | null
}

interface EditAccountFormProps {
  account: Account
  className?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; icon: typeof Wallet }> = {
  CASH: { label: '現金', icon: Wallet },
  CHECKING: { label: '普通預金', icon: CreditCard },
  SAVINGS: { label: '貯蓄預金', icon: PiggyBank },
  FIXED_DEPOSIT: { label: '定期預金', icon: Clock },
}

export function EditAccountForm({ account, className, onSuccess, onCancel }: EditAccountFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const updateAccount = useSetAtom(updateAccountAtom)

  const isFixedDeposit = account.type === 'FIXED_DEPOSIT'
  const typeInfo = ACCOUNT_TYPE_LABELS[account.type]
  const IconComponent = typeInfo?.icon || Wallet

  const form = useForm<EditAccountFormData>({
    resolver: zodResolver(editAccountFormSchema),
    defaultValues: {
      name: account.name,
      balance: account.balance || '0',
      description: account.description || '',
      isActive: account.isActive,
      fixedDepositRate: account.fixedDepositRate || '',
      fixedDepositMaturity: account.fixedDepositMaturity
        ? new Date(account.fixedDepositMaturity).toISOString().split('T')[0]
        : '',
    },
  })

  const onSubmit = async (data: EditAccountFormData) => {
    setIsLoading(true)

    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        balance: parseFloat(data.balance || '0'),
        description: data.description || null,
        isActive: data.isActive,
      }

      if (isFixedDeposit) {
        payload.fixedDepositRate = data.fixedDepositRate
          ? parseFloat(data.fixedDepositRate)
          : null
        payload.fixedDepositMaturity = data.fixedDepositMaturity || null
      }

      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update account')
      }

      const updatedAccount = await response.json()

      // Jotai stateを更新
      updateAccount(updatedAccount)

      toast.success('口座を更新しました')
      onSuccess?.()
    } catch (error) {
      console.error('Account update failed:', error)
      toast.error(error instanceof Error ? error.message : '口座の更新に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5" />
          口座設定を編集
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{typeInfo?.label || account.type}</div>
              <div className="text-sm text-muted-foreground">{account.currency}</div>
            </div>
          </div>
        </div>

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

            {/* 残高 */}
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>残高</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>口座の現在の残高</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 定期預金専用フィールド */}
            {isFixedDeposit && (
              <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                <h3 className="text-sm font-medium">定期預金設定</h3>

                <FormField
                  control={form.control}
                  name="fixedDepositRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>年利率 (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="1.5"
                          {...field}
                          value={field.value || ''}
                        />
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
                      <FormLabel>満期日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
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
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>口座の用途や備考を記録できます（任意）</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* アクティブ状態 */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">口座を有効にする</FormLabel>
                    <FormDescription>
                      無効にすると、この口座は選択肢に表示されなくなります
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
                {isLoading ? '保存中...' : '変更を保存'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
