import { describe, it, expect, beforeEach, mock } from 'bun:test'

// Define mock functions at top level
const mockGetSession = mock(() => Promise.resolve(null))
const mockGetCardDetail = mock(() => Promise.resolve(null))
const mockUpdateCard = mock(() => Promise.resolve({}))
const mockCardFindFirst = mock(() => Promise.resolve(null))
const mockCardUpdate = mock(() => Promise.resolve({}))
const mockCardDelete = mock(() => Promise.resolve({}))
const mockTransactionCount = mock(() => Promise.resolve(0))

// Mock modules before importing
mock.module('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

mock.module('~/lib/services/card-service', () => ({
  CardService: {
    getCardDetail: mockGetCardDetail,
    updateCard: mockUpdateCard,
  },
}))

mock.module('~/lib/db', () => ({
  prisma: {
    card: {
      findFirst: mockCardFindFirst,
      update: mockCardUpdate,
      delete: mockCardDelete,
    },
    transaction: {
      count: mockTransactionCount,
    },
  },
}))

// Import after mocks are set up
import { GET, PATCH, DELETE } from '~/pages/_api/cards/[id]'

// Type definitions for mock objects
interface MockUser {
  id: string
  email: string
  name: string
}

interface MockSession {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
  }
  user: MockUser
}

interface MockCard {
  id: string
  name: string
  type: 'CREDIT' | 'DEBIT' | 'PREPAID' | 'POSTPAY'
  lastFourDigits: string
  userId?: string
  isActive?: boolean
  creditLimit?: string
  billingDate?: number
  paymentDate?: number
  monthlyUsage?: string
  account?: { id: string; name: string; currency: string }
  transactions?: Array<{
    id: string
    amount: string
    description: string
    date: string
    type: string
    currency: string
  }>
  autoTransfers?: Array<unknown>
}

describe('/api/cards/[id]', () => {
  const mockUser: MockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  }

  const mockSession: MockSession = {
    session: {
      id: 'session-123',
      userId: mockUser.id,
      token: 'test-token',
      expiresAt: new Date(Date.now() + 86400000),
    },
    user: mockUser,
  }

  const mockCardId = 'card-123'

  beforeEach(() => {
    mockGetSession.mockReset()
    mockGetCardDetail.mockReset()
    mockUpdateCard.mockReset()
    mockCardFindFirst.mockReset()
    mockCardUpdate.mockReset()
    mockCardDelete.mockReset()
    mockTransactionCount.mockReset()
  })

  describe('GET /api/cards/[id]', () => {
    it('should return card detail for authenticated user', async () => {
      const mockCardDetail: MockCard = {
        id: mockCardId,
        name: 'Test Credit Card',
        type: 'CREDIT',
        lastFourDigits: '1234',
        creditLimit: '100000',
        monthlyUsage: '15000',
        account: { id: 'account-1', name: 'Main Account', currency: 'JPY' },
        transactions: [
          {
            id: 'transaction-1',
            amount: '5000',
            description: 'Test purchase',
            date: '2024-01-15T10:00:00Z',
            type: 'EXPENSE',
            currency: 'JPY',
          },
        ],
        autoTransfers: [],
      }

      mockGetSession.mockResolvedValue(mockSession)
      mockGetCardDetail.mockResolvedValue(mockCardDetail)

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCardDetail)
      expect(mockGetCardDetail).toHaveBeenCalledWith('user-123', mockCardId)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when card not found', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockGetCardDetail.mockRejectedValue(new Error('Card not found'))

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Card not found')
    })
  })

  describe('PATCH /api/cards/[id]', () => {
    it('should update card successfully', async () => {
      const updateData = {
        name: 'Updated Card Name',
        creditLimit: 150000,
        billingDate: 20,
      }

      const updatedCard: Partial<MockCard> = {
        id: mockCardId,
        name: 'Updated Card Name',
        type: 'CREDIT',
        creditLimit: '150000',
        billingDate: 20,
      }

      mockGetSession.mockResolvedValue(mockSession)
      mockUpdateCard.mockResolvedValue(updatedCard)

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedCard)
      expect(mockUpdateCard).toHaveBeenCalledWith('user-123', mockCardId, updateData)
    })

    it('should return 400 for validation error', async () => {
      const invalidData = {
        creditLimit: -1000, // Negative limit
      }

      mockGetSession.mockResolvedValue(mockSession)

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle service errors', async () => {
      const updateData = { name: 'Updated Name' }

      mockGetSession.mockResolvedValue(mockSession)
      mockUpdateCard.mockRejectedValue(new Error('Card not found'))

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Card not found')
    })
  })

  describe('DELETE /api/cards/[id]', () => {
    it('should deactivate card when it has transactions', async () => {
      const mockCard: Partial<MockCard> = {
        id: mockCardId,
        userId: 'user-123',
        name: 'Test Card',
      }

      mockGetSession.mockResolvedValue(mockSession)
      mockCardFindFirst.mockResolvedValue(mockCard)
      mockTransactionCount.mockResolvedValue(5) // Has transactions
      mockCardUpdate.mockResolvedValue({})

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Card deactivated (has existing transactions)')
      expect(mockCardUpdate).toHaveBeenCalledWith({
        where: { id: mockCardId },
        data: { isActive: false },
      })
    })

    it('should delete card when it has no transactions', async () => {
      const mockCard: Partial<MockCard> = {
        id: mockCardId,
        userId: 'user-123',
        name: 'Test Card',
      }

      mockGetSession.mockResolvedValue(mockSession)
      mockCardFindFirst.mockResolvedValue(mockCard)
      mockTransactionCount.mockResolvedValue(0) // No transactions
      mockCardDelete.mockResolvedValue({})

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Card deleted successfully')
      expect(mockCardDelete).toHaveBeenCalledWith({
        where: { id: mockCardId },
      })
    })

    it('should return 404 when card not found', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockCardFindFirst.mockResolvedValue(null)

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Card not found')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      mockGetSession.mockResolvedValue(mockSession)
      mockCardFindFirst.mockRejectedValue(new Error('Database error'))

      const request = new Request(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete card')
    })
  })
})
