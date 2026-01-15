import { auth } from '../../../lib/auth'

// better-auth provides a handler that works with standard Request/Response
export async function GET(request: Request): Promise<Response> {
  return auth.handler(request)
}

export async function POST(request: Request): Promise<Response> {
  return auth.handler(request)
}

// Make this API route dynamic
export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
