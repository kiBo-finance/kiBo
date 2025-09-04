import type { User as BetterAuthUser } from 'better-auth'

export interface User extends BetterAuthUser {
  baseCurrency: string
}

export interface Session {
  id: string
  userId: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface AuthContext {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  authLoading: boolean
  authError: string | null
}
