'use client'

import { cn } from '@/lib/utils'
import {
  Home,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Settings,
  Calendar,
  BarChart3,
  Wallet,
} from 'lucide-react'
import { Link } from 'waku/router/client'
import { useEffect, useState } from 'react'

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
  isMobile?: boolean
  onNavigate?: () => void
}

export function Navigation({ className, isMobile = false, onNavigate }: NavigationProps) {
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    // Get pathname from window.location on client side
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname)
    }
  }, [])

  // Mobile navigation (shown in hamburger menu dropdown)
  if (isMobile) {
    return (
      <nav className={cn('space-y-1 px-4 py-2', className)}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href as any}
              onClick={onNavigate}
              className={cn(
                'flex items-center space-x-3 px-3 py-3 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="h-5 w-5" />
              <div>
                <div>{item.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>
    )
  }

  // Desktop navigation
  return (
    <nav className={cn('space-x-1 lg:space-x-2', className)}>
      {navigationItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href as any}
            className={cn(
              'inline-flex items-center space-x-1 px-2 py-2 rounded-md text-sm font-medium transition-colors lg:px-3 lg:space-x-2',
              isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
            )}
            title={item.description}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden xl:inline">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
