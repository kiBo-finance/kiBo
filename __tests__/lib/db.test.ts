import { prisma } from '@/lib/db'

describe('Database Connection', () => {
  it('should have prisma client instance', () => {
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
  })

  it('should have all required models', () => {
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
