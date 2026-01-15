import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  mock,
} from 'bun:test'

// Define mock functions at the top level
const mockGetSession = mock(() => Promise.resolve(null))

// Mock auth module before importing
mock.module('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

import { POST as chargeCard } from '~/pages/_api/cards/[id]/charge'
import { POST as makePayment } from '~/pages/_api/cards/[id]/payment'
import {
  GET as getCard,
  PATCH as updateCard,
  DELETE as deleteCard,
} from '~/pages/_api/cards/[id]'
import { GET as getCards, POST as createCard } from '~/pages/_api/cards/index'
import { prisma } from '~/lib/db'

// Skip these tests if database is not available
const describeIfDb =
  process.env.DATABASE_URL && process.env.RUN_DB_TESTS ? describe : describe.skip

describeIfDb('Card Management Integration Tests', () => {
  let testUser: any
  let testAccount: any
  let testCard: any

  const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
    token: 'test-token',
    expiresAt: new Date(Date.now() + 86400000),
  }

  beforeAll(async () => {
    mockGetSession.mockImplementation(() => Promise.resolve(mockSession))

    testUser = await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
      },
    })

    testAccount = await prisma.appAccount.create({
      data: {
        userId: testUser.id,
        name: 'Test Account',
        type: 'CHECKING',
        currency: 'JPY',
        balance: '1000000',
      },
    })
  })

  afterAll(async () => {
    await prisma.card.deleteMany({ where: { userId: testUser.id } })
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } })
    await prisma.appAccount.deleteMany({ where: { userId: testUser.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  beforeEach(async () => {
    await prisma.card.deleteMany({ where: { userId: testUser.id } })
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } })
    await prisma.autoTransfer.deleteMany({ where: { fromAccountId: testAccount.id } })
  })

  describe('Credit Card Flow', () => {
    it('should create, use, and manage credit card lifecycle', async () => {
      const cardData = {
        name: 'Test Credit Card',
        type: 'CREDIT',
        lastFourDigits: '1234',
        accountId: testAccount.id,
        creditLimit: 500000,
        billingDate: 15,
        paymentDate: 10,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(201)
      expect(createData.success).toBe(true)
      expect(createData.data.name).toBe('Test Credit Card')
      expect(createData.data.type).toBe('CREDIT')

      const cardId = createData.data.id

      const getRequest = new Request(`http://localhost:3000/api/cards/${cardId}`)
      const getResponse = await getCard(getRequest, { params: Promise.resolve({ id: cardId }) })
      const getData = await getResponse.json()

      expect(getResponse.status).toBe(200)
      expect(getData.data.creditLimit).toBe('500000')

      const paymentData = {
        amount: 15000,
        currency: 'JPY',
        description: 'Test purchase',
        categoryId: null,
      }

      const paymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      })

      const paymentResponse = await makePayment(paymentRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const paymentResponseData = await paymentResponse.json()

      expect(paymentResponse.status).toBe(200)
      expect(paymentResponseData.success).toBe(true)

      const getAfterPaymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}`)
      const getAfterPaymentResponse = await getCard(getAfterPaymentRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const getAfterPaymentData = await getAfterPaymentResponse.json()

      expect(getAfterPaymentData.data.monthlyUsage).toBe('15000')

      const listRequest = new Request('http://localhost:3000/api/cards')
      const listResponse = await getCards(listRequest)
      const listData = await listResponse.json()

      expect(listResponse.status).toBe(200)
      expect(listData.data).toHaveLength(1)
      expect(listData.data[0].id).toBe(cardId)
    })

    it('should prevent payment exceeding credit limit', async () => {
      const cardData = {
        name: 'Limited Credit Card',
        type: 'CREDIT',
        lastFourDigits: '5678',
        accountId: testAccount.id,
        creditLimit: 10000,
        billingDate: 15,
        paymentDate: 10,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()
      const cardId = createData.data.id

      const paymentData = {
        amount: 15000,
        currency: 'JPY',
        description: 'Exceeding limit',
        categoryId: null,
      }

      const paymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      })

      const paymentResponse = await makePayment(paymentRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const paymentResponseData = await paymentResponse.json()

      expect(paymentResponse.status).toBe(400)
      expect(paymentResponseData.error).toContain('Insufficient credit limit')
    })
  })

  describe('Debit Card with Auto Transfer Flow', () => {
    let linkedAccount: any

    beforeEach(async () => {
      linkedAccount = await prisma.appAccount.create({
        data: {
          userId: testUser.id,
          name: 'Linked Savings Account',
          type: 'SAVINGS',
          currency: 'JPY',
          balance: '500000',
        },
      })
    })

    afterEach(async () => {
      if (linkedAccount) {
        await prisma.appAccount.delete({ where: { id: linkedAccount.id } })
      }
    })

    it('should create debit card with auto transfer and handle insufficient balance', async () => {
      const cardData = {
        name: 'Auto Transfer Debit Card',
        type: 'DEBIT',
        lastFourDigits: '9012',
        accountId: testAccount.id,
        linkedAccountId: linkedAccount.id,
        autoTransferEnabled: true,
        minBalance: 10000,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(201)
      expect(createData.data.autoTransferEnabled).toBe(true)

      const cardId = createData.data.id

      await prisma.appAccount.update({
        where: { id: testAccount.id },
        data: { balance: '5000' },
      })

      const paymentData = {
        amount: 10000,
        currency: 'JPY',
        description: 'Payment requiring auto transfer',
      }

      const paymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      })

      const paymentResponse = await makePayment(paymentRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const paymentResponseData = await paymentResponse.json()

      expect(paymentResponse.status).toBe(200)
      expect(paymentResponseData.success).toBe(true)

      const autoTransfers = await prisma.autoTransfer.findMany({
        where: { cardId },
      })
      expect(autoTransfers).toHaveLength(1)
      expect(autoTransfers[0].amount).toBe('15000')

      const updatedLinkedAccount = await prisma.appAccount.findUnique({
        where: { id: linkedAccount.id },
      })
      expect(parseFloat(updatedLinkedAccount!.balance)).toBeLessThan(500000)
    })
  })

  describe('Prepaid Card Flow', () => {
    it('should create prepaid card and handle charging', async () => {
      const cardData = {
        name: 'Test Prepaid Card',
        type: 'PREPAID',
        lastFourDigits: '3456',
        accountId: testAccount.id,
        balance: 10000,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(201)
      expect(createData.data.balance).toBe('10000')

      const cardId = createData.data.id

      const chargeData = {
        amount: 5000,
        fromAccountId: testAccount.id,
      }

      const chargeRequest = new Request(`http://localhost:3000/api/cards/${cardId}/charge`, {
        method: 'POST',
        body: JSON.stringify(chargeData),
        headers: { 'Content-Type': 'application/json' },
      })

      const chargeResponse = await chargeCard(chargeRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const chargeResponseData = await chargeResponse.json()

      expect(chargeResponse.status).toBe(200)
      expect(chargeResponseData.success).toBe(true)

      const getAfterChargeRequest = new Request(`http://localhost:3000/api/cards/${cardId}`)
      const getAfterChargeResponse = await getCard(getAfterChargeRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const getAfterChargeData = await getAfterChargeResponse.json()

      expect(getAfterChargeData.data.balance).toBe('15000')

      const paymentData = {
        amount: 8000,
        currency: 'JPY',
        description: 'Prepaid card payment',
      }

      const paymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      })

      const paymentResponse = await makePayment(paymentRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const paymentResponseData = await paymentResponse.json()

      expect(paymentResponse.status).toBe(200)
      expect(paymentResponseData.success).toBe(true)

      const getAfterPaymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}`)
      const getAfterPaymentResponse = await getCard(getAfterPaymentRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const getAfterPaymentData = await getAfterPaymentResponse.json()

      expect(getAfterPaymentData.data.balance).toBe('7000')
    })

    it('should prevent prepaid payment exceeding balance', async () => {
      const cardData = {
        name: 'Low Balance Prepaid',
        type: 'PREPAID',
        lastFourDigits: '7890',
        accountId: testAccount.id,
        balance: 1000,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()
      const cardId = createData.data.id

      const paymentData = {
        amount: 2000,
        currency: 'JPY',
        description: 'Exceeding balance',
      }

      const paymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      })

      const paymentResponse = await makePayment(paymentRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const paymentResponseData = await paymentResponse.json()

      expect(paymentResponse.status).toBe(400)
      expect(paymentResponseData.error).toContain('Insufficient balance')
    })
  })

  describe('Card Management Operations', () => {
    it('should update card information', async () => {
      const cardData = {
        name: 'Original Card Name',
        type: 'CREDIT',
        lastFourDigits: '1111',
        accountId: testAccount.id,
        creditLimit: 100000,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()
      const cardId = createData.data.id

      const updateData = {
        name: 'Updated Card Name',
        creditLimit: 200000,
        billingDate: 25,
      }

      const updateRequest = new Request(`http://localhost:3000/api/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const updateResponse = await updateCard(updateRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const updateResponseData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updateResponseData.success).toBe(true)

      const getRequest = new Request(`http://localhost:3000/api/cards/${cardId}`)
      const getResponse = await getCard(getRequest, { params: Promise.resolve({ id: cardId }) })
      const getData = await getResponse.json()

      expect(getData.data.name).toBe('Updated Card Name')
      expect(getData.data.creditLimit).toBe('200000')
      expect(getData.data.billingDate).toBe(25)
    })

    it('should delete card without transactions', async () => {
      const cardData = {
        name: 'Card to Delete',
        type: 'CREDIT',
        lastFourDigits: '2222',
        accountId: testAccount.id,
        creditLimit: 100000,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()
      const cardId = createData.data.id

      const deleteRequest = new Request(`http://localhost:3000/api/cards/${cardId}`, {
        method: 'DELETE',
      })

      const deleteResponse = await deleteCard(deleteRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const deleteResponseData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteResponseData.message).toBe('Card deleted successfully')

      const getRequest = new Request(`http://localhost:3000/api/cards/${cardId}`)
      const getResponse = await getCard(getRequest, { params: Promise.resolve({ id: cardId }) })

      expect(getResponse.status).toBe(404)
    })

    it('should deactivate card with transactions instead of deleting', async () => {
      const cardData = {
        name: 'Card with Transactions',
        type: 'CREDIT',
        lastFourDigits: '3333',
        accountId: testAccount.id,
        creditLimit: 100000,
      }

      const createRequest = new Request('http://localhost:3000/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
        headers: { 'Content-Type': 'application/json' },
      })

      const createResponse = await createCard(createRequest)
      const createData = await createResponse.json()
      const cardId = createData.data.id

      const paymentData = {
        amount: 5000,
        currency: 'JPY',
        description: 'Transaction to prevent deletion',
      }

      const paymentRequest = new Request(`http://localhost:3000/api/cards/${cardId}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      })

      await makePayment(paymentRequest, { params: Promise.resolve({ id: cardId }) })

      const deleteRequest = new Request(`http://localhost:3000/api/cards/${cardId}`, {
        method: 'DELETE',
      })

      const deleteResponse = await deleteCard(deleteRequest, {
        params: Promise.resolve({ id: cardId }),
      })
      const deleteResponseData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteResponseData.message).toBe('Card deactivated (has existing transactions)')

      const getRequest = new Request(`http://localhost:3000/api/cards/${cardId}`)
      const getResponse = await getCard(getRequest, { params: Promise.resolve({ id: cardId }) })
      const getData = await getResponse.json()

      expect(getData.data.isActive).toBe(false)
    })
  })
})
