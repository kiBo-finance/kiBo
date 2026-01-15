import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { cleanup } from '@testing-library/react'

// Define mock functions
const mockSendVerificationEmail = mock(() => Promise.resolve({ data: { success: true }, error: null }))

// Mock the auth-client module before importing the component
mock.module('~/lib/auth-client', () => ({
  authClient: {
    sendVerificationEmail: mockSendVerificationEmail,
  },
}))

import { EmailVerificationStatus } from '~/components/auth/EmailVerificationStatus'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

describe('EmailVerificationStatus', () => {
  beforeEach(() => {
    cleanup() // Clean up DOM between tests
    mockSendVerificationEmail.mockReset()
    mockSendVerificationEmail.mockImplementation(() => Promise.resolve({ data: { success: true }, error: null }))
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
    const mockOnResendSuccess = mock(() => {})

    mockSendVerificationEmail.mockImplementation(() =>
      Promise.resolve({
        data: { success: true },
        error: null,
      })
    )

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

    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
      callbackURL: '/dashboard',
    })
  })

  it('should handle email resend error', async () => {
    mockSendVerificationEmail.mockImplementation(() =>
      Promise.resolve({
        data: null,
        error: { message: 'Failed to send email' },
      })
    )

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
    mockSendVerificationEmail.mockImplementation(
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
