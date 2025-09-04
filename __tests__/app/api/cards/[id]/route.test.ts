import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/cards/[id]/route'
import { CardService } from '@/lib/services/card-service'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// モック
jest.mock('@/lib/auth')
jest.mock('@/lib/services/card-service')
jest.mock('@/lib/db', () => ({
  prisma: {
    card: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
  },
}))

const mockAuth = auth as jest.Mocked<typeof auth>;
const mockCardService = CardService as jest.Mocked<typeof CardService>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/cards/[id]', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
  }

  const mockSession = {
    user: mockUser,
    token: 'test-token',
    expiresAt: new Date(Date.now() + 86400000)
  }

  const mockCardId = 'card-123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.api = {
      getSession: jest.fn()
    } as any
  })

  describe('GET /api/cards/[id]', () => {
    it('should return card detail for authenticated user', async () => {
      const mockCardDetail = {
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
            currency: 'JPY'
          }
        ],
        autoTransfers: []
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.getCardDetail.mockResolvedValue(mockCardDetail as any)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCardDetail)
      expect(mockCardService.getCardDetail).toHaveBeenCalledWith('user-123', mockCardId)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`)
      const response = await GET(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when card not found', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.getCardDetail.mockRejectedValue(new Error('Card not found'))

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`)
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
        billingDate: 20
      }

      const updatedCard = {
        id: mockCardId,
        name: 'Updated Card Name',
        type: 'CREDIT',
        creditLimit: '150000',
        billingDate: 20
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.updateCard.mockResolvedValue(updatedCard as any)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedCard)
      expect(mockCardService.updateCard).toHaveBeenCalledWith('user-123', mockCardId, updateData)
    })

    it('should return 400 for validation error', async () => {
      const invalidData = {
        creditLimit: -1000 // Negative limit
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle service errors', async () => {
      const updateData = { name: 'Updated Name' }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.updateCard.mockRejectedValue(new Error('Card not found'))

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Card not found')
    })
  })

  describe('DELETE /api/cards/[id]', () => {
    it('should deactivate card when it has transactions', async () => {
      const mockCard = {
        id: mockCardId,
        userId: 'user-123',
        name: 'Test Card'
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockPrisma.card.findFirst.mockResolvedValue(mockCard as any)
      mockPrisma.transaction.count.mockResolvedValue(5) // Has transactions
      mockPrisma.card.update.mockResolvedValue({} as any)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Card deactivated (has existing transactions)')
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: mockCardId },
        data: { isActive: false }
      })
    })

    it('should delete card when it has no transactions', async () => {
      const mockCard = {
        id: mockCardId,
        userId: 'user-123',
        name: 'Test Card'
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockPrisma.card.findFirst.mockResolvedValue(mockCard as any)
      mockPrisma.transaction.count.mockResolvedValue(0) // No transactions
      mockPrisma.card.delete.mockResolvedValue({} as any)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Card deleted successfully')
      expect(mockPrisma.card.delete).toHaveBeenCalledWith({
        where: { id: mockCardId }
      })
    })

    it('should return 404 when card not found', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockPrisma.card.findFirst.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Card not found')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockPrisma.card.findFirst.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest(`http://localhost:3000/api/cards/${mockCardId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: mockCardId }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete card')
    })
  })
})