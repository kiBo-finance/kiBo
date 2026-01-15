/**
 * Type-safe route utilities for Waku router
 *
 * This module provides helper functions that return properly typed routes
 * for use with Waku's Link component and useRouter().push()
 */

// Static routes (these match the generated paths in pages.gen.ts)
export const routes = {
  home: '/' as const,
  login: '/login' as const,
  signup: '/signup' as const,
  demo: '/demo' as const,
  dashboard: {
    index: '/dashboard' as const,
    accounts: {
      index: '/dashboard/accounts' as const,
      new: '/dashboard/accounts/new' as const,
      detail: (id: string) => `/dashboard/accounts/${id}` as const,
      edit: (id: string) => `/dashboard/accounts/${id}/edit` as const,
    },
    cards: {
      index: '/dashboard/cards' as const,
    },
    scheduled: {
      index: '/dashboard/scheduled' as const,
      create: '/dashboard/scheduled/create' as const,
      calendar: '/dashboard/scheduled/calendar' as const,
      detail: (id: string) => `/dashboard/scheduled/${id}` as const,
      edit: (id: string) => `/dashboard/scheduled/${id}/edit` as const,
    },
    settings: {
      index: '/dashboard/settings' as const,
      notifications: '/dashboard/settings/notifications' as const,
    },
    transactions: {
      index: '/dashboard/transactions' as const,
    },
  },
} as const

// Type for all static route paths
export type StaticRoute =
  | typeof routes.home
  | typeof routes.login
  | typeof routes.signup
  | typeof routes.demo
  | typeof routes.dashboard.index
  | typeof routes.dashboard.accounts.index
  | typeof routes.dashboard.accounts.new
  | typeof routes.dashboard.cards.index
  | typeof routes.dashboard.scheduled.index
  | typeof routes.dashboard.scheduled.create
  | typeof routes.dashboard.scheduled.calendar
  | typeof routes.dashboard.settings.index
  | typeof routes.dashboard.settings.notifications
  | typeof routes.dashboard.transactions.index

// Type for dynamic route paths
export type DynamicRoute =
  | ReturnType<typeof routes.dashboard.accounts.detail>
  | ReturnType<typeof routes.dashboard.accounts.edit>
  | ReturnType<typeof routes.dashboard.scheduled.detail>
  | ReturnType<typeof routes.dashboard.scheduled.edit>

// Combined type for all routes
export type AppRoute = StaticRoute | DynamicRoute

// Type-safe Link 'to' prop helper
// This casts dynamic routes to the expected type for Waku's Link component
export function toRoute(path: AppRoute): string {
  return path
}
