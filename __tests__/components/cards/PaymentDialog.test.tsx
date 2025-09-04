import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PaymentDialog } from '@/components/cards/PaymentDialog'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockCategories = [
  { id: 'cat-1', name: '食費', type: 'EXPENSE' },
  { id: 'cat-2', name: '交通費', type: 'EXPENSE' },
  { id: 'cat-3', name: 'エンタメ', type: 'EXPENSE' }
]

describe('PaymentDialog', () => {
  const mockOnSuccess = jest.fn()
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockCategories })
    } as Response)
  })

  const renderPaymentDialog = (card: any, props = {}) => {
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
    const creditCard = {
      id: 'card-123',
      name: 'Test Credit Card',
      type: 'CREDIT',
      lastFourDigits: '1234',
      creditLimit: '100000',
      monthlyUsage: '15000',
      account: { currency: 'JPY' }
    }

    it('should render payment dialog for credit card', async () => {
      renderPaymentDialog(creditCard)

      expect(screen.getByText('カード支払い')).toBeInTheDocument()
      expect(screen.getByText('Test Credit Card')).toBeInTheDocument()
      expect(screen.getByText('•••• •••• •••• 1234')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('利用可能額: ¥85,000')).toBeInTheDocument()
      })
    })

    it('should calculate available credit correctly', async () => {
      const cardWithFullUsage = {
        ...creditCard,
        monthlyUsage: '100000'
      }
      
      renderPaymentDialog(cardWithFullUsage)

      await waitFor(() => {
        expect(screen.getByText('利用可能額: ¥0')).toBeInTheDocument()
      })
    })

    it('should set max amount to available credit', async () => {
      renderPaymentDialog(creditCard)

      const amountInput = screen.getByPlaceholderText('0.00')
      expect(amountInput).toHaveAttribute('max', '85000')
    })
  })

  describe('Debit Card Payment', () => {
    const debitCard = {
      id: 'card-456',
      name: 'Test Debit Card',
      type: 'DEBIT',
      lastFourDigits: '5678',
      balance: '25000',
      autoTransferEnabled: true,
      account: { currency: 'JPY' }
    }

    it('should show available balance for debit card', async () => {
      renderPaymentDialog(debitCard)

      await waitFor(() => {
        expect(screen.getByText('利用可能額: ¥25,000')).toBeInTheDocument()
      })
    })

    it('should show auto transfer notice for debit card', async () => {
      renderPaymentDialog(debitCard)

      await waitFor(() => {
        expect(screen.getByText('自動振替が有効です')).toBeInTheDocument()
        expect(screen.getByText('残高不足の場合、紐付け口座から自動的に振替されます')).toBeInTheDocument()
      })
    })

    it('should not show auto transfer notice when disabled', async () => {
      const cardWithoutAutoTransfer = {
        ...debitCard,
        autoTransferEnabled: false
      }
      
      renderPaymentDialog(cardWithoutAutoTransfer)

      await waitFor(() => {
        expect(screen.queryByText('自動振替が有効です')).not.toBeInTheDocument()
      })
    })
  })

  describe('Prepaid Card Payment', () => {
    const prepaidCard = {
      id: 'card-789',
      name: 'Test Prepaid Card',
      type: 'PREPAID',
      lastFourDigits: '9012',
      balance: '5000',
      account: { currency: 'JPY' }
    }

    it('should show balance for prepaid card', async () => {
      renderPaymentDialog(prepaidCard)

      await waitFor(() => {
        expect(screen.getByText('利用可能額: ¥5,000')).toBeInTheDocument()
      })
    })
  })

  describe('Postpay Card Payment', () => {
    const postpayCard = {
      id: 'card-101',
      name: 'Test Postpay Card',
      type: 'POSTPAY',
      lastFourDigits: '3456',
      monthlyLimit: '50000',
      monthlyUsage: '10000',
      account: { currency: 'JPY' }
    }

    it('should show available postpay limit', async () => {
      renderPaymentDialog(postpayCard)

      await waitFor(() => {
        expect(screen.getByText('利用可能額: ¥40,000')).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    const testCard = {
      id: 'card-123',
      name: 'Test Card',
      type: 'CREDIT',
      lastFourDigits: '1234',
      creditLimit: '100000',
      monthlyUsage: '0',
      account: { currency: 'JPY' }
    }

    it('should fetch categories on open', async () => {
      renderPaymentDialog(testCard)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/categories?type=EXPENSE')
      })
    })

    it('should populate category dropdown', async () => {
      renderPaymentDialog(testCard)

      const selectTrigger = screen.getByText('カテゴリを選択')
      fireEvent.click(selectTrigger)

      await waitFor(() => {
        expect(screen.getByText('食費')).toBeInTheDocument()
        expect(screen.getByText('交通費')).toBeInTheDocument()
        expect(screen.getByText('エンタメ')).toBeInTheDocument()
      })
    })

    it('should format currency display', async () => {
      renderPaymentDialog(testCard)

      const amountInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(amountInput, { target: { value: '1500' } })

      await waitFor(() => {
        expect(screen.getByText('¥1,500')).toBeInTheDocument()
      })
    })

    it('should submit payment successfully', async () => {
      const mockPaymentResponse = {
        ok: true,
        json: async () => ({ success: true })
      }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockCategories })
        } as Response)
        .mockResolvedValueOnce(mockPaymentResponse as Response)

      renderPaymentDialog(testCard)

      const amountInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(amountInput, { target: { value: '1500' } })

      const descriptionInput = screen.getByPlaceholderText('例：コンビニで買い物')
      fireEvent.change(descriptionInput, { target: { value: 'コンビニで昼食' } })

      await waitFor(() => {
        const selectTrigger = screen.getByText('カテゴリを選択')
        fireEvent.click(selectTrigger)
      })

      await waitFor(() => {
        const foodCategory = screen.getByText('食費')
        fireEvent.click(foodCategory)
      })

      const submitButton = screen.getByText('支払い実行')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cards/card-123/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: 1500,
            currency: 'JPY',
            description: 'コンビニで昼食',
            categoryId: 'cat-1'
          })
        })
      })

      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should handle payment error', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      const mockErrorResponse = {
        ok: true,
        json: async () => ({ success: false, error: 'Insufficient balance' })
      }
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockCategories })
        } as Response)
        .mockResolvedValueOnce(mockErrorResponse as Response)

      renderPaymentDialog(testCard)

      const amountInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(amountInput, { target: { value: '1500' } })

      const descriptionInput = screen.getByPlaceholderText('例：コンビニで買い物')
      fireEvent.change(descriptionInput, { target: { value: 'テスト支払い' } })

      const submitButton = screen.getByText('支払い実行')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Insufficient balance')
      })

      alertSpy.mockRestore()
    })

    it('should disable submit button when required fields are empty', () => {
      renderPaymentDialog(testCard)

      const submitButton = screen.getByText('支払い実行')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when required fields are filled', async () => {
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

    it('should show loading state during payment', async () => {
      let resolvePayment: (value: any) => void
      const paymentPromise = new Promise(resolve => {
        resolvePayment = resolve
      })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockCategories })
        } as Response)
        .mockReturnValueOnce(paymentPromise as Promise<Response>)

      renderPaymentDialog(testCard)

      const amountInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(amountInput, { target: { value: '1000' } })

      const descriptionInput = screen.getByPlaceholderText('例：コンビニで買い物')
      fireEvent.change(descriptionInput, { target: { value: 'テスト' } })

      const submitButton = screen.getByText('支払い実行')
      fireEvent.click(submitButton)

      expect(screen.getByText('処理中...')).toBeInTheDocument()

      resolvePayment!({
        ok: true,
        json: async () => ({ success: true })
      })
    })

    it('should close dialog when cancel is clicked', () => {
      renderPaymentDialog(testCard)

      const cancelButton = screen.getByText('キャンセル')
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})