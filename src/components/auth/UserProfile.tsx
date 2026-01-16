'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { User } from '@/lib/types/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  baseCurrency: z.string().min(3, '通貨コードを入力してください'),
})

type ProfileFormData = z.infer<typeof profileSchema>

const currencies = [
  { code: 'JPY', name: '日本円', symbol: '¥' },
  { code: 'USD', name: '米ドル', symbol: '$' },
  { code: 'EUR', name: 'ユーロ', symbol: '€' },
  { code: 'GBP', name: '英ポンド', symbol: '£' },
  { code: 'AUD', name: '豪ドル', symbol: 'A$' },
  { code: 'CAD', name: 'カナダドル', symbol: 'C$' },
]

export function UserProfile() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      baseCurrency: (user as User)?.baseCurrency || 'JPY',
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setUpdateMessage(null)

    try {
      const result = await authClient.updateUser({
        name: data.name,
      })

      if (result.error) {
        setUpdateMessage('更新に失敗しました: ' + result.error.message)
      } else {
        setUpdateMessage('プロフィールを更新しました')
      }
    } catch (error) {
      setUpdateMessage('更新に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>プロフィール設定</CardTitle>
        <CardDescription>ユーザー情報と基準通貨を設定できます</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              type="text"
              placeholder="山田太郎"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseCurrency">基準通貨</Label>
            <select
              id="baseCurrency"
              {...register('baseCurrency')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
            {errors.baseCurrency && (
              <p className="text-sm text-red-600">{errors.baseCurrency.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input type="email" value={user.email} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">メールアドレスの変更は現在サポートしていません</p>
          </div>

          {updateMessage && (
            <div
              className={`rounded-md p-3 text-sm ${
                updateMessage.includes('失敗')
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              {updateMessage}
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? '更新中...' : 'プロフィールを更新'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
