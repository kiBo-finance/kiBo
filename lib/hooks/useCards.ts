'use client'

import { useCallback, useEffect } from 'react'
import { useSetAtom, useAtom } from 'jotai'
import { cardsAtom } from '@/lib/atoms/accounts'
import { 
  getCards, 
  createCard as createCardAction,
  updateCard as updateCardAction,
  deleteCard as deleteCardAction
} from '@/lib/actions/cards'
import type { CardType } from '@prisma/client'

export function useCards() {
  const [cards, setCards] = useAtom(cardsAtom)

  const refreshCards = useCallback(async () => {
    try {
      const data = await getCards()
      if (data) {
        setCards(data)
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error)
    }
  }, [setCards])

  const createCard = useCallback(async (cardData: {
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
      const result = await createCardAction(cardData)
      if (result.success) {
        await refreshCards()
        return result
      }
      return result
    } catch (error) {
      console.error('Failed to create card:', error)
      return { success: false, error: 'Failed to create card' }
    }
  }, [refreshCards])

  const updateCard = useCallback(async (
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
      const result = await updateCardAction(cardId, cardData)
      if (result.success) {
        await refreshCards()
        return result
      }
      return result
    } catch (error) {
      console.error('Failed to update card:', error)
      return { success: false, error: 'Failed to update card' }
    }
  }, [refreshCards])

  const deleteCard = useCallback(async (cardId: string) => {
    try {
      const result = await deleteCardAction(cardId)
      if (result.success) {
        await refreshCards()
        return result
      }
      return result
    } catch (error) {
      console.error('Failed to delete card:', error)
      return { success: false, error: 'Failed to delete card' }
    }
  }, [refreshCards])

  // Load cards on mount
  useEffect(() => {
    refreshCards()
  }, [refreshCards])

  return {
    cards,
    refreshCards,
    createCard,
    updateCard,
    deleteCard
  }
}