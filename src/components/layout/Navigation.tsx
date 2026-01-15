'use client'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import {
  Home,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Settings,
  Menu,
  X,
  Calendar,
  BarChart3,
  Wallet,
} from 'lucide-react'
import { Link, useRouter } from 'waku/router/client'
import { useState, useEffect } from 'react'

const navigationItems = [
  {
    name: 'ダッシュボード',
    href: '/dashboard',
    icon: Home,
    description: 'メインダッシュボード',
  },
  {
    name: '取引',
    href: '/dashboard/transactions',
    icon: CreditCard,
    description: '取引履歴・登録',
  },
  {
    name: '口座',
    href: '/dashboard/accounts',
    icon: PiggyBank,
    description: '銀行口座管理',
  },
  {
    name: 'カード',
    href: '/dashboard/cards',
    icon: Wallet,
    description: 'クレジット・デビット・プリペイドカード',
  },
  {
    name: '予定取引',
    href: '/dashboard/scheduled',
    icon: Calendar,
    description: '予定・定期取引',
  },
  {
    name: '予算',
    href: '/dashboard/budgets',
    icon: TrendingUp,
    description: '予算管理',
  },
  {
    name: 'レポート',
    href: '/dashboard/reports',
    icon: BarChart3,
    description: '分析・レポート',
  },
  {
    name: '設定',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'アプリ設定',
  },
]

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [pathname, setPathname] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Get pathname from window.location on client side
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname)
    }
  }, [])

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Desktop navigation */}
      <nav className={cn('hidden md:flex space-x-8', className)}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href as any}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
              title={item.description}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile navigation menu */}
      {isMobileMenuOpen && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-gray-200 bg-white shadow-lg md:hidden">
          <nav className="space-y-1 px-4 py-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  to={item.href as any}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-3 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}
