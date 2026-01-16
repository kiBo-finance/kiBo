'use client'

import { SignUpForm } from '@/components/auth/SignUpForm'
import { useRouter } from 'waku/router/client'

export function SignupClient() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/login' as any)
  }

  const handleToggleMode = () => {
    router.push('/login' as any)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <SignUpForm onSuccess={handleSuccess} onToggleMode={handleToggleMode} />
    </div>
  )
}
