'use client'

import { Navigation } from './Navigation'
import { Button } from '../ui/button'
import { SyncIndicator } from '../ui/sync-status'
import { useAuth } from '../../lib/hooks/useAuth'
import { User } from 'lucide-react'
import { useRouter } from 'waku/router/client'

export function AppHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login' as any)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">kiBoアプリ</h1>
              <p className="text-xs text-gray-600">多通貨対応家計簿</p>
            </div>
          </div>

          {/* Navigation */}
          <Navigation className="flex-1 justify-center" />

          {/* User menu */}
          <div className="flex items-center space-x-4">
            <SyncIndicator />
            <span className="hidden text-sm text-gray-700 sm:block">
              {user?.name || user?.email}
            </span>
            <Button
              onClick={() => router.push('/profile' as any)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
