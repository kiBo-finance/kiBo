'use client'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { authClient } from '../../lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const signUpSchema = z
  .object({
    name: z.string().min(1, '名前を入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

type SignUpFormData = z.infer<typeof signUpSchema>

interface SignUpFormProps {
  onToggleMode?: () => void
  onSuccess?: () => void
}

export function SignUpForm({ onToggleMode, onSuccess }: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true)
    setSubmitError(null)

    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      })

      if (result.error) {
        setSubmitError(result.error.message || 'アカウント作成に失敗しました')
      } else if (result.data?.user) {
        onSuccess?.()
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'アカウント作成に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>アカウント作成</CardTitle>
        <CardDescription>新しいアカウントを作成してください</CardDescription>
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
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="8文字以上のパスワード"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="パスワードを再入力"
              {...register('confirmPassword')}
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {submitError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{submitError}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'アカウント作成中...' : 'アカウント作成'}
          </Button>

          {onToggleMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={onToggleMode}
                className="text-sm text-blue-600 hover:underline"
              >
                すでにアカウントをお持ちの方はこちら
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
