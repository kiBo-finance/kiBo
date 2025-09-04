import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/db'
import { Decimal } from 'decimal.js'

describe('Card Database Schema Tests', () => {
  let testUser: any
  let testAccount: any
  let testCategory: any

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        id: 'schema-test-user',
        email: 'schema-test@example.com',
        name: 'Schema Test User',
        emailVerified: false
      }
    })

    testAccount = await prisma.appAccount.create({
      data: {
        userId: testUser.id,
        name: 'Schema Test Account',
        type: 'CHECKING',
        currency: 'JPY',
        balance: '1000000'
      }
    })

    testCategory = await prisma.category.create({
      data: {
        userId: testUser.id,
        name: 'Test Category',
        type: 'EXPENSE',
        color: '#FF0000'
      }
    })
  })

  afterAll(async () => {
    await prisma.card.deleteMany({ where: { userId: testUser.id } })
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } })
    await prisma.autoTransfer.deleteMany()
    await prisma.category.deleteMany({ where: { userId: testUser.id } })
    await prisma.appAccount.deleteMany({ where: { userId: testUser.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  beforeEach(async () => {
    await prisma.card.deleteMany({ where: { userId: testUser.id } })
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } })
    await prisma.autoTransfer.deleteMany()
  })

  describe('Card Model Schema', () => {
    it('should create credit card with all required fields', async () => {
      const creditCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Test Credit Card',
          type: 'CREDIT',
          lastFourDigits: '1234',
          creditLimit: '500000',
          billingDate: 15,
          paymentDate: 10,
          isActive: true
        }
      })

      expect(creditCard.id).toBeDefined()
      expect(creditCard.type).toBe('CREDIT')
      expect(creditCard.creditLimit).toBe('500000')
      expect(creditCard.billingDate).toBe(15)
      expect(creditCard.paymentDate).toBe(10)
      expect(creditCard.balance).toBeNull()
      expect(creditCard.autoTransferEnabled).toBe(false)
      expect(creditCard.isActive).toBe(true)
      expect(creditCard.createdAt).toBeInstanceOf(Date)
      expect(creditCard.updatedAt).toBeInstanceOf(Date)
    })

    it('should create debit card with auto transfer fields', async () => {
      const linkedAccount = await prisma.appAccount.create({
        data: {
          userId: testUser.id,
          name: 'Linked Account',
          type: 'SAVINGS',
          currency: 'JPY',
          balance: '500000'
        }
      })

      const debitCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Test Debit Card',
          type: 'DEBIT',
          lastFourDigits: '5678',
          balance: '100000',
          autoTransferEnabled: true,
          linkedAccountId: linkedAccount.id,
          minBalance: '10000',
          isActive: true
        }
      })

      expect(debitCard.type).toBe('DEBIT')
      expect(debitCard.balance).toBe('100000')
      expect(debitCard.autoTransferEnabled).toBe(true)
      expect(debitCard.linkedAccountId).toBe(linkedAccount.id)
      expect(debitCard.minBalance).toBe('10000')
      expect(debitCard.creditLimit).toBeNull()

      await prisma.appAccount.delete({ where: { id: linkedAccount.id } })
    })

    it('should create prepaid card with balance', async () => {
      const prepaidCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Test Prepaid Card',
          type: 'PREPAID',
          lastFourDigits: '9012',
          balance: '50000',
          isActive: true
        }
      })

      expect(prepaidCard.type).toBe('PREPAID')
      expect(prepaidCard.balance).toBe('50000')
      expect(prepaidCard.creditLimit).toBeNull()
      expect(prepaidCard.monthlyLimit).toBeNull()
      expect(prepaidCard.autoTransferEnabled).toBe(false)
    })

    it('should create postpay card with monthly limits', async () => {
      const postpayCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Test Postpay Card',
          type: 'POSTPAY',
          lastFourDigits: '3456',
          monthlyLimit: '100000',
          settlementDay: 25,
          isActive: true
        }
      })

      expect(postpayCard.type).toBe('POSTPAY')
      expect(postpayCard.monthlyLimit).toBe('100000')
      expect(postpayCard.settlementDay).toBe(25)
      expect(postpayCard.creditLimit).toBeNull()
      expect(postpayCard.balance).toBeNull()
    })

    it('should enforce foreign key constraints', async () => {
      await expect(
        prisma.card.create({
          data: {
            userId: 'non-existent-user',
            accountId: testAccount.id,
            name: 'Invalid User Card',
            type: 'CREDIT',
            lastFourDigits: '0000'
          }
        })
      ).rejects.toThrow()

      await expect(
        prisma.card.create({
          data: {
            userId: testUser.id,
            accountId: 'non-existent-account',
            name: 'Invalid Account Card',
            type: 'CREDIT',
            lastFourDigits: '0000'
          }
        })
      ).rejects.toThrow()
    })

    it('should handle decimal precision for monetary fields', async () => {
      const card = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Precision Test Card',
          type: 'CREDIT',
          lastFourDigits: '7777',
          creditLimit: '123456.78',
          isActive: true
        }
      })

      expect(card.creditLimit).toBe('123456.78')

      const updatedCard = await prisma.card.update({
        where: { id: card.id },
        data: { creditLimit: '999999.99' }
      })

      expect(updatedCard.creditLimit).toBe('999999.99')
    })

    it('should cascade delete when user is deleted', async () => {
      const tempUser = await prisma.user.create({
        data: {
          id: 'temp-user-for-cascade',
          email: 'temp@example.com',
          name: 'Temp User',
          emailVerified: false
        }
      })

      const tempAccount = await prisma.appAccount.create({
        data: {
          userId: tempUser.id,
          name: 'Temp Account',
          type: 'CHECKING',
          currency: 'JPY',
          balance: '100000'
        }
      })

      const card = await prisma.card.create({
        data: {
          userId: tempUser.id,
          accountId: tempAccount.id,
          name: 'Card to be cascaded',
          type: 'CREDIT',
          lastFourDigits: '8888'
        }
      })

      await prisma.appAccount.delete({ where: { id: tempAccount.id } })
      await prisma.user.delete({ where: { id: tempUser.id } })

      const deletedCard = await prisma.card.findUnique({
        where: { id: card.id }
      })
      expect(deletedCard).toBeNull()
    })
  })

  describe('Transaction Model with Card Relations', () => {
    let testCard: any

    beforeEach(async () => {
      testCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Transaction Test Card',
          type: 'CREDIT',
          lastFourDigits: '1111',
          creditLimit: '500000',
          isActive: true
        }
      })
    })

    it('should create transaction linked to card', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          cardId: testCard.id,
          type: 'EXPENSE',
          amount: '15000',
          currency: 'JPY',
          description: 'Card payment transaction',
          date: new Date(),
          categoryId: testCategory.id
        }
      })

      expect(transaction.cardId).toBe(testCard.id)
      expect(transaction.amount).toBe('15000')
      expect(transaction.currency).toBe('JPY')
      expect(transaction.type).toBe('EXPENSE')

      const cardWithTransactions = await prisma.card.findUnique({
        where: { id: testCard.id },
        include: {
          transactions: true
        }
      })

      expect(cardWithTransactions?.transactions).toHaveLength(1)
      expect(cardWithTransactions?.transactions[0].id).toBe(transaction.id)
    })

    it('should allow transactions without card reference', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          type: 'INCOME',
          amount: '50000',
          currency: 'JPY',
          description: 'Non-card transaction',
          date: new Date()
        }
      })

      expect(transaction.cardId).toBeNull()
      expect(transaction.amount).toBe('50000')
    })

    it('should count transactions per card correctly', async () => {
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUser.id,
            accountId: testAccount.id,
            cardId: testCard.id,
            type: 'EXPENSE',
            amount: '1000',
            currency: 'JPY',
            description: 'Transaction 1',
            date: new Date()
          },
          {
            userId: testUser.id,
            accountId: testAccount.id,
            cardId: testCard.id,
            type: 'EXPENSE',
            amount: '2000',
            currency: 'JPY',
            description: 'Transaction 2',
            date: new Date()
          },
          {
            userId: testUser.id,
            accountId: testAccount.id,
            type: 'EXPENSE',
            amount: '3000',
            currency: 'JPY',
            description: 'Non-card transaction',
            date: new Date()
          }
        ]
      })

      const cardWithCount = await prisma.card.findUnique({
        where: { id: testCard.id },
        include: {
          _count: {
            select: { transactions: true }
          }
        }
      })

      expect(cardWithCount?._count.transactions).toBe(2)
    })
  })

  describe('AutoTransfer Model Schema', () => {
    let testCard: any
    let linkedAccount: any

    beforeEach(async () => {
      linkedAccount = await prisma.appAccount.create({
        data: {
          userId: testUser.id,
          name: 'Linked Transfer Account',
          type: 'SAVINGS',
          currency: 'JPY',
          balance: '500000'
        }
      })

      testCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Auto Transfer Test Card',
          type: 'DEBIT',
          lastFourDigits: '2222',
          balance: '10000',
          autoTransferEnabled: true,
          linkedAccountId: linkedAccount.id,
          minBalance: '5000',
          isActive: true
        }
      })
    })

    afterEach(async () => {
      if (linkedAccount) {
        await prisma.appAccount.delete({ where: { id: linkedAccount.id } })
      }
    })

    it('should create auto transfer record', async () => {
      const autoTransfer = await prisma.autoTransfer.create({
        data: {
          cardId: testCard.id,
          fromAccountId: linkedAccount.id,
          toAccountId: testAccount.id,
          amount: '20000',
          currency: 'JPY',
          status: 'COMPLETED',
          triggeredBy: 'PAYMENT',
          triggeredAt: new Date(),
          completedAt: new Date()
        }
      })

      expect(autoTransfer.cardId).toBe(testCard.id)
      expect(autoTransfer.fromAccountId).toBe(linkedAccount.id)
      expect(autoTransfer.toAccountId).toBe(testAccount.id)
      expect(autoTransfer.amount).toBe('20000')
      expect(autoTransfer.currency).toBe('JPY')
      expect(autoTransfer.status).toBe('COMPLETED')
      expect(autoTransfer.triggeredBy).toBe('PAYMENT')
    })

    it('should link auto transfers to card correctly', async () => {
      await prisma.autoTransfer.createMany({
        data: [
          {
            cardId: testCard.id,
            fromAccountId: linkedAccount.id,
            toAccountId: testAccount.id,
            amount: '10000',
            currency: 'JPY',
            status: 'COMPLETED',
            triggeredBy: 'PAYMENT',
            triggeredAt: new Date(),
            completedAt: new Date()
          },
          {
            cardId: testCard.id,
            fromAccountId: linkedAccount.id,
            toAccountId: testAccount.id,
            amount: '15000',
            currency: 'JPY',
            status: 'COMPLETED',
            triggeredBy: 'LOW_BALANCE',
            triggeredAt: new Date(),
            completedAt: new Date()
          }
        ]
      })

      const cardWithTransfers = await prisma.card.findUnique({
        where: { id: testCard.id },
        include: {
          autoTransfers: true
        }
      })

      expect(cardWithTransfers?.autoTransfers).toHaveLength(2)
      expect(cardWithTransfers?.autoTransfers.map(t => t.triggeredBy)).toContain('PAYMENT')
      expect(cardWithTransfers?.autoTransfers.map(t => t.triggeredBy)).toContain('LOW_BALANCE')
    })

    it('should handle auto transfer status transitions', async () => {
      const autoTransfer = await prisma.autoTransfer.create({
        data: {
          cardId: testCard.id,
          fromAccountId: linkedAccount.id,
          toAccountId: testAccount.id,
          amount: '25000',
          currency: 'JPY',
          status: 'PENDING',
          triggeredBy: 'PAYMENT',
          triggeredAt: new Date()
        }
      })

      expect(autoTransfer.status).toBe('PENDING')
      expect(autoTransfer.completedAt).toBeNull()

      const updatedTransfer = await prisma.autoTransfer.update({
        where: { id: autoTransfer.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })

      expect(updatedTransfer.status).toBe('COMPLETED')
      expect(updatedTransfer.completedAt).not.toBeNull()
    })

    it('should enforce foreign key constraints for auto transfers', async () => {
      await expect(
        prisma.autoTransfer.create({
          data: {
            cardId: 'non-existent-card',
            fromAccountId: linkedAccount.id,
            toAccountId: testAccount.id,
            amount: '10000',
            currency: 'JPY',
            status: 'PENDING',
            triggeredBy: 'PAYMENT',
            triggeredAt: new Date()
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Card Relationships and Includes', () => {
    let testCard: any

    beforeEach(async () => {
      testCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Relationship Test Card',
          type: 'CREDIT',
          lastFourDigits: '3333',
          creditLimit: '300000',
          isActive: true
        }
      })
    })

    it('should include all related data in card query', async () => {
      await prisma.transaction.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          cardId: testCard.id,
          type: 'EXPENSE',
          amount: '5000',
          currency: 'JPY',
          description: 'Test transaction',
          date: new Date(),
          categoryId: testCategory.id
        }
      })

      const cardWithAllRelations = await prisma.card.findUnique({
        where: { id: testCard.id },
        include: {
          account: true,
          linkedAccount: true,
          transactions: {
            include: {
              category: true
            }
          },
          autoTransfers: true,
          _count: {
            select: { transactions: true }
          }
        }
      })

      expect(cardWithAllRelations?.account.name).toBe('Schema Test Account')
      expect(cardWithAllRelations?.transactions).toHaveLength(1)
      expect(cardWithAllRelations?.transactions[0].category?.name).toBe('Test Category')
      expect(cardWithAllRelations?._count.transactions).toBe(1)
      expect(cardWithAllRelations?.autoTransfers).toHaveLength(0)
    })

    it('should query cards with complex filtering', async () => {
      const anotherCard = await prisma.card.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Another Test Card',
          type: 'DEBIT',
          lastFourDigits: '4444',
          balance: '50000',
          isActive: false
        }
      })

      const activeCards = await prisma.card.findMany({
        where: {
          userId: testUser.id,
          isActive: true
        }
      })

      const inactiveCards = await prisma.card.findMany({
        where: {
          userId: testUser.id,
          isActive: false
        }
      })

      expect(activeCards).toHaveLength(1)
      expect(activeCards[0].id).toBe(testCard.id)
      expect(inactiveCards).toHaveLength(1)
      expect(inactiveCards[0].id).toBe(anotherCard.id)
    })
  })
})