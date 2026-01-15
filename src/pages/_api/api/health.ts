import { prisma } from '../../../lib/db'

export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`

    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'kiBoアプリ',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: 'connected',
    }

    return Response.json(healthCheck, { status: 200 })
  } catch (error) {
    const healthCheck = {
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'kiBoアプリ',
      error: error instanceof Error ? error.message : 'Unknown error',
      database: 'disconnected',
    }

    return Response.json(healthCheck, { status: 503 })
  }
}

// Make this API route dynamic
export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
