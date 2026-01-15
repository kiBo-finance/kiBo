import { describe, it, expect, beforeEach, mock } from 'bun:test'
import Decimal from 'decimal.js'

// Define mock functions at the top level
const mockGetSession = mock(() => Promise.resolve(null))
const mockTransactionCreate = mock(() => Promise.resolve(null))
const mockTransactionFindMany = mock(() => Promise.resolve([]))
const mockTransactionCount = mock(() => Promise.resolve(0))
const mockScheduledTransactionCreate = mock(() => Promise.resolve(null))
const mockScheduledTransactionFindMany = mock(() => Promise.resolve([]))
const mockScheduledTransactionFindFirst = mock(() => Promise.resolve(null))
const mockScheduledTransactionCount = mock(() => Promise.resolve(0))
const mockScheduledTransactionUpdateMany = mock(() => Promise.resolve({ count: 0 }))
const mockCurrencyFindUnique = mock(() => Promise.resolve(null))
const mockAppAccountFindFirst = mock(() => Promise.resolve(null))
const mockAppAccountUpdate = mock(() => Promise.resolve(null))
const mockCategoryFindFirst = mock(() => Promise.resolve(null))
const mockDbTransaction = mock(() => Promise.resolve(null))

// Mock dependencies before importing
mock.module('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

mock.module('~/lib/db', () => ({
  prisma: {
    transaction: {
      create: mockTransactionCreate,
      findMany: mockTransactionFindMany,
      count: mockTransactionCount,
    },
    scheduledTransaction: {
      create: mockScheduledTransactionCreate,
      findMany: mockScheduledTransactionFindMany,
      findFirst: mockScheduledTransactionFindFirst,
      count: mockScheduledTransactionCount,
      updateMany: mockScheduledTransactionUpdateMany,
    },
    currency: {
      findUnique: mockCurrencyFindUnique,
    },
    appAccount: {
      findFirst: mockAppAccountFindFirst,
      update: mockAppAccountUpdate,
    },
    category: {
      findFirst: mockCategoryFindFirst,
    },
    $transaction: mockDbTransaction,
  },
}))

mock.module('next/headers', () => ({
  headers: mock(() => Promise.resolve({})),
}))

import { POST as executeScheduled } from '~/pages/_api/scheduled-transactions/[id]'
import {
  POST as createScheduled,
  GET as getScheduled,
} from '~/pages/_api/scheduled-transactions/index'
import { POST as createTransaction, GET as getTransactions } from '~/pages/_api/transactions/index'
import { prisma } from '~/lib/db'

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
}

const mockSession = {
  user: mockUser,
}

const mockCurrency = {
  code: 'JPY',
  symbol: '\u00a5',
  name: '\u65e5\u672c\u5186',
  decimals: 0,
  isActive: true,
}

const mockAccount = {
  id: 'account-1',
  name: '\u30e1\u30a4\u30f3\u53e3\u5ea7',
  type: 'CHECKING',
  balance: new Decimal('100000'),
  currency: 'JPY',
  userId: 'user-1',
  currencyRef: mockCurrency,
}

const mockCategory = {
  id: 'category-1',
  name: '\u98df\u8cbb',
  type: 'EXPENSE',
  userId: 'user-1',
}

describe('Transaction Workflow Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    mockGetSession.mockReset()
    mockTransactionCreate.mockReset()
    mockTransactionFindMany.mockReset()
    mockTransactionCount.mockReset()
    mockScheduledTransactionCreate.mockReset()
    mockScheduledTransactionFindMany.mockReset()
    mockScheduledTransactionFindFirst.mockReset()
    mockScheduledTransactionCount.mockReset()
    mockScheduledTransactionUpdateMany.mockReset()
    mockCurrencyFindUnique.mockReset()
    mockAppAccountFindFirst.mockReset()
    mockAppAccountUpdate.mockReset()
    mockCategoryFindFirst.mockReset()
    mockDbTransaction.mockReset()

    // Set default implementations
    mockGetSession.mockImplementation(() => Promise.resolve(mockSession))
    mockCurrencyFindUnique.mockImplementation(() => Promise.resolve(mockCurrency))
    mockAppAccountFindFirst.mockImplementation(() => Promise.resolve(mockAccount))
    mockCategoryFindFirst.mockImplementation(() => Promise.resolve(mockCategory))
  })

  describe('Complete Transaction Lifecycle', () => {
    it('should create a transaction and update account balance correctly', async () => {
      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('5000'),
        currency: 'JPY',
        type: 'EXPENSE',
        description: '\u30e9\u30f3\u30c1',
        date: new Date('2024-01-15'),
        accountId: 'account-1',
        userId: 'user-1',
        account: {
          ...mockAccount,
          currencyRef: mockCurrency,
        },
        category: mockCategory,
        currencyRef: mockCurrency,
      }

      mockTransactionCreate.mockImplementation(() => Promise.resolve(mockTransaction))
      mockAppAccountUpdate.mockImplementation(() =>
        Promise.resolve({
          ...mockAccount,
          balance: new Decimal('95000'),
        })
      )

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: '\u30e9\u30f3\u30c1',
          date: '2024-01-15T12:00:00.000Z',
          accountId: 'account-1',
          categoryId: 'category-1',
        }),
      })

      const response = await createTransaction(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe('5000')

      // Verify account balance was decremented for expense
      expect(prisma.appAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          balance: {
            increment: -5000,
          },
        },
      })
    })

    it('should handle income transactions with positive balance change', async () => {
      const mockIncomeTransaction = {
        id: 'tx-2',
        amount: new Decimal('300000'),
        currency: 'JPY',
        type: 'INCOME',
        description: '\u7d66\u4e0e',
        date: new Date('2024-01-31'),
        accountId: 'account-1',
        userId: 'user-1',
        account: {
          ...mockAccount,
          currencyRef: mockCurrency,
        },
        category: mockCategory,
        currencyRef: mockCurrency,
      }

      mockTransactionCreate.mockImplementation(() => Promise.resolve(mockIncomeTransaction))
      mockAppAccountUpdate.mockImplementation(() =>
        Promise.resolve({
          ...mockAccount,
          balance: new Decimal('400000'),
        })
      )

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 300000,
          currency: 'JPY',
          type: 'INCOME',
          description: '\u7d66\u4e0e',
          date: '2024-01-31T12:00:00.000Z',
          accountId: 'account-1',
          categoryId: 'category-1',
        }),
      })

      const response = await createTransaction(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify account balance was incremented for income
      expect(prisma.appAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          balance: {
            increment: 300000,
          },
        },
      })
    })
  })

  describe('Scheduled Transaction Execution Workflow', () => {
    it('should create scheduled transaction and later execute it', async () => {
      // Step 1: Create scheduled transaction
      const mockScheduledTransaction = {
        id: 'scheduled-1',
        amount: new Decimal('15000'),
        currency: 'JPY',
        type: 'EXPENSE',
        description: '\u5149\u71b1\u8cbb',
        accountId: 'account-1',
        categoryId: 'category-1',
        userId: 'user-1',
        dueDate: new Date('2024-02-15'),
        frequency: 'MONTHLY',
        endDate: new Date('2024-12-31'),
        isRecurring: true,
        status: 'PENDING',
        reminderDays: 3,
        notes: '\u96fb\u6c17\u4ee3',
        account: mockAccount,
        category: mockCategory,
        currencyRef: mockCurrency,
      }

      mockScheduledTransactionCreate.mockImplementation(() =>
        Promise.resolve(mockScheduledTransaction)
      )

      const createRequest = new Request('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 15000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: '\u5149\u71b1\u8cbb',
          accountId: 'account-1',
          categoryId: 'category-1',
          dueDate: '2024-02-15T00:00:00.000Z',
          frequency: 'MONTHLY',
          endDate: '2024-12-31T23:59:59.999Z',
          isRecurring: true,
          reminderDays: 3,
          notes: '\u96fb\u6c17\u4ee3',
        }),
      })

      const createResponse = await createScheduled(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(200)
      expect(createData.success).toBe(true)
      expect(createData.data.description).toBe('\u5149\u71b1\u8cbb')
      expect(createData.data.isRecurring).toBe(true)

      // Step 2: Execute the scheduled transaction
      mockScheduledTransactionFindFirst.mockImplementation(() =>
        Promise.resolve(mockScheduledTransaction)
      )

      const mockExecutedTransaction = {
        id: 'tx-3',
        amount: new Decimal('15000'),
        currency: 'JPY',
        type: 'EXPENSE',
        description: '\u5149\u71b1\u8cbb (\u4e88\u5b9a\u53d6\u5f15\u5b9f\u884c)',
        date: new Date('2024-02-15'),
        accountId: 'account-1',
        userId: 'user-1',
        account: mockAccount,
        currencyRef: mockCurrency,
        exchangeRate: null,
        baseCurrencyAmount: null,
      }

      const mockNextScheduled = {
        ...mockScheduledTransaction,
        id: 'scheduled-2',
        dueDate: new Date('2024-03-15'),
      }

      mockDbTransaction.mockImplementation(async () => {
        return {
          transaction: mockExecutedTransaction,
          scheduledTransaction: { ...mockScheduledTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: mockNextScheduled,
        }
      })

      const executeRequest = new Request(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executeDate: '2024-02-15T10:00:00.000Z',
            createRecurring: true,
          }),
        }
      )

      const executeResponse = await executeScheduled(executeRequest, {
        params: { id: 'scheduled-1' },
      })
      const executeData = await executeResponse.json()

      expect(executeResponse.status).toBe(200)
      expect(executeData.success).toBe(true)
      expect(executeData.message).toBe('\u4e88\u5b9a\u53d6\u5f15\u304c\u5b9f\u884c\u3055\u308c\u307e\u3057\u305f')
      expect(executeData.data.nextScheduledTransaction).toBeTruthy()

      // Verify that the transaction execution logic is called within the database transaction
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should handle non-recurring scheduled transaction execution', async () => {
      const nonRecurringScheduled = {
        id: 'scheduled-one-time',
        amount: new Decimal('50000'),
        currency: 'JPY',
        type: 'EXPENSE',
        description: '\u4e00\u6642\u7684\u306a\u652f\u6255\u3044',
        accountId: 'account-1',
        userId: 'user-1',
        dueDate: new Date('2024-02-01'),
        frequency: null,
        endDate: null,
        isRecurring: false,
        status: 'PENDING',
      }

      mockScheduledTransactionFindFirst.mockImplementation(() =>
        Promise.resolve(nonRecurringScheduled)
      )

      const mockExecutedTransaction = {
        id: 'tx-4',
        amount: new Decimal('50000'),
        account: mockAccount,
        currencyRef: mockCurrency,
        exchangeRate: null,
        baseCurrencyAmount: null,
      }

      mockDbTransaction.mockImplementation(async () => {
        return {
          transaction: mockExecutedTransaction,
          scheduledTransaction: { ...nonRecurringScheduled, status: 'COMPLETED' },
          nextScheduledTransaction: null,
        }
      })

      const executeRequest = new Request(
        'http://localhost:3000/api/scheduled-transactions/scheduled-one-time',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            createRecurring: false,
          }),
        }
      )

      const executeResponse = await executeScheduled(executeRequest, {
        params: { id: 'scheduled-one-time' },
      })
      const executeData = await executeResponse.json()

      expect(executeResponse.status).toBe(200)
      expect(executeData.data.nextScheduledTransaction).toBeNull()
    })
  })

  describe('Transaction Filtering and Pagination Workflow', () => {
    it('should create multiple transactions and filter them correctly', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          amount: new Decimal('5000'),
          type: 'EXPENSE',
          description: '\u30e9\u30f3\u30c1',
          date: new Date('2024-01-15'),
          account: mockAccount,
          currencyRef: mockCurrency,
        },
        {
          id: 'tx-2',
          amount: new Decimal('300000'),
          type: 'INCOME',
          description: '\u7d66\u4e0e',
          date: new Date('2024-01-31'),
          account: mockAccount,
          currencyRef: mockCurrency,
        },
        {
          id: 'tx-3',
          amount: new Decimal('3000'),
          type: 'EXPENSE',
          description: '\u30b3\u30fc\u30d2\u30fc',
          date: new Date('2024-01-16'),
          account: mockAccount,
          currencyRef: mockCurrency,
        },
      ]

      // Test filtering by type
      mockTransactionFindMany.mockImplementation(() =>
        Promise.resolve([mockTransactions[0], mockTransactions[2]])
      )
      mockTransactionCount.mockImplementation(() => Promise.resolve(2))

      const filterRequest = new Request(
        'http://localhost:3000/api/transactions?type=EXPENSE&page=1&limit=20'
      )
      const filterResponse = await getTransactions(filterRequest)
      const filterData = await filterResponse.json()

      expect(filterResponse.status).toBe(200)
      expect(filterData.success).toBe(true)
      expect(filterData.data).toHaveLength(2)
      expect(filterData.pagination.total).toBe(2)

      // Verify the correct filter was applied
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'EXPENSE',
        },
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('should handle search functionality across transactions', async () => {
      const mockSearchResults = [
        {
          id: 'tx-1',
          amount: new Decimal('5000'),
          type: 'EXPENSE',
          description: '\u30e9\u30f3\u30c1\u4ee3',
          date: new Date('2024-01-15'),
          account: mockAccount,
          currencyRef: mockCurrency,
        },
      ]

      mockTransactionFindMany.mockImplementation(() => Promise.resolve(mockSearchResults))
      mockTransactionCount.mockImplementation(() => Promise.resolve(1))

      const searchRequest = new Request('http://localhost:3000/api/transactions?search=\u30e9\u30f3\u30c1')
      const searchResponse = await getTransactions(searchRequest)
      const searchData = await searchResponse.json()

      expect(searchResponse.status).toBe(200)
      expect(searchData.data).toHaveLength(1)

      // Verify search filters were applied
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          OR: [
            { description: { contains: '\u30e9\u30f3\u30c1', mode: 'insensitive' } },
            { notes: { contains: '\u30e9\u30f3\u30c1', mode: 'insensitive' } },
            { tags: { has: '\u30e9\u30f3\u30c1' } },
          ],
        },
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('should handle date range filtering correctly', async () => {
      mockTransactionFindMany.mockImplementation(() => Promise.resolve([]))
      mockTransactionCount.mockImplementation(() => Promise.resolve(0))

      const startDate = '2024-01-01T00:00:00.000Z'
      const endDate = '2024-01-31T23:59:59.999Z'
      const dateRangeRequest = new Request(
        `http://localhost:3000/api/transactions?startDate=${startDate}&endDate=${endDate}`
      )

      const dateRangeResponse = await getTransactions(dateRangeRequest)
      expect(dateRangeResponse.status).toBe(200)

      // Verify date range filters were applied
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      })
    })
  })

  describe('Scheduled Transaction Management Workflow', () => {
    it('should create multiple scheduled transactions and filter them', async () => {
      const mockScheduledTransactions = [
        {
          id: 'scheduled-1',
          amount: new Decimal('15000'),
          currency: 'JPY',
          description: '\u5149\u71b1\u8cbb',
          type: 'EXPENSE',
          status: 'PENDING',
          isRecurring: true,
          frequency: 'MONTHLY',
          dueDate: new Date('2024-02-15'),
          account: mockAccount,
          currencyRef: mockCurrency,
        },
        {
          id: 'scheduled-2',
          amount: new Decimal('300000'),
          currency: 'JPY',
          description: '\u7d66\u4e0e',
          type: 'INCOME',
          status: 'PENDING',
          isRecurring: true,
          frequency: 'MONTHLY',
          dueDate: new Date('2024-02-25'),
          account: mockAccount,
          currencyRef: mockCurrency,
        },
      ]

      mockScheduledTransactionFindMany.mockImplementation(() =>
        Promise.resolve([mockScheduledTransactions[0]])
      )
      mockScheduledTransactionCount.mockImplementation(() => Promise.resolve(1))
      mockScheduledTransactionUpdateMany.mockImplementation(() => Promise.resolve({ count: 0 }))

      // Filter by type
      const filterRequest = new Request(
        'http://localhost:3000/api/scheduled-transactions?type=EXPENSE'
      )
      const filterResponse = await getScheduled(filterRequest)
      const filterData = await filterResponse.json()

      expect(filterResponse.status).toBe(200)
      expect(filterData.data).toHaveLength(1)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'EXPENSE',
        },
        include: expect.any(Object),
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        skip: 0,
        take: 20,
      })
    })

    it('should automatically update overdue scheduled transactions', async () => {
      mockScheduledTransactionFindMany.mockImplementation(() => Promise.resolve([]))
      mockScheduledTransactionCount.mockImplementation(() => Promise.resolve(0))
      mockScheduledTransactionUpdateMany.mockImplementation(() => Promise.resolve({ count: 2 }))

      const getRequest = new Request('http://localhost:3000/api/scheduled-transactions')
      const getResponse = await getScheduled(getRequest)

      expect(getResponse.status).toBe(200)

      // Verify that overdue status update was called
      expect(prisma.scheduledTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'PENDING',
          dueDate: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: 'OVERDUE',
        },
      })
    })
  })

  describe('Error Handling Workflow', () => {
    it('should handle validation errors throughout the workflow', async () => {
      // Test transaction creation with missing required fields
      const invalidRequest = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields like amount, currency, etc.
          description: 'Invalid transaction',
        }),
      })

      const response = await createTransaction(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('\u30d0\u30ea\u30c7\u30fc\u30b7\u30e7\u30f3\u30a8\u30e9\u30fc')
      expect(data.details).toBeDefined()
    })

    it('should handle non-existent account references', async () => {
      mockAppAccountFindFirst.mockImplementation(() => Promise.resolve(null))

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'Test',
          date: '2024-01-15T12:00:00.000Z',
          accountId: 'nonexistent-account',
        }),
      })

      const response = await createTransaction(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('\u6307\u5b9a\u3055\u308c\u305f\u53e3\u5ea7\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093')
    })

    it('should handle unauthorized requests', async () => {
      mockGetSession.mockImplementation(() => Promise.resolve(null))

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'Test',
        }),
      })

      const response = await createTransaction(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('\u8a8d\u8a3c\u304c\u5fc5\u8981\u3067\u3059')
    })
  })
})
