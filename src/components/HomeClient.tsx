'use client'

import { useEffect } from 'react'
import { useRouter } from 'waku/router/client'
import { useAuth } from './providers/AuthProvider'

export function HomeClient() {
  const router = useRouter()
  const { isAuthenticated, authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [isAuthenticated, authLoading, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
    </div>
  )
}
