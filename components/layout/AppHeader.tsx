'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'
import { Navigation } from './Navigation'
import { User } from 'lucide-react'

export function AppHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
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
            <span className="hidden sm:block text-sm text-gray-700">
              {user?.name || user?.email}
            </span>
            <Button
              onClick={() => router.push('/profile')}
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