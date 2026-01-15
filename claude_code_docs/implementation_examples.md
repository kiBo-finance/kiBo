# 実装サンプルコード集

## 認証システム実装

### better-auth設定

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET!,
  plugins: [
    // 将来的な拡張用
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = (typeof auth.$Infer.Session)['user']
```

```typescript
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
})

export const { signIn, signUp, signOut, useSession } = authClient
```

### 認証API Route

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'

export const { GET, POST } = auth.handler
```

## Jotai状態管理実装

### Core Atoms

```typescript
// lib/atoms/auth.ts
import { atom } from 'jotai'
import type { User, Session } from '@/lib/auth'

export const userAtom = atom<User | null>(null)
export const sessionAtom = atom<Session | null>(null)
export const isAuthenticatedAtom = atom((get) => get(sessionAtom) !== null)
```

```typescript
// lib/atoms/currency.ts
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { Currency, ExchangeRate } from '@prisma/client'

export const currenciesAtom = atom<Currency[]>([])
export const baseCurrencyAtom = atomWithStorage<string>('baseCurrency', 'JPY')
export const exchangeRatesAtom = atom<ExchangeRate[]>([])

// 為替レート取得用
export const exchangeRateMapAtom = atom((get) => {
  const rates = get(exchangeRatesAtom)
  const rateMap = new Map<string, number>()

  rates.forEach((rate) => {
    const key = `${rate.fromCurrency}-${rate.toCurrency}`
    rateMap.set(key, Number(rate.rate))
  })

  return rateMap
})
```

```typescript
// lib/atoms/accounts.ts
import { atom } from 'jotai'
import type { Account, Card } from '@prisma/client'

export const accountsAtom = atom<Account[]>([])
export const cardsAtom = atom<Card[]>([])
export const selectedAccountAtom = atom<string | null>(null)

// 通貨別口座グループ
export const accountsByCurrencyAtom = atom((get) => {
  const accounts = get(accountsAtom)
  return accounts.reduce(
    (acc, account) => {
      if (!acc[account.currency]) {
        acc[account.currency] = []
      }
      acc[account.currency].push(account)
      return acc
    },
    {} as Record<string, Account[]>
  )
})

// 総資産計算（基準通貨）
export const totalAssetsAtom = atom((get) => {
  const accounts = get(accountsAtom)
  const baseCurrency = get(baseCurrencyAtom)
  const rateMap = get(exchangeRateMapAtom)

  return accounts.reduce((total, account) => {
    if (account.currency === baseCurrency) {
      return total + Number(account.balance)
    }

    const rateKey = `${account.currency}-${baseCurrency}`
    const rate = rateMap.get(rateKey) || 1

    return total + Number(account.balance) * rate
  }, 0)
})
```

### カスタムHooks

```typescript
// lib/hooks/useAccounts.ts
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { accountsAtom } from '@/lib/atoms/accounts'
import {
  createAccountAction,
  updateAccountAction,
  deleteAccountAction,
} from '@/lib/actions/accounts'

export function useAccounts() {
  const [accounts, setAccounts] = useAtom(accountsAtom)

  const createAccount = useCallback(
    async (data: CreateAccountData) => {
      try {
        const newAccount = await createAccountAction(data)
        setAccounts((prev) => [...prev, newAccount])
        return { success: true, account: newAccount }
      } catch (error) {
        console.error('Failed to create account:', error)
        return { success: false, error: error.message }
      }
    },
    [setAccounts]
  )

  const updateAccount = useCallback(
    async (id: string, data: UpdateAccountData) => {
      try {
        const updatedAccount = await updateAccountAction(id, data)
        setAccounts((prev) => prev.map((acc) => (acc.id === id ? updatedAccount : acc)))
        return { success: true, account: updatedAccount }
      } catch (error) {
        console.error('Failed to update account:', error)
        return { success: false, error: error.message }
      }
    },
    [setAccounts]
  )

  const deleteAccount = useCallback(
    async (id: string) => {
      try {
        await deleteAccountAction(id)
        setAccounts((prev) => prev.filter((acc) => acc.id !== id))
        return { success: true }
      } catch (error) {
        console.error('Failed to delete account:', error)
        return { success: false, error: error.message }
      }
    },
    [setAccounts]
  )

  return {
    accounts,
    createAccount,
    updateAccount,
    deleteAccount,
  }
}
```

## Server Actions実装

```typescript
// lib/actions/accounts.ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAccountSchema, updateAccountSchema } from '@/lib/validations/account'
import type { CreateAccountData, UpdateAccountData } from '@/types'

export async function createAccountAction(data: CreateAccountData) {
  const session = await auth.api.getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const validatedData = createAccountSchema.parse(data)

  const account = await prisma.account.create({
    data: {
      ...validatedData,
      userId: session.user.id,
    },
    include: {
      currencyRef: true,
    },
  })

  revalidatePath('/dashboard/accounts')
  return account
}

export async function updateAccountAction(id: string, data: UpdateAccountData) {
  const session = await auth.api.getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  // 所有者確認
  const existingAccount = await prisma.account.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existingAccount) {
    throw new Error('Account not found or unauthorized')
  }

  const validatedData = updateAccountSchema.parse(data)

  const account = await prisma.account.update({
    where: { id },
    data: validatedData,
    include: {
      currencyRef: true,
    },
  })

  revalidatePath('/dashboard/accounts')
  revalidatePath(`/dashboard/accounts/${id}`)
  return account
}
```

## API Routes実装例

```typescript
// app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAccountSchema } from '@/lib/validations/account'
import { handleApiError } from '@/lib/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        currencyRef: true,
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(accounts)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAccountSchema.parse(body)

    const account = await prisma.account.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
      include: { currencyRef: true },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
```

## コンポーネント実装例

### レイアウトコンポーネント

```typescript
// components/dashboard/Sidebar.tsx
'use client'

import { useAtom } from 'jotai'
import { sidebarOpenAtom } from '@/lib/atoms'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Home,
  CreditCard,
  Calendar,
  TrendingUp,
  Settings,
  Menu
} from 'lucide-react'
import Link from 'next/link'

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: Home },
  { name: '口座・カード', href: '/dashboard/accounts', icon: CreditCard },
  { name: '予定管理', href: '/dashboard/scheduled', icon: Calendar },
  { name: 'レポート', href: '/dashboard/reports', icon: TrendingUp },
  { name: '設定', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom)

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */
```
