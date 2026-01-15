'use client'

import type { ReactNode } from 'react'
import { Link } from 'waku/router/client'
import { ThemeToggle } from './ui/theme-toggle'
import { useAuth } from './providers/AuthProvider'
import { Toaster } from 'sonner'

type DashboardLayoutClientProps = { children: ReactNode }

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  const { session, signOut, authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4">ログインが必要です</p>
          <Link to={"/login" as any} className="text-primary hover:underline">
            ログインページへ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold">kiBoアプリ</h1>
              <nav className="hidden items-center gap-6 md:flex">
                <Link
                  to={"/dashboard" as any}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  ダッシュボード
                </Link>
                <Link
                  to={"/dashboard/accounts" as any}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  口座管理
                </Link>
                <Link
                  to={"/dashboard/cards" as any}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  カード管理
                </Link>
                <Link
                  to={"/dashboard/settings" as any}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  設定
                </Link>
                <Link
                  to={"/demo" as any}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  デモ
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">{session.user?.email}</span>
              <button
                type="button"
                onClick={signOut}
                className="text-sm font-medium hover:text-primary"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
