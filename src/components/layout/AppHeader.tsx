'use client'

import { Navigation } from './Navigation'
import { Button } from '@/components/ui/button'
import { SyncIndicator } from '@/components/ui/sync-status'
import { useAuth } from '@/lib/hooks/useAuth'
import { User, Menu, X, LogOut } from 'lucide-react'
import { Link, useRouter } from 'waku/router/client'
import { useState, useEffect } from 'react'

export function AppHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login' as any)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile menu button - Left side on mobile */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
              aria-label="メニューを開く"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* Logo - Center on mobile, left on desktop */}
          <Link
            to={'/dashboard' as any}
            className="flex items-center space-x-2 md:flex-none"
          >
            <img
              src="/logo.svg"
              alt="kiBo"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="/logo-dark.svg"
              alt="kiBo"
              className="hidden h-8 w-auto dark:block"
            />
          </Link>

          {/* Desktop Navigation */}
          <Navigation className="hidden flex-1 justify-center md:flex" />

          {/* User menu - Right side */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <SyncIndicator />
            {/* Desktop only: user name and buttons */}
            <span className="hidden text-sm text-gray-700 dark:text-gray-300 lg:block">
              {user?.name || user?.email}
            </span>
            <Button
              onClick={() => router.push('/profile' as any)}
              variant="ghost"
              size="sm"
              className="hidden p-2 md:inline-flex"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
            >
              ログアウト
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:hidden">
          <Navigation
            className="flex flex-col"
            isMobile
            onNavigate={() => setIsMobileMenuOpen(false)}
          />
          {/* Mobile user section */}
          <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
            <div className="flex items-center space-x-3 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name || 'ユーザー'}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  router.push('/profile' as any)
                }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <User className="mr-2 h-4 w-4" />
                プロフィール
              </Button>
              <Button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  handleSignOut()
                }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
