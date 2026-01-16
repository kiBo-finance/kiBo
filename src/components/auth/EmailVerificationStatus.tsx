'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { useState } from 'react'

interface EmailVerificationStatusProps {
  email: string
  isVerified: boolean
  onResendSuccess?: () => void
}

export function EmailVerificationStatus({
  email,
  isVerified,
  onResendSuccess,
}: EmailVerificationStatusProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleResendVerification = async () => {
    setIsResending(true)
    setResendMessage(null)

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: '/dashboard',
      })

      if (result.error) {
        setResendMessage('再送信に失敗しました: ' + result.error.message)
      } else {
        setResendMessage('認証メールを再送信しました。メールボックスをご確認ください。')
        onResendSuccess?.()
      }
    } catch (error) {
      setResendMessage('再送信に失敗しました')
    } finally {
      setIsResending(false)
    }
  }

  if (isVerified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
              <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm text-green-800">メールアドレスは認証済みです</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">メール認証が必要です</CardTitle>
        <CardDescription className="text-yellow-700">
          {email} に認証メールを送信しました
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-yellow-700">
            メールボックスをご確認いただき、認証リンクをクリックしてください。
          </p>

          {resendMessage && (
            <div
              className={`rounded-md p-3 text-sm ${
                resendMessage.includes('失敗')
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              {resendMessage}
            </div>
          )}

          <Button
            onClick={handleResendVerification}
            disabled={isResending}
            variant="outline"
            size="sm"
          >
            {isResending ? '再送信中...' : '認証メールを再送信'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
