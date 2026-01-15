'use client'

import { cardsAtom } from '../atoms/accounts'
import type { CardType } from '@prisma/client'
import { useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

export function useCards() {
  const [cards, setCards] = useAtom(cardsAtom)

  const refreshCards = useCallback(async () => {
    try {
      const response = await fetch('/api/cards', {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setCards(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error)
    }
  }, [setCards])

  const createCard = useCallback(
    async (cardData: {
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
    }) => {
      try {
        const response = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(cardData),
        })
        const result = await response.json()
        if (result.success) {
          await refreshCards()
          return result
        }
        return { success: false, error: result.error || 'Failed to create card' }
      } catch (error) {
        console.error('Failed to create card:', error)
        return { success: false, error: 'Failed to create card' }
      }
    },
    [refreshCards]
  )

  const updateCard = useCallback(
    async (
      cardId: string,
      cardData: Partial<{
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
    ) => {
      try {
        const response = await fetch(`/api/cards/${cardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(cardData),
        })
        const result = await response.json()
        if (result.success) {
          await refreshCards()
          return result
        }
        return { success: false, error: result.error || 'Failed to update card' }
      } catch (error) {
        console.error('Failed to update card:', error)
        return { success: false, error: 'Failed to update card' }
      }
    },
    [refreshCards]
  )

  const deleteCard = useCallback(
    async (cardId: string) => {
      try {
        const response = await fetch(`/api/cards/${cardId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        const result = await response.json()
        if (result.success) {
          await refreshCards()
          return result
        }
        return { success: false, error: result.error || 'Failed to delete card' }
      } catch (error) {
        console.error('Failed to delete card:', error)
        return { success: false, error: 'Failed to delete card' }
      }
    },
    [refreshCards]
  )

  // Load cards on mount
  useEffect(() => {
    refreshCards()
  }, [refreshCards])

  return {
    cards,
    refreshCards,
    createCard,
    updateCard,
    deleteCard,
  }
}
