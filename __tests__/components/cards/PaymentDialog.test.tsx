import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'
import '@testing-library/jest-dom'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock card interface for testing payment dialog
interface MockCardForPayment {
  id: string
  name: string
  type: 'CREDIT' | 'DEBIT' | 'PREPAID' | 'POSTPAY'
  lastFourDigits: string
  creditLimit?: string
  monthlyUsage?: string
  balance?: string
  autoTransferEnabled?: boolean
  monthlyLimit?: string
  account: {
    currency: string
  }
}

// Mock category interface for testing
interface MockCategory {
  id: string
  name: string
  type: string
}

const mockCategories: MockCategory[] = [
  { id: 'cat-1', name: '食費', type: 'EXPENSE' },
  { id: 'cat-2', name: '交通費', type: 'EXPENSE' },
  { id: 'cat-3', name: 'エンタメ', type: 'EXPENSE' },
]

import { PaymentDialog } from '~/components/cards/PaymentDialog'

// Mock fetch for API calls
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({ success: true, data: mockCategories }),
} as Response))
global.fetch = mockFetch as unknown as typeof fetch

describe('PaymentDialog', () => {
  const mockOnSuccess = mock(() => {})
  const mockOnOpenChange = mock(() => {})

  beforeEach(() => {
    cleanup() // Clean up DOM between tests
    mockOnSuccess.mockReset()
    mockOnOpenChange.mockReset()
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: mockCategories }),
    } as Response))
  })

  interface PaymentDialogTestProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
  }

  const renderPaymentDialog = (card: MockCardForPayment, props: PaymentDialogTestProps = {}) => {
    return render(
      <PaymentDialog
        card={card}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        {...props}
      />
    )
  }

  describe('Credit Card Payment', () => {
    const creditCard: MockCardForPayment = {
      id: 'card-123',
      name: 'Test Credit Card',
      type: 'CREDIT',
      lastFourDigits: '1234',
      creditLimit: '100000',
      monthlyUsage: '15000',
      account: { currency: 'JPY' },
    }

    it('should render payment dialog for credit card', async () => {
      renderPaymentDialog(creditCard)

      expect(screen.getByText('カード支払い')).toBeInTheDocument()
      expect(screen.getByText('Test Credit Card')).toBeInTheDocument()
      expect(screen.getByText('•••• •••• •••• 1234')).toBeInTheDocument()

      await waitFor(() => {
        // Note: Intl.NumberFormat may use narrow yen sign ￥ instead of ¥
        expect(screen.getByText(/利用可能額:.*85,000/)).toBeInTheDocument()
      })
    })

    it('should calculate available credit correctly when fully used', async () => {
      const cardWithFullUsage: MockCardForPayment = {
        ...creditCard,
        monthlyUsage: '100000',
      }

      renderPaymentDialog(cardWithFullUsage)

      await waitFor(() => {
        expect(screen.getByText(/利用可能額:.*0/)).toBeInTheDocument()
      })
    })
  })

  describe('Debit Card Payment', () => {
    const debitCard: MockCardForPayment = {
      id: 'card-456',
      name: 'Test Debit Card',
      type: 'DEBIT',
      lastFourDigits: '5678',
      balance: '25000',
      autoTransferEnabled: true,
      account: { currency: 'JPY' },
    }

    it('should show available balance for debit card', async () => {
      renderPaymentDialog(debitCard)

      await waitFor(() => {
        expect(screen.getByText(/利用可能額:.*25,000/)).toBeInTheDocument()
      })
    })

    it('should show auto transfer notice for debit card', async () => {
      renderPaymentDialog(debitCard)

      await waitFor(() => {
        expect(screen.getByText('自動振替が有効です')).toBeInTheDocument()
        expect(
          screen.getByText('残高不足の場合、紐付け口座から自動的に振替されます')
        ).toBeInTheDocument()
      })
    })

    it('should not show auto transfer notice when disabled', async () => {
      const cardWithoutAutoTransfer: MockCardForPayment = {
        ...debitCard,
        autoTransferEnabled: false,
      }

      renderPaymentDialog(cardWithoutAutoTransfer)

      await waitFor(() => {
        expect(screen.queryByText('自動振替が有効です')).not.toBeInTheDocument()
      })
    })
  })

  describe('Prepaid Card Payment', () => {
    const prepaidCard: MockCardForPayment = {
      id: 'card-789',
      name: 'Test Prepaid Card',
      type: 'PREPAID',
      lastFourDigits: '9012',
      balance: '5000',
      account: { currency: 'JPY' },
    }

    it('should show balance for prepaid card', async () => {
      renderPaymentDialog(prepaidCard)

      await waitFor(() => {
        expect(screen.getByText(/利用可能額:.*5,000/)).toBeInTheDocument()
      })
    })
  })

  describe('Postpay Card Payment', () => {
    const postpayCard: MockCardForPayment = {
      id: 'card-101',
      name: 'Test Postpay Card',
      type: 'POSTPAY',
      lastFourDigits: '3456',
      monthlyLimit: '50000',
      monthlyUsage: '10000',
      account: { currency: 'JPY' },
    }

    it('should show available postpay limit', async () => {
      renderPaymentDialog(postpayCard)

      await waitFor(() => {
        expect(screen.getByText(/利用可能額:.*40,000/)).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    const testCard: MockCardForPayment = {
      id: 'card-123',
      name: 'Test Card',
      type: 'CREDIT',
      lastFourDigits: '1234',
      creditLimit: '100000',
      monthlyUsage: '0',
      account: { currency: 'JPY' },
    }

    it('should fetch categories on open', async () => {
      renderPaymentDialog(testCard)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/categories?type=EXPENSE')
      })
    })

    it('should render category select', async () => {
      renderPaymentDialog(testCard)

      expect(screen.getByText('カテゴリを選択')).toBeInTheDocument()
    })

    it('should format currency display when amount is entered', async () => {
      renderPaymentDialog(testCard)

      const amountInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(amountInput, { target: { value: '1500' } })

      await waitFor(() => {
        expect(screen.getByText(/1,500/)).toBeInTheDocument()
      })
    })

    it('should disable submit button when required fields are empty', () => {
      renderPaymentDialog(testCard)

      const submitButton = screen.getByText('支払い実行')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when amount and description are filled', async () => {
      renderPaymentDialog(testCard)

      const amountInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(amountInput, { target: { value: '1000' } })

      const descriptionInput = screen.getByPlaceholderText('例：コンビニで買い物')
      fireEvent.change(descriptionInput, { target: { value: 'テスト' } })

      await waitFor(() => {
        const submitButton = screen.getByText('支払い実行')
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should close dialog when cancel is clicked', () => {
      renderPaymentDialog(testCard)

      const cancelButton = screen.getByText('キャンセル')
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should show cancel button', () => {
      renderPaymentDialog(testCard)

      expect(screen.getByText('キャンセル')).toBeInTheDocument()
    })

    it('should not render when dialog is closed', () => {
      renderPaymentDialog(testCard, { open: false })

      expect(screen.queryByText('カード支払い')).not.toBeInTheDocument()
    })

    it('should show label for payment amount', () => {
      renderPaymentDialog(testCard)

      // Check for label text - "金額" with possible asterisk
      expect(screen.getByText(/金額/)).toBeInTheDocument()
    })

    it('should show label for description', () => {
      renderPaymentDialog(testCard)

      // Check for label text (may or may not have asterisk)
      expect(screen.getByText(/説明/)).toBeInTheDocument()
    })

    it('should show label for category', () => {
      renderPaymentDialog(testCard)

      // There may be multiple elements with this text (label + select placeholder)
      expect(screen.getAllByText(/カテゴリ/).length).toBeGreaterThanOrEqual(1)
    })
  })
})
