/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST as createTransaction, GET as getTransactions } from '@/app/api/transactions/route'
import { POST as createScheduled, GET as getScheduled } from '@/app/api/scheduled-transactions/route'
import { POST as executeScheduled } from '@/app/api/scheduled-transactions/[id]/route'
import { prisma } from '@/lib/db'
import Decimal from 'decimal.js'

// Mock global Request if not available
if (typeof global.Request === 'undefined') {
  const { Request } = require('node-fetch')
  global.Request = Request
}

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/db', () => ({
  prisma: {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    scheduledTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    currency: {
      findUnique: jest.fn(),
    },
    appAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve({}))
}))

const mockAuth = {
  api: {
    getSession: jest.fn()
  }
}

require('@/lib/auth').auth = mockAuth

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com'
}

const mockSession = {
  user: mockUser
}

const mockCurrency = {
  code: 'JPY',
  symbol: '¥',
  name: '日本円',
  decimals: 0,
  isActive: true
}

const mockAccount = {
  id: 'account-1',
  name: 'メイン口座',
  type: 'CHECKING',
  balance: new Decimal('100000'),
  currency: 'JPY',
  userId: 'user-1',
  currencyRef: mockCurrency
}

const mockCategory = {
  id: 'category-1',
  name: '食費',
  type: 'EXPENSE',
  userId: 'user-1'
}

describe('Transaction Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.api.getSession.mockResolvedValue(mockSession)
    ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(mockCurrency)
    ;(prisma.appAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount)
    ;(prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory)
  })

  describe('Complete Transaction Lifecycle', () => {
    it('should create a transaction and update account balance correctly', async () => {
      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('5000'),
        currency: 'JPY',
        type: 'EXPENSE',
        description: 'ランチ',
        date: new Date('2024-01-15'),
        accountId: 'account-1',
        userId: 'user-1',
        account: {
          ...mockAccount,
          currencyRef: mockCurrency
        },
        category: mockCategory,
        currencyRef: mockCurrency
      }

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prisma.appAccount.update as jest.Mock).mockResolvedValue({
        ...mockAccount,
        balance: new Decimal('95000')
      })

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'ランチ',
          date: '2024-01-15T12:00:00.000Z',
          accountId: 'account-1',
          categoryId: 'category-1'
        })
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
            increment: -5000
          }
        }
      })
    })

    it('should handle income transactions with positive balance change', async () => {
      const mockIncomeTransaction = {
        id: 'tx-2',
        amount: new Decimal('300000'),
        currency: 'JPY',
        type: 'INCOME',
        description: '給与',
        date: new Date('2024-01-31'),
        accountId: 'account-1',
        userId: 'user-1',
        account: {
          ...mockAccount,
          currencyRef: mockCurrency
        },
        category: mockCategory,
        currencyRef: mockCurrency
      }

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue(mockIncomeTransaction)
      ;(prisma.appAccount.update as jest.Mock).mockResolvedValue({
        ...mockAccount,
        balance: new Decimal('400000')
      })

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 300000,
          currency: 'JPY',
          type: 'INCOME',
          description: '給与',
          date: '2024-01-31T12:00:00.000Z',
          accountId: 'account-1',
          categoryId: 'category-1'
        })
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
            increment: 300000
          }
        }
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
        description: '光熱費',
        accountId: 'account-1',
        categoryId: 'category-1',
        userId: 'user-1',
        dueDate: new Date('2024-02-15'),
        frequency: 'MONTHLY',
        endDate: new Date('2024-12-31'),
        isRecurring: true,
        status: 'PENDING',
        reminderDays: 3,
        notes: '電気代',
        account: mockAccount,
        category: mockCategory,
        currencyRef: mockCurrency
      }

      ;(prisma.scheduledTransaction.create as jest.Mock).mockResolvedValue(mockScheduledTransaction)

      const createRequest = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 15000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: '光熱費',
          accountId: 'account-1',
          categoryId: 'category-1',
          dueDate: '2024-02-15T00:00:00.000Z',
          frequency: 'MONTHLY',
          endDate: '2024-12-31T23:59:59.999Z',
          isRecurring: true,
          reminderDays: 3,
          notes: '電気代'
        })
      })

      const createResponse = await createScheduled(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(200)
      expect(createData.success).toBe(true)
      expect(createData.data.description).toBe('光熱費')
      expect(createData.data.isRecurring).toBe(true)

      // Step 2: Execute the scheduled transaction
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(mockScheduledTransaction)

      const mockExecutedTransaction = {
        id: 'tx-3',
        amount: new Decimal('15000'),
        currency: 'JPY',
        type: 'EXPENSE',
        description: '光熱費 (予定取引実行)',
        date: new Date('2024-02-15'),
        accountId: 'account-1',
        userId: 'user-1',
        account: mockAccount,
        currencyRef: mockCurrency,
        exchangeRate: null,
        baseCurrencyAmount: null
      }

      const mockNextScheduled = {
        ...mockScheduledTransaction,
        id: 'scheduled-2',
        dueDate: new Date('2024-03-15')
      }

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        return {
          transaction: mockExecutedTransaction,
          scheduledTransaction: { ...mockScheduledTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: mockNextScheduled
        }
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)

      const executeRequest = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executeDate: '2024-02-15T10:00:00.000Z',
          createRecurring: true
        })
      })

      const executeResponse = await executeScheduled(executeRequest, { params: { id: 'scheduled-1' } })
      const executeData = await executeResponse.json()

      expect(executeResponse.status).toBe(200)
      expect(executeData.success).toBe(true)
      expect(executeData.message).toBe('予定取引が実行されました')
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
        description: '一時的な支払い',
        accountId: 'account-1',
        userId: 'user-1',
        dueDate: new Date('2024-02-01'),
        frequency: null,
        endDate: null,
        isRecurring: false,
        status: 'PENDING'
      }

      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(nonRecurringScheduled)

      const mockExecutedTransaction = {
        id: 'tx-4',
        amount: new Decimal('50000'),
        account: mockAccount,
        currencyRef: mockCurrency,
        exchangeRate: null,
        baseCurrencyAmount: null
      }

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        return {
          transaction: mockExecutedTransaction,
          scheduledTransaction: { ...nonRecurringScheduled, status: 'COMPLETED' },
          nextScheduledTransaction: null
        }
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)

      const executeRequest = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-one-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createRecurring: false
        })
      })

      const executeResponse = await executeScheduled(executeRequest, { params: { id: 'scheduled-one-time' } })
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
          description: 'ランチ',
          date: new Date('2024-01-15'),
          account: mockAccount,
          currencyRef: mockCurrency
        },
        {
          id: 'tx-2',
          amount: new Decimal('300000'),
          type: 'INCOME',
          description: '給与',
          date: new Date('2024-01-31'),
          account: mockAccount,
          currencyRef: mockCurrency
        },
        {
          id: 'tx-3',
          amount: new Decimal('3000'),
          type: 'EXPENSE',
          description: 'コーヒー',
          date: new Date('2024-01-16'),
          account: mockAccount,
          currencyRef: mockCurrency
        }
      ]

      // Test filtering by type
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([mockTransactions[0], mockTransactions[2]])
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(2)

      const filterRequest = new NextRequest('http://localhost:3000/api/transactions?type=EXPENSE&page=1&limit=20')
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
          type: 'EXPENSE'
        },
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20
      })
    })

    it('should handle search functionality across transactions', async () => {
      const mockSearchResults = [
        {
          id: 'tx-1',
          amount: new Decimal('5000'),
          type: 'EXPENSE',
          description: 'ランチ代',
          date: new Date('2024-01-15'),
          account: mockAccount,
          currencyRef: mockCurrency
        }
      ]

      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockSearchResults)
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(1)

      const searchRequest = new NextRequest('http://localhost:3000/api/transactions?search=ランチ')
      const searchResponse = await getTransactions(searchRequest)
      const searchData = await searchResponse.json()

      expect(searchResponse.status).toBe(200)
      expect(searchData.data).toHaveLength(1)

      // Verify search filters were applied
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          OR: [
            { description: { contains: 'ランチ', mode: 'insensitive' } },
            { notes: { contains: 'ランチ', mode: 'insensitive' } },
            { tags: { has: 'ランチ' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20
      })
    })

    it('should handle date range filtering correctly', async () => {
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0)

      const startDate = '2024-01-01T00:00:00.000Z'
      const endDate = '2024-01-31T23:59:59.999Z'
      const dateRangeRequest = new NextRequest(`http://localhost:3000/api/transactions?startDate=${startDate}&endDate=${endDate}`)
      
      const dateRangeResponse = await getTransactions(dateRangeRequest)
      expect(dateRangeResponse.status).toBe(200)

      // Verify date range filters were applied
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20
      })
    })
  })

  describe('Scheduled Transaction Management Workflow', () => {
    it('should create multiple scheduled transactions and filter them', async () => {
      const mockScheduledTransactions = [
        {
          id: 'scheduled-1',
          description: '光熱費',
          type: 'EXPENSE',
          status: 'PENDING',
          isRecurring: true,
          frequency: 'MONTHLY',
          dueDate: new Date('2024-02-15'),
          account: mockAccount,
          currencyRef: mockCurrency
        },
        {
          id: 'scheduled-2',
          description: '給与',
          type: 'INCOME',
          status: 'PENDING',
          isRecurring: true,
          frequency: 'MONTHLY',
          dueDate: new Date('2024-02-25'),
          account: mockAccount,
          currencyRef: mockCurrency
        }
      ]

      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([mockScheduledTransactions[0]])
      ;(prisma.scheduledTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.scheduledTransaction.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

      // Filter by type
      const filterRequest = new NextRequest('http://localhost:3000/api/scheduled-transactions?type=EXPENSE')
      const filterResponse = await getScheduled(filterRequest)
      const filterData = await filterResponse.json()

      expect(filterResponse.status).toBe(200)
      expect(filterData.data).toHaveLength(1)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'EXPENSE'
        },
        include: expect.any(Object),
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' }
        ],
        skip: 0,
        take: 20
      })
    })

    it('should automatically update overdue scheduled transactions', async () => {
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.scheduledTransaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.scheduledTransaction.updateMany as jest.Mock).mockResolvedValue({ count: 2 })

      const getRequest = new NextRequest('http://localhost:3000/api/scheduled-transactions')
      const getResponse = await getScheduled(getRequest)

      expect(getResponse.status).toBe(200)

      // Verify that overdue status update was called
      expect(prisma.scheduledTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'PENDING',
          dueDate: {
            lt: expect.any(Date)
          }
        },
        data: {
          status: 'OVERDUE'
        }
      })
    })
  })

  describe('Error Handling Workflow', () => {
    it('should handle validation errors throughout the workflow', async () => {
      // Test transaction creation with missing required fields
      const invalidRequest = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields like amount, currency, etc.
          description: 'Invalid transaction'
        })
      })

      const response = await createTransaction(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('バリデーションエラー')
      expect(data.details).toBeDefined()
    })

    it('should handle non-existent account references', async () => {
      ;(prisma.appAccount.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'Test',
          date: '2024-01-15T12:00:00.000Z',
          accountId: 'nonexistent-account'
        })
      })

      const response = await createTransaction(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定された口座が見つかりません')
    })

    it('should handle unauthorized requests', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'Test'
        })
      })

      const response = await createTransaction(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })
  })
})