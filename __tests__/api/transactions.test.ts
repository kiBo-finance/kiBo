/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/transactions/route'
import { GET as GET_ID, PUT, DELETE } from '@/app/api/transactions/[id]/route'
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
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    currency: {
      findUnique: jest.fn(),
    },
    appAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    card: {
      findFirst: jest.fn(),
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
  userId: 'user-1'
}

const mockTransaction = {
  id: 'transaction-1',
  amount: new Decimal('5000'),
  currency: 'JPY',
  type: 'EXPENSE',
  description: 'ランチ',
  date: new Date('2024-01-15'),
  accountId: 'account-1',
  userId: 'user-1',
  exchangeRate: null,
  baseCurrencyAmount: null,
  attachments: [],
  tags: ['食事'],
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  account: {
    ...mockAccount,
    currencyRef: mockCurrency
  },
  card: null,
  category: null,
  currencyRef: mockCurrency
}

describe('/api/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/transactions', () => {
    it('should create a new transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(mockCurrency)
      ;(prisma.appAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount)
      ;(prisma.transaction.create as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prisma.appAccount.update as jest.Mock).mockResolvedValue({ ...mockAccount, balance: new Decimal('95000') })

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
          tags: ['食事']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe('5000')
      expect(data.data.description).toBe('ランチ')
      
      // Account balance should be updated
      expect(prisma.appAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          balance: {
            increment: -5000 // Expense should decrease balance
          }
        }
      })
    })

    it('should reject unauthenticated requests', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transactions', {
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

      const request = new NextRequest('http://localhost:3000/api/transactions', {
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

    it('should reject invalid currency', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'INVALID',
          type: 'EXPENSE',
          description: 'Test',
          date: '2024-01-15T12:00:00.000Z',
          accountId: 'account-1'
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

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5000,
          currency: 'JPY',
          type: 'EXPENSE',
          description: 'Test',
          date: '2024-01-15T12:00:00.000Z',
          accountId: 'other-account'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('指定された口座が見つかりません')
    })

    it('should handle income transactions correctly', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.currency.findUnique as jest.Mock).mockResolvedValue(mockCurrency)
      ;(prisma.appAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount)
      
      const incomeTransaction = {
        ...mockTransaction,
        type: 'INCOME',
        description: '給与'
      }
      ;(prisma.transaction.create as jest.Mock).mockResolvedValue(incomeTransaction)

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 300000,
          currency: 'JPY',
          type: 'INCOME',
          description: '給与',
          date: '2024-01-15T12:00:00.000Z',
          accountId: 'account-1'
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Income should increase balance
      expect(prisma.appAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          balance: {
            increment: 300000 // Income should increase balance
          }
        }
      })
    })
  })

  describe('GET /api/transactions', () => {
    it('should fetch transactions with pagination', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([mockTransaction])
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/transactions?page=1&limit=20')

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

    it('should filter by transaction type', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/transactions?type=EXPENSE')

      await GET(request)

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

    it('should filter by date range', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0)

      const startDate = '2024-01-01T00:00:00.000Z'
      const endDate = '2024-01-31T23:59:59.999Z'
      const request = new NextRequest(`http://localhost:3000/api/transactions?startDate=${startDate}&endDate=${endDate}`)

      await GET(request)

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

    it('should search by description and notes', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/transactions?search=ランチ')

      await GET(request)

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
  })

  describe('PUT /api/transactions/[id]', () => {
    it('should update transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction)
      
      const updatedTransaction = {
        ...mockTransaction,
        description: '新しい説明'
      }
      
      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        return callback(prisma)
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)
      ;(prisma.transaction.update as jest.Mock).mockResolvedValue(updatedTransaction)
      ;(prisma.appAccount.update as jest.Mock).mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/transactions/transaction-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: '新しい説明'
        })
      })

      const response = await PUT(request, { params: { id: 'transaction-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.description).toBe('新しい説明')
    })

    it('should reject updating non-owned transaction', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transactions/other-transaction', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: '新しい説明'
        })
      })

      const response = await PUT(request, { params: { id: 'other-transaction' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('取引が見つかりません')
    })
  })

  describe('DELETE /api/transactions/[id]', () => {
    it('should delete transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction)

      const mockTransactionFn = jest.fn().mockImplementation(async (callback) => {
        return callback(prisma)
      })
      ;(prisma.$transaction as jest.Mock).mockImplementation(mockTransactionFn)
      ;(prisma.transaction.delete as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prisma.appAccount.update as jest.Mock).mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/transactions/transaction-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'transaction-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('取引が削除されました')
      
      // Balance should be adjusted (reverse the original transaction)
      expect(prisma.appAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          balance: {
            decrement: -5000 // Reverse the expense
          }
        }
      })
    })

    it('should reject deleting non-owned transaction', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transactions/other-transaction', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'other-transaction' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('取引が見つかりません')
    })
  })

  describe('GET /api/transactions/[id]', () => {
    it('should fetch single transaction successfully', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction)

      const request = new NextRequest('http://localhost:3000/api/transactions/transaction-1')

      const response = await GET_ID(request, { params: { id: 'transaction-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('transaction-1')
      expect(data.data.amount).toBe('5000') // Should be string for Decimal
    })

    it('should return 404 for non-existent transaction', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/transactions/nonexistent')

      const response = await GET_ID(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('取引が見つかりません')
    })
  })
})