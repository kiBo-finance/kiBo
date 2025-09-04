import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/cards/route'
import { CardService } from '@/lib/services/card-service'
import { auth } from '@/lib/auth'

// モック
jest.mock('@/lib/auth')
jest.mock('@/lib/services/card-service')

const mockAuth = auth as jest.Mocked<typeof auth>;
const mockCardService = CardService as jest.Mocked<typeof CardService>;

describe('/api/cards', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.api = {
      getSession: jest.fn()
    } as any
  })

  describe('GET /api/cards', () => {
    it('should return cards for authenticated user', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Test Credit Card',
          type: 'CREDIT',
          lastFourDigits: '1234',
          isActive: true,
          account: { id: 'account-1', name: 'Main Account', currency: 'JPY' },
          _count: { transactions: 5 }
        },
        {
          id: 'card-2',
          name: 'Test Debit Card',
          type: 'DEBIT',
          lastFourDigits: '5678',
          isActive: true,
          account: { id: 'account-2', name: 'Checking Account', currency: 'JPY' },
          _count: { transactions: 3 }
        }
      ]

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.getCards.mockResolvedValue(mockCards as any)

      const request = new NextRequest('http://localhost:3000/api/cards')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCards)
      expect(mockCardService.getCards).toHaveBeenCalledWith('user-123', false)
    })

    it('should include inactive cards when requested', async () => {
      const mockCards = [
        { id: 'card-1', isActive: true },
        { id: 'card-2', isActive: false }
      ]

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.getCards.mockResolvedValue(mockCards as any)

      const request = new NextRequest('http://localhost:3000/api/cards?includeInactive=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockCardService.getCards).toHaveBeenCalledWith('user-123', true)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/cards')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle service errors', async () => {
      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.getCards.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/cards')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch cards')
    })
  })

  describe('POST /api/cards', () => {
    it('should create a credit card successfully', async () => {
      const mockCard = {
        id: 'card-123',
        name: 'New Credit Card',
        type: 'CREDIT',
        lastFourDigits: '1234',
        creditLimit: '100000',
        account: { id: 'account-1', name: 'Main Account', currency: 'JPY' }
      }

      const cardData = {
        name: 'New Credit Card',
        type: 'CREDIT',
        lastFourDigits: '1234',
        accountId: 'account-1',
        creditLimit: 100000,
        billingDate: 15,
        paymentDate: 10
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.createCard.mockResolvedValue(mockCard as any)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCard)
      expect(mockCardService.createCard).toHaveBeenCalledWith('user-123', cardData)
    })

    it('should create a debit card with auto transfer', async () => {
      const mockCard = {
        id: 'card-123',
        name: 'New Debit Card',
        type: 'DEBIT',
        lastFourDigits: '5678',
        autoTransferEnabled: true,
        linkedAccountId: 'linked-account-1'
      }

      const cardData = {
        name: 'New Debit Card',
        type: 'DEBIT',
        lastFourDigits: '5678',
        accountId: 'account-1',
        linkedAccountId: 'linked-account-1',
        autoTransferEnabled: true,
        minBalance: 10000
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.createCard.mockResolvedValue(mockCard as any)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('should create a prepaid card with initial balance', async () => {
      const cardData = {
        name: 'New Prepaid Card',
        type: 'PREPAID',
        lastFourDigits: '9012',
        accountId: 'account-1',
        balance: 5000
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.createCard.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockCardService.createCard).toHaveBeenCalledWith('user-123', cardData)
    })

    it('should create a postpay card with monthly limit', async () => {
      const cardData = {
        name: 'New Postpay Card',
        type: 'POSTPAY',
        lastFourDigits: '3456',
        accountId: 'account-1',
        monthlyLimit: 50000,
        settlementDay: 25
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.createCard.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should return 400 for missing credit limit on credit card', async () => {
      const cardData = {
        name: 'Credit Card',
        type: 'CREDIT',
        lastFourDigits: '1234',
        accountId: 'account-1'
        // creditLimit missing
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Credit limit is required for credit cards')
    })

    it('should return 400 for debit card with auto transfer but no linked account', async () => {
      const cardData = {
        name: 'Debit Card',
        type: 'DEBIT',
        lastFourDigits: '5678',
        accountId: 'account-1',
        autoTransferEnabled: true
        // linkedAccountId missing
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Linked account is required when auto transfer is enabled')
    })

    it('should return 400 for missing monthly limit on postpay card', async () => {
      const cardData = {
        name: 'Postpay Card',
        type: 'POSTPAY',
        lastFourDigits: '3456',
        accountId: 'account-1'
        // monthlyLimit missing
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Monthly limit is required for postpay cards')
    })

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        name: '', // Empty name
        type: 'INVALID_TYPE',
        lastFourDigits: '12345', // Too long
        accountId: 'account-1'
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle service errors', async () => {
      const cardData = {
        name: 'Test Card',
        type: 'CREDIT',
        lastFourDigits: '1234',
        accountId: 'account-1',
        creditLimit: 100000
      }

      mockAuth.api.getSession.mockResolvedValue(mockSession)
      mockCardService.createCard.mockRejectedValue(new Error('Account not found'))

      const request = new NextRequest('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Account not found')
    })
  })
})