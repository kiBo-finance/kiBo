import { describe, it, expect, beforeEach, afterEach, mock, spyOn, type Mock } from 'bun:test'
import type { CardType } from '@prisma/client'
import { Decimal } from 'decimal.js'

// Create mock functions
const mockCardCreate = mock(() => Promise.resolve({}))
const mockCardFindFirst = mock(() => Promise.resolve(null))
const mockCardFindUnique = mock(() => Promise.resolve(null))
const mockCardUpdate = mock(() => Promise.resolve({}))
const mockCardFindMany = mock(() => Promise.resolve([]))
const mockAppAccountFindFirst = mock(() => Promise.resolve(null))
const mockAppAccountFindUnique = mock(() => Promise.resolve(null))
const mockAppAccountUpdate = mock(() => Promise.resolve({}))
const mockTransactionCreate = mock(() => Promise.resolve({}))
const mockTransactionAggregate = mock(() => Promise.resolve({ _sum: { amount: null } }))
const mockAutoTransferCreate = mock(() => Promise.resolve({}))
const mockPrismaTransaction = mock((callback: Function) => callback({}))

// Mock prisma module
mock.module('~/lib/db', () => ({
  prisma: {
    card: {
      create: mockCardCreate,
      findFirst: mockCardFindFirst,
      findUnique: mockCardFindUnique,
      update: mockCardUpdate,
      findMany: mockCardFindMany,
    },
    appAccount: {
      findFirst: mockAppAccountFindFirst,
      findUnique: mockAppAccountFindUnique,
      update: mockAppAccountUpdate,
    },
    transaction: {
      create: mockTransactionCreate,
      aggregate: mockTransactionAggregate,
    },
    autoTransfer: {
      create: mockAutoTransferCreate,
    },
    $transaction: mockPrismaTransaction,
  },
}))

// Import after mocking
import { CardService } from '~/lib/services/card-service'
import { prisma } from '~/lib/db'

describe('CardService', () => {
  const mockUserId = 'user-123'
  const mockAccountId = 'account-123'
  const mockLinkedAccountId = 'linked-account-123'

  beforeEach(() => {
    // Reset all mocks
    mockCardCreate.mockReset()
    mockCardFindFirst.mockReset()
    mockCardFindUnique.mockReset()
    mockCardUpdate.mockReset()
    mockCardFindMany.mockReset()
    mockAppAccountFindFirst.mockReset()
    mockAppAccountFindUnique.mockReset()
    mockAppAccountUpdate.mockReset()
    mockTransactionCreate.mockReset()
    mockTransactionAggregate.mockReset()
    mockAutoTransferCreate.mockReset()
    mockPrismaTransaction.mockReset()
  })

  describe('createCard', () => {
    it('should create a credit card successfully', async () => {
      const mockAccount = {
        id: mockAccountId,
        userId: mockUserId,
        name: 'Test Account',
        currency: 'JPY',
      }

      const mockCard = {
        id: 'card-123',
        name: 'Test Credit Card',
        type: 'CREDIT' as CardType,
        lastFourDigits: '1234',
        creditLimit: new Decimal(100000),
        accountId: mockAccountId,
        userId: mockUserId,
        account: mockAccount,
        linkedAccount: null,
      }

      mockAppAccountFindFirst.mockResolvedValue(mockAccount)
      mockCardCreate.mockResolvedValue(mockCard)

      const input = {
        name: 'Test Credit Card',
        type: 'CREDIT' as CardType,
        lastFourDigits: '1234',
        accountId: mockAccountId,
        creditLimit: 100000,
        billingDate: 15,
        paymentDate: 10,
      }

      const result = await CardService.createCard(mockUserId, input)

      expect(mockAppAccountFindFirst).toHaveBeenCalledWith({
        where: { id: mockAccountId, userId: mockUserId },
      })

      expect(mockCardCreate).toHaveBeenCalledWith({
        data: {
          name: 'Test Credit Card',
          type: 'CREDIT',
          brand: undefined,
          lastFourDigits: '1234',
          accountId: mockAccountId,
          userId: mockUserId,
          creditLimit: new Decimal(100000),
          billingDate: 15,
          paymentDate: 10,
          balance: undefined,
          linkedAccountId: undefined,
          autoTransferEnabled: false,
          minBalance: undefined,
          monthlyLimit: undefined,
          settlementDay: undefined,
          expiryDate: undefined,
        },
        include: {
          account: true,
          linkedAccount: true,
        },
      })

      expect(result).toEqual(mockCard)
    })

    it('should create a debit card with auto transfer', async () => {
      const mockAccount = {
        id: mockAccountId,
        userId: mockUserId,
        name: 'Test Account',
        currency: 'JPY',
      }

      const mockLinkedAccount = {
        id: mockLinkedAccountId,
        userId: mockUserId,
        name: 'Linked Account',
        currency: 'JPY',
      }

      const mockCard = {
        id: 'card-123',
        name: 'Test Debit Card',
        type: 'DEBIT' as CardType,
        lastFourDigits: '5678',
        linkedAccountId: mockLinkedAccountId,
        autoTransferEnabled: true,
        accountId: mockAccountId,
        userId: mockUserId,
        account: mockAccount,
        linkedAccount: mockLinkedAccount,
      }

      mockAppAccountFindFirst
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockLinkedAccount)
      mockCardCreate.mockResolvedValue(mockCard)

      const input = {
        name: 'Test Debit Card',
        type: 'DEBIT' as CardType,
        lastFourDigits: '5678',
        accountId: mockAccountId,
        linkedAccountId: mockLinkedAccountId,
        autoTransferEnabled: true,
        minBalance: 10000,
      }

      const result = await CardService.createCard(mockUserId, input)

      expect(mockAppAccountFindFirst).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockCard)
    })

    it('should throw error if account not found', async () => {
      mockAppAccountFindFirst.mockResolvedValue(null)

      const input = {
        name: 'Test Card',
        type: 'CREDIT' as CardType,
        lastFourDigits: '1234',
        accountId: 'invalid-account',
      }

      await expect(CardService.createCard(mockUserId, input)).rejects.toThrow('Account not found')
    })

    it('should throw error if linked account not found for debit card', async () => {
      const mockAccount = {
        id: mockAccountId,
        userId: mockUserId,
      }

      mockAppAccountFindFirst
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(null)

      const input = {
        name: 'Test Debit Card',
        type: 'DEBIT' as CardType,
        lastFourDigits: '5678',
        accountId: mockAccountId,
        linkedAccountId: 'invalid-linked-account',
      }

      await expect(CardService.createCard(mockUserId, input)).rejects.toThrow(
        'Linked account not found'
      )
    })
  })

  describe('executeAutoTransfer', () => {
    it('should execute auto transfer successfully', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'DEBIT',
        balance: new Decimal(5000),
        autoTransferEnabled: true,
        linkedAccountId: mockLinkedAccountId,
        minBalance: new Decimal(10000),
        accountId: mockAccountId,
        userId: mockUserId,
        name: 'Test Debit Card',
        linkedAccount: {
          id: mockLinkedAccountId,
          balance: new Decimal(100000),
          name: 'Linked Account',
        },
        account: {
          id: mockAccountId,
          name: 'Card Account',
        },
      }

      const mockAutoTransfer = {
        id: 'transfer-123',
        cardId: 'card-123',
        fromAccountId: mockLinkedAccountId,
        toAccountId: mockAccountId,
        amount: new Decimal(25000),
        currency: 'JPY',
        status: 'COMPLETED',
      }

      mockCardFindUnique.mockResolvedValue(mockCard)
      mockPrismaTransaction.mockImplementation(
        async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
          return await callback({
            appAccount: {
              update: mock(() => Promise.resolve({})),
            },
            card: {
              update: mock(() => Promise.resolve({})),
            },
            autoTransfer: {
              create: mock(() => Promise.resolve(mockAutoTransfer)),
            },
            transaction: {
              create: mock(() => Promise.resolve({})),
            },
          })
        }
      )

      const requiredAmount = new Decimal(20000)
      const result = await CardService.executeAutoTransfer('card-123', requiredAmount, 'JPY')

      expect(mockCardFindUnique).toHaveBeenCalledWith({
        where: { id: 'card-123' },
        include: {
          account: true,
          linkedAccount: true,
        },
      })

      expect(result).toEqual(mockAutoTransfer)
    })

    it('should return null if transfer not needed', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'DEBIT',
        balance: new Decimal(50000),
        autoTransferEnabled: true,
        linkedAccountId: mockLinkedAccountId,
        minBalance: new Decimal(10000),
        userId: mockUserId,
        linkedAccount: {
          id: mockLinkedAccountId,
          balance: new Decimal(100000),
        },
      }

      mockCardFindUnique.mockResolvedValue(mockCard)

      const requiredAmount = new Decimal(20000)
      const result = await CardService.executeAutoTransfer('card-123', requiredAmount, 'JPY')

      expect(result).toBeNull()
    })

    it('should throw error if auto transfer not enabled', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'DEBIT',
        autoTransferEnabled: false,
        userId: mockUserId,
      }

      mockCardFindUnique.mockResolvedValue(mockCard)

      const requiredAmount = new Decimal(20000)

      await expect(
        CardService.executeAutoTransfer('card-123', requiredAmount, 'JPY')
      ).rejects.toThrow('Auto transfer not enabled')
    })

    it('should throw error if insufficient balance in linked account', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'DEBIT',
        balance: new Decimal(0),
        autoTransferEnabled: true,
        linkedAccountId: mockLinkedAccountId,
        minBalance: new Decimal(10000),
        userId: mockUserId,
        linkedAccount: {
          id: mockLinkedAccountId,
          balance: new Decimal(5000),
        },
      }

      mockCardFindUnique.mockResolvedValue(mockCard)

      const requiredAmount = new Decimal(20000)

      await expect(
        CardService.executeAutoTransfer('card-123', requiredAmount, 'JPY')
      ).rejects.toThrow('Insufficient balance in linked account')
    })
  })

  describe('processCardPayment', () => {
    it('should process credit card payment successfully', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'CREDIT',
        creditLimit: new Decimal(100000),
        userId: mockUserId,
        isActive: true,
        account: {
          id: mockAccountId,
          currency: 'JPY',
        },
      }

      const mockTransaction = {
        id: 'transaction-123',
        amount: new Decimal(5000),
        currency: 'JPY',
        type: 'EXPENSE',
        description: 'Test payment',
        cardId: 'card-123',
        userId: mockUserId,
      }

      mockCardFindFirst.mockResolvedValue(mockCard)
      mockTransactionAggregate.mockResolvedValue({
        _sum: { amount: new Decimal(10000) },
      })
      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        return await callback({
          card: { update: mock(() => Promise.resolve({})) },
          transaction: { create: mock(() => Promise.resolve(mockTransaction)) },
        })
      })

      const result = await CardService.processCardPayment(
        mockUserId,
        'card-123',
        5000,
        'JPY',
        'Test payment'
      )

      expect(mockCardFindFirst).toHaveBeenCalledWith({
        where: { id: 'card-123', userId: mockUserId, isActive: true },
        include: { account: true },
      })

      expect(result).toEqual(mockTransaction)
    })

    it('should throw error if credit limit exceeded', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'CREDIT',
        creditLimit: new Decimal(100000),
        userId: mockUserId,
        isActive: true,
        account: { id: mockAccountId, currency: 'JPY' },
      }

      mockCardFindFirst.mockResolvedValue(mockCard)
      mockTransactionAggregate.mockResolvedValue({
        _sum: { amount: new Decimal(95000) },
      })

      await expect(
        CardService.processCardPayment(mockUserId, 'card-123', 10000, 'JPY', 'Test payment')
      ).rejects.toThrow('Credit limit exceeded')
    })

    it('should process debit card payment with auto transfer', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'DEBIT',
        balance: new Decimal(3000),
        autoTransferEnabled: true,
        userId: mockUserId,
        isActive: true,
        account: { id: mockAccountId, currency: 'JPY' },
      }

      const mockTransaction = {
        id: 'transaction-123',
        amount: new Decimal(5000),
        currency: 'JPY',
        type: 'EXPENSE',
        cardId: 'card-123',
        userId: mockUserId,
      }

      mockCardFindFirst.mockResolvedValue(mockCard)

      const executeAutoTransferSpy = spyOn(CardService, 'executeAutoTransfer').mockResolvedValue(
        {} as Awaited<ReturnType<typeof CardService.executeAutoTransfer>>
      )

      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        return await callback({
          card: { update: mock(() => Promise.resolve({})) },
          transaction: { create: mock(() => Promise.resolve(mockTransaction)) },
        })
      })

      const result = await CardService.processCardPayment(
        mockUserId,
        'card-123',
        5000,
        'JPY',
        'Test payment'
      )

      expect(executeAutoTransferSpy).toHaveBeenCalledWith('card-123', new Decimal(5000), 'JPY')
      expect(result).toEqual(mockTransaction)

      executeAutoTransferSpy.mockRestore()
    })

    it('should throw error for insufficient prepaid balance', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'PREPAID',
        balance: new Decimal(3000),
        userId: mockUserId,
        isActive: true,
        account: { id: mockAccountId, currency: 'JPY' },
      }

      mockCardFindFirst.mockResolvedValue(mockCard)

      await expect(
        CardService.processCardPayment(mockUserId, 'card-123', 5000, 'JPY', 'Test payment')
      ).rejects.toThrow('Insufficient prepaid balance')
    })
  })

  describe('chargePrepaidCard', () => {
    it('should charge prepaid card successfully', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'PREPAID',
        balance: new Decimal(5000),
        userId: mockUserId,
      }

      const mockFromAccount = {
        id: 'from-account-123',
        balance: new Decimal(50000),
        currency: 'JPY',
        userId: mockUserId,
      }

      mockCardFindFirst.mockResolvedValue(mockCard)
      mockAppAccountFindFirst.mockResolvedValue(mockFromAccount)
      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        return await callback({
          appAccount: { update: mock(() => Promise.resolve({})) },
          card: { update: mock(() => Promise.resolve({})) },
          transaction: { create: mock(() => Promise.resolve({})) },
        })
      })

      const result = await CardService.chargePrepaidCard(
        mockUserId,
        'card-123',
        10000,
        'from-account-123'
      )

      expect(result).toBe(true)
      expect(mockCardFindFirst).toHaveBeenCalledWith({
        where: { id: 'card-123', userId: mockUserId, type: 'PREPAID' },
      })
    })

    it('should throw error if prepaid card not found', async () => {
      mockCardFindFirst.mockResolvedValue(null)

      await expect(
        CardService.chargePrepaidCard(mockUserId, 'card-123', 10000, 'from-account-123')
      ).rejects.toThrow('Prepaid card not found')
    })

    it('should throw error if insufficient balance in source account', async () => {
      const mockCard = {
        id: 'card-123',
        type: 'PREPAID',
        userId: mockUserId,
      }

      const mockFromAccount = {
        id: 'from-account-123',
        balance: new Decimal(5000),
        userId: mockUserId,
      }

      mockCardFindFirst.mockResolvedValue(mockCard)
      mockAppAccountFindFirst.mockResolvedValue(mockFromAccount)

      await expect(
        CardService.chargePrepaidCard(mockUserId, 'card-123', 10000, 'from-account-123')
      ).rejects.toThrow('Insufficient balance in source account')
    })
  })

  describe('getCards', () => {
    it('should return active cards by default', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Card 1',
          isActive: true,
          userId: mockUserId,
        },
        {
          id: 'card-2',
          name: 'Card 2',
          isActive: true,
          userId: mockUserId,
        },
      ]

      mockCardFindMany.mockResolvedValue(mockCards)

      const result = await CardService.getCards(mockUserId)

      expect(mockCardFindMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, isActive: true },
        include: {
          account: true,
          linkedAccount: true,
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      expect(result).toEqual(mockCards)
    })

    it('should return all cards when includeInactive is true', async () => {
      const mockCards = [
        { id: 'card-1', isActive: true },
        { id: 'card-2', isActive: false },
      ]

      mockCardFindMany.mockResolvedValue(mockCards)

      const result = await CardService.getCards(mockUserId, true)

      expect(mockCardFindMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: {
          account: true,
          linkedAccount: true,
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      expect(result).toEqual(mockCards)
    })
  })

  describe('getCardDetail', () => {
    it('should return card detail with monthly usage', async () => {
      const mockCard = {
        id: 'card-123',
        name: 'Test Card',
        userId: mockUserId,
        account: { id: mockAccountId },
        transactions: [],
        autoTransfers: [],
      }

      const mockMonthlyUsage = {
        _sum: { amount: new Decimal(15000) },
      }

      mockCardFindFirst.mockResolvedValue(mockCard)
      mockTransactionAggregate.mockResolvedValue(mockMonthlyUsage)

      const result = await CardService.getCardDetail(mockUserId, 'card-123')

      expect(result).toEqual({
        ...mockCard,
        monthlyUsage: new Decimal(15000),
      })
    })

    it('should throw error if card not found', async () => {
      mockCardFindFirst.mockResolvedValue(null)

      await expect(CardService.getCardDetail(mockUserId, 'card-123')).rejects.toThrow(
        'Card not found'
      )
    })
  })
})
