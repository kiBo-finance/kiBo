import type { User as BetterAuthUser } from 'better-auth'

export interface User extends BetterAuthUser {
  baseCurrency: string
}

/**
 * Session user interface with id property for use in server actions
 * This is a minimal interface for accessing user data from session
 */
export interface SessionUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  emailVerified?: boolean
  baseCurrency?: string
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
