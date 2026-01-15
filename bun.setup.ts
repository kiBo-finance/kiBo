/**
 * Bun test setup file
 * This replaces jest.setup.cjs for Bun test runner
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Register happy-dom globals before anything else
GlobalRegistrator.register()

import { mock, expect } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Bun's expect with jest-dom matchers
expect.extend(matchers)

// Mock environment variables for tests
process.env.BETTER_AUTH_SECRET = 'test-secret-key-minimum-32-characters'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'

// Mock ResizeObserver (enhanced version for happy-dom)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock window.matchMedia for happy-dom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock next/navigation
mock.module('next/navigation', () => ({
  useRouter: () => ({
    push: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/cache
mock.module('next/cache', () => ({
  unstable_cache: (fn: Function) => fn,
  revalidatePath: () => {},
  revalidateTag: () => {},
}))

// Mock next/headers
mock.module('next/headers', () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}))

// Mock server actions modules to prevent import chain issues
mock.module('~/lib/actions/accounts', () => ({
  getAccounts: async () => [],
  getAllAccounts: async () => [],
  createAccount: async () => ({ success: true }),
  updateAccount: async () => ({ success: true }),
  deleteAccount: async () => ({ success: true }),
}))

mock.module('~/lib/actions/cards', () => ({
  getCards: async () => [],
  createCard: async () => ({ success: true }),
  updateCard: async () => ({ success: true }),
  deleteCard: async () => ({ success: true }),
}))

// Mock waku/router/client
mock.module('waku/router/client', () => ({
  Link: ({
    children,
    to,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode
    to?: string
    href?: string
    className?: string
    [key: string]: unknown
  }) => {
    const React = require('react')
    return React.createElement('a', { href: to || href, className, ...props }, children)
  },
  useRouter: () => ({
    push: () => Promise.resolve(),
    replace: () => Promise.resolve(),
    reload: () => Promise.resolve(),
    back: () => {},
    forward: () => {},
    prefetch: () => {},
    path: '/',
    query: '',
    hash: '',
  }),
}))
