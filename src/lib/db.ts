// Use dynamic import to avoid ESM resolution issues during build
let PrismaClientClass: typeof import('@prisma/client').PrismaClient

const globalForPrisma = globalThis as unknown as {
  prisma: import('@prisma/client').PrismaClient | undefined
  prismaInit: Promise<void> | undefined
}

async function initPrisma() {
  if (!PrismaClientClass) {
    const mod = await import('@prisma/client')
    PrismaClientClass = mod.PrismaClient
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClientClass()
  }
}

// Initialize immediately
globalForPrisma.prismaInit = initPrisma()

// Export a getter that ensures Prisma is initialized
export async function getPrisma() {
  await globalForPrisma.prismaInit
  return globalForPrisma.prisma!
}

// For backwards compatibility - sync access (may throw if not initialized)
export const prisma = new Proxy({} as import('@prisma/client').PrismaClient, {
  get(_, prop) {
    if (!globalForPrisma.prisma) {
      throw new Error('Prisma not initialized. Use getPrisma() for async access.')
    }
    return (globalForPrisma.prisma as unknown as Record<string, unknown>)[prop as string]
  }
})
