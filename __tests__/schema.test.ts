/**
 * Schema validation tests
 */
import { z } from 'zod'

describe('Schema Validations', () => {
  describe('Currency Schema', () => {
    const currencySchema = z.object({
      code: z.string().length(3),
      symbol: z.string().min(1),
      name: z.string().min(1),
      decimals: z.number().min(0).max(8),
      isActive: z.boolean().default(true),
    })

    it('should validate JPY currency', () => {
      const jpyData = {
        code: 'JPY',
        symbol: '¥',
        name: '日本円',
        decimals: 0,
        isActive: true,
      }

      expect(() => currencySchema.parse(jpyData)).not.toThrow()
    })

    it('should validate USD currency', () => {
      const usdData = {
        code: 'USD',
        symbol: '$',
        name: '米ドル',
        decimals: 2,
        isActive: true,
      }

      expect(() => currencySchema.parse(usdData)).not.toThrow()
    })

    it('should reject invalid currency codes', () => {
      const invalidData = {
        code: 'INVALID',
        symbol: '$',
        name: 'Invalid',
        decimals: 2,
      }

      expect(() => currencySchema.parse(invalidData)).toThrow()
    })
  })

  describe('Account Schema', () => {
    const accountSchema = z.object({
      name: z.string().min(1),
      type: z.enum(['CASH', 'CHECKING', 'SAVINGS', 'FIXED_DEPOSIT']),
      balance: z.number().min(0),
      currency: z.string().length(3),
    })

    it('should validate account creation data', () => {
      const accountData = {
        name: 'Main Checking',
        type: 'CHECKING' as const,
        balance: 10000,
        currency: 'JPY',
      }

      expect(() => accountSchema.parse(accountData)).not.toThrow()
    })

    it('should reject negative balance', () => {
      const invalidData = {
        name: 'Test Account',
        type: 'CASH' as const,
        balance: -100,
        currency: 'JPY',
      }

      expect(() => accountSchema.parse(invalidData)).toThrow()
    })
  })

  describe('User Registration Schema', () => {
    const userSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
      baseCurrency: z.string().length(3).default('JPY'),
    })

    it('should validate user registration data', () => {
      const userData = {
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
        baseCurrency: 'JPY',
      }

      expect(() => userSchema.parse(userData)).not.toThrow()
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      }

      expect(() => userSchema.parse(invalidData)).toThrow()
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '123',
        name: 'Test User',
      }

      expect(() => userSchema.parse(invalidData)).toThrow()
    })
  })
})
