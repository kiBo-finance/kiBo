'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Card, CardType } from '@prisma/client'

export async function getCards(): Promise<(Card & { account: { name: string; currency: string } })[] | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return null
    }

    const cards = await prisma.card.findMany({
      where: {
        userId: (session.user as any).id,
        isActive: true
      },
      include: {
        account: {
          select: {
            name: true,
            currency: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return cards
  } catch (error) {
    console.error('Failed to fetch cards:', error)
    return null
  }
}

export async function getAllCards(): Promise<(Card & { account: { name: string; currency: string } })[] | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return null
    }

    const cards = await prisma.card.findMany({
      where: {
        userId: (session.user as any).id
      },
      include: {
        account: {
          select: {
            name: true,
            currency: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return cards
  } catch (error) {
    console.error('Failed to fetch all cards:', error)
    return null
  }
}

export async function createCard(data: {
  name: string
  type: CardType
  lastFourDigits: string
  accountId: string
  brand?: string
  creditLimit?: number
  billingDate?: number
  paymentDate?: number
  balance?: number
  linkedAccountId?: string
  autoTransferEnabled?: boolean
  minBalance?: number
  monthlyLimit?: number
  settlementDay?: number
  expiryDate?: Date
}): Promise<{ success: boolean; data?: Card; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const card = await prisma.card.create({
      data: {
        userId: (session.user as any).id,
        name: data.name,
        type: data.type,
        lastFourDigits: data.lastFourDigits,
        accountId: data.accountId,
        brand: data.brand,
        creditLimit: data.creditLimit,
        billingDate: data.billingDate,
        paymentDate: data.paymentDate,
        balance: data.balance,
        linkedAccountId: data.linkedAccountId,
        autoTransferEnabled: data.autoTransferEnabled || false,
        minBalance: data.minBalance,
        monthlyLimit: data.monthlyLimit,
        settlementDay: data.settlementDay,
        expiryDate: data.expiryDate,
        isActive: true
      }
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/cards')

    return { success: true, data: card }
  } catch (error) {
    console.error('Failed to create card:', error)
    return { success: false, error: 'Failed to create card' }
  }
}

export async function updateCard(
  cardId: string,
  data: Partial<{
    name: string
    brand: string
    creditLimit: number
    billingDate: number
    paymentDate: number
    balance: number
    linkedAccountId: string
    autoTransferEnabled: boolean
    minBalance: number
    monthlyLimit: number
    settlementDay: number
    expiryDate: Date
    isActive: boolean
  }>
): Promise<{ success: boolean; data?: Card; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const card = await prisma.card.update({
      where: {
        id: cardId,
        userId: (session.user as any).id
      },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/cards')

    return { success: true, data: card }
  } catch (error) {
    console.error('Failed to update card:', error)
    return { success: false, error: 'Failed to update card' }
  }
}

export async function deleteCard(cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if card has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        cardId: cardId,
        userId: (session.user as any).id
      }
    })

    if (transactionCount > 0) {
      // Deactivate instead of delete
      await prisma.card.update({
        where: {
          id: cardId,
          userId: (session.user as any).id
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })
    } else {
      // Safe to delete
      await prisma.card.delete({
        where: {
          id: cardId,
          userId: (session.user as any).id
        }
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/cards')

    return { success: true }
  } catch (error) {
    console.error('Failed to delete card:', error)
    return { success: false, error: 'Failed to delete card' }
  }
}