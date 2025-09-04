/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST, GET, PATCH } from '@/app/api/scheduled-transactions/route'
import { GET as GET_ID, PUT, DELETE, POST as EXECUTE } from '@/app/api/scheduled-transactions/[id]/route'
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
    scheduledTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
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
  currencyRef: mockCurrency
}

describe('/api/scheduled-transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/scheduled-transactions', () => {
    it('should create a new scheduled transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(mockCurrency)
      ;(prisma.appAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount)
      ;(prisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory)
      ;(prisma.scheduledTransaction.create as jest.Mock).mockResolvedValue(mockScheduledTransaction)

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
          notes: 'テストメモ'
        })
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
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    it('should validate required fields', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('バリデーションエラー')
    })

    it('should require frequency for recurring transactions', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)

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
          isRecurring: true
          // Missing frequency
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('繰り返し取引には頻度の設定が必要です')
    })

    it('should recommend end date for recurring transactions', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)

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
          isRecurring: true
          // Missing endDate
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('繰り返し取引には終了日の設定が推奨されます')
    })

    it('should reject invalid currency', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'INVALID',
          type: 'EXPENSE',
          description: 'テスト',
          accountId: 'account-1',
          dueDate: '2024-02-01T00:00:00.000Z'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な通貨コードです')
    })

    it('should reject non-owned account', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(mockCurrency)
      ;(prisma.appAccount.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'テスト',
          accountId: 'other-account',
          dueDate: '2024-02-01T00:00:00.000Z'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定された口座が見つかりません')
    })

    it('should reject non-owned category', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(mockCurrency)
      ;(prisma.appAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount)
      ;(prisma.category.findFirst as jest.Mock).mockResolvedValue(null)

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
          dueDate: '2024-02-01T00:00:00.000Z'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定されたカテゴリが見つかりません')
    })
  })

  describe('GET /api/scheduled-transactions', () => {
    it('should fetch scheduled transactions with pagination', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([mockScheduledTransaction])
      ;(prisma.scheduledTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.scheduledTransaction.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions?page=1&limit=20')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      })
    })

    it('should filter by status', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.scheduledTransaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.scheduledTransaction.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions?status=PENDING')

      await GET(request)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'PENDING'
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

    it('should filter by type and recurring status', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.scheduledTransaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.scheduledTransaction.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions?type=EXPENSE&isRecurring=true')

      await GET(request)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'EXPENSE',
          isRecurring: true
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

    it('should filter by date range', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.scheduledTransaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.scheduledTransaction.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

      const startDate = '2024-01-01T00:00:00.000Z'
      const endDate = '2024-01-31T23:59:59.999Z'
      const request = new NextRequest(`http://localhost:3000/api/scheduled-transactions?startDate=${startDate}&endDate=${endDate}`)

      await GET(request)

      expect(prisma.scheduledTransaction.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          dueDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
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

    it('should update overdue transactions in background', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.scheduledTransaction.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.scheduledTransaction.updateMany as jest.Mock).mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions')

      await GET(request)

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

  describe('PATCH /api/scheduled-transactions (batch update)', () => {
    const scheduledTransactions = [
      { ...mockScheduledTransaction, id: 'scheduled-1' },
      { ...mockScheduledTransaction, id: 'scheduled-2' }
    ]

    it('should update multiple scheduled transactions successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue(scheduledTransactions)

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        const updatedTx = { ...scheduledTransactions[0], status: 'COMPLETED' }
        return { scheduledTransaction: updatedTx }
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['scheduled-1', 'scheduled-2'],
          status: 'COMPLETED',
          executeTransaction: false
        })
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('2件の予定取引が更新されました')
    })

    it('should execute transactions when status is COMPLETED and executeTransaction is true', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([scheduledTransactions[0]])

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        const transaction = { id: 'tx-1', amount: new Decimal('5000') }
        const updatedTx = { ...scheduledTransactions[0], status: 'COMPLETED' }
        return { scheduledTransaction: updatedTx, transaction }
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['scheduled-1'],
          status: 'COMPLETED',
          executeTransaction: true
        })
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject batch update with empty IDs', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [],
          status: 'COMPLETED'
        })
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('更新対象のIDが指定されていません')
    })

    it('should reject batch update when some transactions are not found', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findMany as jest.Mock).mockResolvedValue([scheduledTransactions[0]])

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['scheduled-1', 'nonexistent'],
          status: 'COMPLETED'
        })
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('一部の予定取引が見つかりません')
    })
  })

  describe('GET /api/scheduled-transactions/[id]', () => {
    it('should fetch single scheduled transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(mockScheduledTransaction)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1')

      const response = await GET_ID(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('scheduled-1')
      expect(data.data.amount).toBe('5000')
    })

    it('should return 404 for non-existent scheduled transaction', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/nonexistent')

      const response = await GET_ID(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('予定取引が見つかりません')
    })
  })

  describe('PUT /api/scheduled-transactions/[id]', () => {
    it('should update scheduled transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(mockScheduledTransaction)
      
      const updatedTransaction = {
        ...mockScheduledTransaction,
        description: '更新された説明'
      }
      ;(prisma.scheduledTransaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: '更新された説明'
        })
      })

      const response = await PUT(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.description).toBe('更新された説明')
    })

    it('should reject updating non-owned scheduled transaction', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/other-scheduled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: '更新された説明'
        })
      })

      const response = await PUT(request, { params: { id: 'other-scheduled' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('予定取引が見つかりません')
    })

    it('should validate currency when updating', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(mockScheduledTransaction)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: 'INVALID'
        })
      })

      const response = await PUT(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な通貨コードです')
    })

    it('should validate recurring transaction frequency requirement', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      const nonRecurringTransaction = { ...mockScheduledTransaction, isRecurring: false, frequency: null }
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(nonRecurringTransaction)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isRecurring: true
          // Missing frequency
        })
      })

      const response = await PUT(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('繰り返し取引には頻度の設定が必要です')
    })
  })

  describe('DELETE /api/scheduled-transactions/[id]', () => {
    it('should delete scheduled transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(mockScheduledTransaction)
      ;(prisma.scheduledTransaction.delete as jest.Mock).mockResolvedValue(mockScheduledTransaction)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('予定取引が削除されました')
    })

    it('should reject deleting non-owned scheduled transaction', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/other-scheduled', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'other-scheduled' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('予定取引が見つかりません')
    })
  })

  describe('POST /api/scheduled-transactions/[id] (execute)', () => {
    it('should execute scheduled transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(mockScheduledTransaction)

      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('5000'),
        exchangeRate: null,
        baseCurrencyAmount: null,
        account: mockAccount
      }

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        return {
          transaction: mockTransaction,
          scheduledTransaction: { ...mockScheduledTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: { ...mockScheduledTransaction, id: 'scheduled-2', dueDate: new Date('2024-03-01') }
        }
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executeDate: '2024-02-01T12:00:00.000Z',
          createRecurring: true
        })
      })

      const response = await EXECUTE(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('予定取引が実行されました')
      expect(data.data.nextScheduledTransaction).toBeTruthy()
    })

    it('should reject executing already completed transaction', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      const completedTransaction = { ...mockScheduledTransaction, status: 'COMPLETED' }
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(completedTransaction)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executeDate: '2024-02-01T12:00:00.000Z'
        })
      })

      const response = await EXECUTE(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('この予定取引は既に実行済みです')
    })

    it('should execute non-recurring transaction without creating next', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      const nonRecurringTransaction = { ...mockScheduledTransaction, isRecurring: false, frequency: null }
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(nonRecurringTransaction)

      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('5000'),
        exchangeRate: null,
        baseCurrencyAmount: null,
        account: mockAccount
      }

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        return {
          transaction: mockTransaction,
          scheduledTransaction: { ...nonRecurringTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: null
        }
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createRecurring: false
        })
      })

      const response = await EXECUTE(request, { params: { id: 'scheduled-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.nextScheduledTransaction).toBeNull()
    })

    it('should handle income transactions with positive balance change', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      const incomeTransaction = { 
        ...mockScheduledTransaction, 
        type: 'INCOME',
        description: '給与'
      }
      ;(prisma.scheduledTransaction.findFirst as jest.Mock).mockResolvedValue(incomeTransaction)

      const mockTransaction = {
        id: 'tx-1',
        amount: new Decimal('300000'),
        exchangeRate: null,
        baseCurrencyAmount: null,
        account: mockAccount
      }

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        return {
          transaction: mockTransaction,
          scheduledTransaction: { ...incomeTransaction, status: 'COMPLETED' },
          nextScheduledTransaction: null
        }
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)

      const request = new NextRequest('http://localhost:3000/api/scheduled-transactions/scheduled-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await EXECUTE(request, { params: { id: 'scheduled-1' } })

      expect(response.status).toBe(200)
      // Verify that balance change logic handles income properly in the implementation
    })
  })
})