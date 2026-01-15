import { describe, it, expect, beforeAll } from 'bun:test'
import { getPrisma } from '~/lib/db'

// Skip database tests if no database is available
const skipIfNoDatabase = process.env.DATABASE_URL?.includes('test_db') ?? true

describe('Database Connection', () => {
  it.skipIf(skipIfNoDatabase)('should have prisma client instance', async () => {
    const prisma = await getPrisma()
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
  })

  it.skipIf(skipIfNoDatabase)('should have all required models', async () => {
    const prisma = await getPrisma()
    expect(prisma.user).toBeDefined()
    expect(prisma.session).toBeDefined()
    expect(prisma.account).toBeDefined()
    expect(prisma.appAccount).toBeDefined()
    expect(prisma.currency).toBeDefined()
    expect(prisma.exchangeRate).toBeDefined()
    expect(prisma.card).toBeDefined()
    expect(prisma.category).toBeDefined()
    expect(prisma.transaction).toBeDefined()
    expect(prisma.scheduledTransaction).toBeDefined()
    expect(prisma.budget).toBeDefined()
  })
})
