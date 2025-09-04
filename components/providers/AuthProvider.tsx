'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import type { User } from '@/lib/types/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  authLoading: boolean
  authError: string | null
  signIn: typeof authClient.signIn
  signUp: typeof authClient.signUp  
  signOut: typeof authClient.signOut
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
          setUser(user ? { ...user, baseCurrency: 'JPY' } as User : null)
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        authLoading,
        authError,
        signIn: authClient.signIn,
        signUp: authClient.signUp,
        signOut: authClient.signOut,
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