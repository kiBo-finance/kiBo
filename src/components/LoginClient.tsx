'use client'

import { Link, useRouter } from 'waku/router/client'
import { useState } from 'react'
import { signIn } from '../lib/auth-client'

import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ThemeToggle } from './ui/theme-toggle'

export function LoginClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        if (result.error.code === 'EMAIL_NOT_VERIFIED') {
          setError('メールアドレスの認証が必要です')
        } else if (result.error.code === 'INVALID_EMAIL_OR_PASSWORD') {
          setError('メールアドレスまたはパスワードが正しくありません')
        } else {
          setError(result.error.message || 'ログインに失敗しました')
        }
      } else {
        // Use full page navigation to ensure AuthProvider remounts with new session
        window.location.href = '/dashboard'
      }
    } catch {
      setError('ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>kiBoアプリにログインしてください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は
            <Link to={"/signup" as any} className="ml-1 text-primary hover:underline">
              新規登録
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
