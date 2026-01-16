'use client'

import { authClient } from '@/lib/auth-client'
import type { User } from '@/lib/types/auth'
import { createContext, useContext, useEffect, useState } from 'react'

interface Session {
  user: User | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  authLoading: boolean
  authError: string | null
  signIn: typeof authClient.signIn
  signUp: typeof authClient.signUp
  signOut: () => Promise<void>
  getSession: typeof authClient.getSession
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        if (mounted) {
          const user = session.data?.user
          setUser(user ? ({ ...user, baseCurrency: 'JPY' } as User) : null)
          setAuthError(session.error?.message || null)
        }
      } catch (error) {
        if (mounted) {
          setAuthError(error instanceof Error ? error.message : 'Authentication error')
          setUser(null)
        }
      } finally {
        if (mounted) {
          setAuthLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])

  const isAuthenticated = !!user

  const handleSignOut = async () => {
    await authClient.signOut()
    setUser(null)
    window.location.href = '/login'
  }

  const session: Session | null = user ? { user } : null

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        authLoading,
        authError,
        signIn: authClient.signIn,
        signUp: authClient.signUp,
        signOut: handleSignOut,
        getSession: authClient.getSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
