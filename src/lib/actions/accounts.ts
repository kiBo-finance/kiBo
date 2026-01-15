'use server'

import { auth } from '../auth'
import { prisma } from '../db'
import type { AppAccount, AccountType, Currency } from '@prisma/client'
import type { SessionUser } from '../types/auth'
import Decimal from 'decimal.js'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export async function getAccounts(): Promise<
  (AppAccount & { currencyRef: { symbol: string } })[] | null
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return null
    }

    const user = session.user as SessionUser
    const accounts = await prisma.appAccount.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currencyRef: {
          select: {
            symbol: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return accounts.map((account) => ({
      ...account,
      currencyRef: {
        symbol: account.currencyRef?.symbol || '¥',
      },
    }))
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return null
  }
}

export async function getAllAccounts(): Promise<
  (AppAccount & { currencyRef: { symbol: string } })[] | null
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return null
    }

    const user = session.user as SessionUser
    const accounts = await prisma.appAccount.findMany({
      where: {
        userId: user.id,
      },
      include: {
        currencyRef: {
          select: {
            symbol: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return accounts.map((account) => ({
      ...account,
      currencyRef: {
        symbol: account.currencyRef?.symbol || '¥',
      },
    }))
  } catch (error) {
    console.error('Failed to fetch all accounts:', error)
    return null
  }
}

export async function createAccount(data: {
  name: string
  type: AccountType
  currency: string
  balance?: number
  description?: string
  fixedDepositRate?: number
  fixedDepositMaturity?: Date
}): Promise<{ success: boolean; data?: AppAccount; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = session.user as SessionUser
    const account = await prisma.appAccount.create({
      data: {
        userId: user.id,
        name: data.name,
        type: data.type,
        currency: data.currency,
        balance: data.balance ? new Decimal(data.balance) : new Decimal(0),
        description: data.description,
        fixedDepositRate: data.fixedDepositRate ? new Decimal(data.fixedDepositRate) : null,
        fixedDepositMaturity: data.fixedDepositMaturity,
        isActive: true,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/accounts')

    return { success: true, data: account }
  } catch (error) {
    console.error('Failed to create account:', error)
    return { success: false, error: 'Failed to create account' }
  }
}

export async function updateAccount(
  accountId: string,
  data: Partial<{
    name: string
    description: string
    fixedDepositRate: number
    fixedDepositMaturity: Date
    isActive: boolean
  }>
): Promise<{ success: boolean; data?: AppAccount; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = session.user as SessionUser
    const account = await prisma.appAccount.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: {
        ...data,
        fixedDepositRate: data.fixedDepositRate ? new Decimal(data.fixedDepositRate) : undefined,
        updatedAt: new Date(),
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/accounts')
    revalidatePath(`/dashboard/accounts/${accountId}`)

    return { success: true, data: account }
  } catch (error) {
    console.error('Failed to update account:', error)
    return { success: false, error: 'Failed to update account' }
  }
}

export async function deleteAccount(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = session.user as SessionUser
    // Check if account has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        accountId: accountId,
        userId: user.id,
      },
    })

    if (transactionCount > 0) {
      // Deactivate instead of delete
      await prisma.appAccount.update({
        where: {
          id: accountId,
          userId: user.id,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      })
    } else {
      // Safe to delete
      await prisma.appAccount.delete({
        where: {
          id: accountId,
          userId: user.id,
        },
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/accounts')

    return { success: true }
  } catch (error) {
    console.error('Failed to delete account:', error)
    return { success: false, error: 'Failed to delete account' }
  }
}
