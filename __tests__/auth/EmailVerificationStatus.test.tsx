import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EmailVerificationStatus } from '@/components/auth/EmailVerificationStatus'
import { authClient } from '@/lib/auth-client'

// authClientをモック
jest.mock('@/lib/auth-client')

const mockAuthClient = authClient as jest.Mocked<typeof authClient>

describe('EmailVerificationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show verified status when email is verified', () => {
    render(<EmailVerificationStatus email="test@example.com" isVerified={true} />)

    expect(screen.getByText('メールアドレスは認証済みです')).toBeInTheDocument()
    expect(screen.queryByText('認証メールを再送信')).not.toBeInTheDocument()
  })

  it('should show unverified status with resend option', () => {
    render(<EmailVerificationStatus email="test@example.com" isVerified={false} />)

    expect(screen.getByText('メール認証が必要です')).toBeInTheDocument()
    expect(screen.getByText('test@example.com に認証メールを送信しました')).toBeInTheDocument()
    expect(screen.getByText('認証メールを再送信')).toBeInTheDocument()
  })

  it('should handle successful email resend', async () => {
    const mockOnResendSuccess = jest.fn()

    mockAuthClient.sendVerificationEmail.mockResolvedValue({
      data: { success: true },
      error: null,
    })

    render(
      <EmailVerificationStatus
        email="test@example.com"
        isVerified={false}
        onResendSuccess={mockOnResendSuccess}
      />
    )

    const resendButton = screen.getByText('認証メールを再送信')

    await act(async () => {
      fireEvent.click(resendButton)
    })

    await waitFor(() => {
      expect(
        screen.getByText('認証メールを再送信しました。メールボックスをご確認ください。')
      ).toBeInTheDocument()
      expect(mockOnResendSuccess).toHaveBeenCalled()
    })

    expect(mockAuthClient.sendVerificationEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
      callbackURL: '/dashboard',
    })
  })

  it('should handle email resend error', async () => {
    mockAuthClient.sendVerificationEmail.mockResolvedValue({
      data: null,
      error: { message: 'Failed to send email' },
    })

    render(<EmailVerificationStatus email="test@example.com" isVerified={false} />)

    const resendButton = screen.getByText('認証メールを再送信')

    await act(async () => {
      fireEvent.click(resendButton)
    })

    await waitFor(() => {
      expect(screen.getByText('再送信に失敗しました: Failed to send email')).toBeInTheDocument()
    })
  })

  it('should disable resend button during submission', async () => {
    mockAuthClient.sendVerificationEmail.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { success: true }, error: null }), 100)
        )
    )

    render(<EmailVerificationStatus email="test@example.com" isVerified={false} />)

    const resendButton = screen.getByText('認証メールを再送信')

    await act(async () => {
      fireEvent.click(resendButton)
      // Wait a tick for state update
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByText('再送信中...')).toBeInTheDocument()
    expect(resendButton).toBeDisabled()
  })
})
