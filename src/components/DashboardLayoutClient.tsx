'use client'

import type { ReactNode } from 'react'
import { Link } from 'waku/router/client'
import { AppHeader } from './layout/AppHeader'
import { useAuth } from './providers/AuthProvider'
import { Toaster } from 'sonner'

type DashboardLayoutClientProps = { children: ReactNode }

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  const { session, authLoading } = useAuth()

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
