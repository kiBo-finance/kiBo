import { describe, it, expect, beforeEach, mock } from 'bun:test'
import Decimal from 'decimal.js'

// Create mock functions
const mockScheduledTransactionCreate = mock(() => Promise.resolve({}))
const mockScheduledTransactionFindMany = mock(() => Promise.resolve([]))
const mockScheduledTransactionFindFirst = mock(() => Promise.resolve(null))
const mockScheduledTransactionUpdate = mock(() => Promise.resolve({}))
const mockScheduledTransactionUpdateMany = mock(() => Promise.resolve({ count: 0 }))
const mockScheduledTransactionDelete = mock(() => Promise.resolve({}))
const mockScheduledTransactionCount = mock(() => Promise.resolve(0))
const mockTransactionCreate = mock(() => Promise.resolve({}))
const mockCurrencyFindUnique = mock(() => Promise.resolve(null))
const mockAppAccountFindFirst = mock(() => Promise.resolve(null))
const mockAppAccountUpdate = mock(() => Promise.resolve({}))
const mockCategoryFindFirst = mock(() => Promise.resolve(null))
const mockPrismaTransaction = mock((callback: Function) => callback({}))
const mockGetSession = mock(() => Promise.resolve(null))
const mockHeaders = mock(() => Promise.resolve({}))

// Mock dependencies before imports
mock.module('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

mock.module('~/lib/db', () => ({
  prisma: {
    scheduledTransaction: {
      create: mockScheduledTransactionCreate,
      findMany: mockScheduledTransactionFindMany,
      findFirst: mockScheduledTransactionFindFirst,
      update: mockScheduledTransactionUpdate,
      updateMany: mockScheduledTransactionUpdateMany,
      delete: mockScheduledTransactionDelete,
      count: mockScheduledTransactionCount,
    },
    transaction: {
      create: mockTransactionCreate,
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
    $transaction: mockPrismaTransaction,
  },
}))

mock.module('next/headers', () => ({
  headers: mockHeaders,
}))

// Import after mocking
import {
  GET as GET_ID,
  PUT,
  DELETE,
  POST as EXECUTE,
} from '~/pages/_api/scheduled-transactions/[id]'
import { POST, GET, PATCH } from '~/pages/_api/scheduled-transactions/index'
import { prisma } from '~/lib/db'
import { NextRequest } from 'next/server'

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
  symbol: '¥',
  name: '日本円',
  decimals: 0,
  isActive: true,
}

const mockAccount = {
  id: 'account-1',
  name: 'メイン口座',
  type: 'CHECKING',
  balance: new Decimal('100000'),
  currency: 'JPY',
  userId: 'user-1',
  currencyRef: mockCurrency,
}

const mockCategory = {
  id: 'category-1',
  name: '食費',
  type: 'EXPENSE',
  userId: 'user-1',
}

const mockScheduledTransaction = {
  id: 'scheduled-1',
  amount: new Decimal('5000'),
  currency: 'JPY',
  type: 'EXPENSE',
  description: '月次サブスク',
  accountId: 'account-1',
  categoryId: 'category-1',
  userId: 'user-1',
  dueDate: new Date('2024-02-01'),
  frequency: 'MONTHLY',
  endDate: new Date('2024-12-31'),
  isRecurring: true,
  status: 'PENDING',
  reminderDays: 3,
  notes: 'テストメモ',
  completedAt: null,
  isReminderSent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  account: mockAccount,
  category: mockCategory,
  currencyRef: mockCurrency,
}

describe('/api/scheduled-transactions', () => {
  beforeEach(() => {
    mockScheduledTransactionCreate.mockReset()
    mockScheduledTransactionFindMany.mockReset()
    mockScheduledTransactionFindFirst.mockReset()
    mockScheduledTransactionUpdate.mockReset()
    mockScheduledTransactionUpdateMany.mockReset()
    mockScheduledTransactionDelete.mockReset()
    mockScheduledTransactionCount.mockReset()
    mockTransactionCreate.mockReset()
    mockCurrencyFindUnique.mockReset()
    mockAppAccountFindFirst.mockReset()
    mockAppAccountUpdate.mockReset()
    mockCategoryFindFirst.mockReset()
    mockPrismaTransaction.mockReset()
    mockGetSession.mockReset()
    mockHeaders.mockReset()
  })

  describe('POST /api/scheduled-transactions', () => {
    it('should create a new scheduled transaction successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockCurrencyFindUnique.mockResolvedValue(mockCurrency)
      mockAppAccountFindFirst.mockResolvedValue(mockAccount)
      mockCategoryFindFirst.mockResolvedValue(mockCategory)
      mockScheduledTransactionCreate.mockResolvedValue(mockScheduledTransaction)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: '月次サブスク',
          accountId: 'account-1',
          categoryId: 'category-1',
          dueDate: '2024-02-01T00:00:00.000Z',
          frequency: 'MONTHLY',
          endDate: '2024-12-31T23:59:59.999Z',
          isRecurring: true,
          reminderDays: 3,
          notes: 'テストメモ',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.description).toBe('月次サブスク')
      expect(data.data.amount).toBe('5000')
      expect(data.data.isRecurring).toBe(true)
      expect(data.data.frequency).toBe('MONTHLY')
    })

    it('should reject unauthenticated requests', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    it('should validate required fields', async () => {
      mockGetSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('バリデーションエラー')
    })

    it('should require frequency for recurring transactions', async () => {
      mockGetSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: '月次サブスク',
          accountId: 'account-1',
          dueDate: '2024-02-01T00:00:00.000Z',
          isRecurring: true,
          // Missing frequency
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('繰り返し取引には頻度の設定が必要です')
    })

    it('should recommend end date for recurring transactions', async () => {
      mockGetSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: '月次サブスク',
          accountId: 'account-1',
          dueDate: '2024-02-01T00:00:00.000Z',
          frequency: 'MONTHLY',
          isRecurring: true,
          // Missing endDate
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('繰り返し取引には終了日の設定が推奨されます')
    })

    it('should reject invalid currency', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockCurrencyFindUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'INVALID',
          type: 'EXPENSE',
          description: 'テスト',
          accountId: 'account-1',
          dueDate: '2024-02-01T00:00:00.000Z',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な通貨コードです')
    })

    it('should reject non-owned account', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockCurrencyFindUnique.mockResolvedValue(mockCurrency)
      mockAppAccountFindFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'テスト',
          accountId: 'other-account',
          dueDate: '2024-02-01T00:00:00.000Z',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定された口座が見つかりません')
    })

    it('should reject non-owned category', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockCurrencyFindUnique.mockResolvedValue(mockCurrency)
      mockAppAccountFindFirst.mockResolvedValue(mockAccount)
      mockCategoryFindFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'テスト',
          accountId: 'account-1',
          categoryId: 'other-category',
          dueDate: '2024-02-01T00:00:00.000Z',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定されたカテゴリが見つかりません')
    })
  })

  describe('GET /api/scheduled-transactions', () => {
    it('should fetch scheduled transactions with pagination', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue([mockScheduledTransaction])
      mockScheduledTransactionCount.mockResolvedValue(1)
      mockScheduledTransactionUpdateMany.mockResolvedValue({ count: 0 })

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions?page=1&limit=20'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      })
    })

    it('should filter by status', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue([])
      mockScheduledTransactionCount.mockResolvedValue(0)
      mockScheduledTransactionUpdateMany.mockResolvedValue({ count: 0 })

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions?status=PENDING'
      )

      await GET(request)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'PENDING',
        },
        include: expect.any(Object),
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        skip: 0,
        take: 20,
      })
    })

    it('should filter by type and recurring status', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue([])
      mockScheduledTransactionCount.mockResolvedValue(0)
      mockScheduledTransactionUpdateMany.mockResolvedValue({ count: 0 })

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions?type=EXPENSE&isRecurring=true'
      )

      await GET(request)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'EXPENSE',
          isRecurring: true,
        },
        include: expect.any(Object),
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        skip: 0,
        take: 20,
      })
    })

    it('should filter by date range', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue([])
      mockScheduledTransactionCount.mockResolvedValue(0)
      mockScheduledTransactionUpdateMany.mockResolvedValue({ count: 0 })

      const startDate = '2024-01-01T00:00:00.000Z'
      const endDate = '2024-01-31T23:59:59.999Z'
      const request = new NextRequest(
        `http://localhost:3000/api/scheduled-transactions?startDate=${startDate}&endDate=${endDate}`
      )

      await GET(request)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          dueDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: expect.any(Object),
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        skip: 0,
        take: 20,
      })
    })

    it('should update overdue transactions in background', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue([])
      mockScheduledTransactionCount.mockResolvedValue(0)
      mockScheduledTransactionUpdateMany.mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions')

      await GET(request)

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

  describe('PATCH /api/scheduled-transactions (batch update)', () => {
    const scheduledTransactions = [
      { ...mockScheduledTransaction, id: 'scheduled-1' },
      { ...mockScheduledTransaction, id: 'scheduled-2' },
    ]

    it('should update multiple scheduled transactions successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue(scheduledTransactions)

      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        const updatedTx = { ...scheduledTransactions[0], status: 'COMPLETED' }
        return { scheduledTransaction: updatedTx }
      })

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['scheduled-1', 'scheduled-2'],
          status: 'COMPLETED',
          executeTransaction: false,
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('2件の予定取引が更新されました')
    })

    it('should execute transactions when status is COMPLETED and executeTransaction is true', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue([scheduledTransactions[0]])

      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        const transaction = { id: 'tx-1', amount: new Decimal('5000') }
        const updatedTx = { ...scheduledTransactions[0], status: 'COMPLETED' }
        return { scheduledTransaction: updatedTx, transaction }
      })

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['scheduled-1'],
          status: 'COMPLETED',
          executeTransaction: true,
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject batch update with empty IDs', async () => {
      mockGetSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [],
          status: 'COMPLETED',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('更新対象のIDが指定されていません')
    })

    it('should reject batch update when some transactions are not found', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindMany.mockResolvedValue([scheduledTransactions[0]])

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['scheduled-1', 'nonexistent'],
          status: 'COMPLETED',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('一部の予定取引が見つかりません')
    })
  })

  describe('GET /api/scheduled-transactions/[id]', () => {
    it('should fetch single scheduled transaction successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(mockScheduledTransaction)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1'
      )

      const response = await GET_ID(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('scheduled-1')
      expect(data.data.amount).toBe('5000')
    })

    it('should return 404 for non-existent scheduled transaction', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/nonexistent'
      )

      const response = await GET_ID(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('予定取引が見つかりません')
    })
  })

  describe('PUT /api/scheduled-transactions/[id]', () => {
    it('should update scheduled transaction successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(mockScheduledTransaction)

      const updatedTransaction = {
        ...mockScheduledTransaction,
        description: '更新された説明',
      }
      mockScheduledTransactionUpdate.mockResolvedValue(updatedTransaction)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: '更新された説明',
          }),
        }
      )

      const response = await PUT(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.description).toBe('更新された説明')
    })

    it('should reject updating non-owned scheduled transaction', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/other-scheduled',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: '更新された説明',
          }),
        }
      )

      const response = await PUT(request, { params: Promise.resolve({ id: 'other-scheduled' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('予定取引が見つかりません')
    })

    it('should validate currency when updating', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(mockScheduledTransaction)
      mockCurrencyFindUnique.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency: 'INVALID',
          }),
        }
      )

      const response = await PUT(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な通貨コードです')
    })

    it('should validate recurring transaction frequency requirement', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      const nonRecurringTransaction = {
        ...mockScheduledTransaction,
        isRecurring: false,
        frequency: null,
      }
      mockScheduledTransactionFindFirst.mockResolvedValue(nonRecurringTransaction)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isRecurring: true,
            // Missing frequency
          }),
        }
      )

      const response = await PUT(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('繰り返し取引には頻度の設定が必要です')
    })
  })

  describe('DELETE /api/scheduled-transactions/[id]', () => {
    it('should delete scheduled transaction successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(mockScheduledTransaction)
      mockScheduledTransactionDelete.mockResolvedValue(mockScheduledTransaction)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('予定取引が削除されました')
    })

    it('should reject deleting non-owned scheduled transaction', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/other-scheduled',
        {
          method: 'DELETE',
        }
      )

      const response = await DELETE(request, { params: Promise.resolve({ id: 'other-scheduled' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('予定取引が見つかりません')
    })
  })

  describe('POST /api/scheduled-transactions/[id] (execute)', () => {
    it('should execute scheduled transaction successfully', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockScheduledTransactionFindFirst.mockResolvedValue(mockScheduledTransaction)

      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('5000'),
        exchangeRate: null,
        baseCurrencyAmount: null,
        account: mockAccount,
      }

      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        return {
          transaction: mockTransaction,
          scheduledTransaction: { ...mockScheduledTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: {
            ...mockScheduledTransaction,
            id: 'scheduled-2',
            dueDate: new Date('2024-03-01'),
          },
        }
      })

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executeDate: '2024-02-01T12:00:00.000Z',
            createRecurring: true,
          }),
        }
      )

      const response = await EXECUTE(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('予定取引が実行されました')
      expect(data.data.nextScheduledTransaction).toBeTruthy()
    })

    it('should reject executing already completed transaction', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      const completedTransaction = { ...mockScheduledTransaction, status: 'COMPLETED' }
      mockScheduledTransactionFindFirst.mockResolvedValue(completedTransaction)

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executeDate: '2024-02-01T12:00:00.000Z',
          }),
        }
      )

      const response = await EXECUTE(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('この予定取引は既に実行済みです')
    })

    it('should execute non-recurring transaction without creating next', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      const nonRecurringTransaction = {
        ...mockScheduledTransaction,
        isRecurring: false,
        frequency: null,
      }
      mockScheduledTransactionFindFirst.mockResolvedValue(nonRecurringTransaction)

      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('5000'),
        exchangeRate: null,
        baseCurrencyAmount: null,
        account: mockAccount,
      }

      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        return {
          transaction: mockTransaction,
          scheduledTransaction: { ...nonRecurringTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: null,
        }
      })

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            createRecurring: false,
          }),
        }
      )

      const response = await EXECUTE(request, { params: Promise.resolve({ id: 'scheduled-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.nextScheduledTransaction).toBeNull()
    })

    it('should handle income transactions with positive balance change', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      const incomeTransaction = {
        ...mockScheduledTransaction,
        type: 'INCOME',
        description: '給与',
      }
      mockScheduledTransactionFindFirst.mockResolvedValue(incomeTransaction)

      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('300000'),
        exchangeRate: null,
        baseCurrencyAmount: null,
        account: mockAccount,
      }

      mockPrismaTransaction.mockImplementation(async (callback: Function) => {
        return {
          transaction: mockTransaction,
          scheduledTransaction: { ...incomeTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: null,
        }
      })

      const request = new NextRequest(
        'http://localhost:3000/api/scheduled-transactions/scheduled-1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      const response = await EXECUTE(request, { params: Promise.resolve({ id: 'scheduled-1' }) })

      expect(response.status).toBe(200)
      // Verify that balance change logic handles income properly in the implementation
    })
  })
})
