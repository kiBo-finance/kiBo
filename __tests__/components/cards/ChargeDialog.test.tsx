import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChargeDialog } from '@/components/cards/ChargeDialog'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockCard = {
  id: 'card-123',
  name: 'Test Prepaid Card',
  type: 'PREPAID',
  lastFourDigits: '1234',
  balance: '5000',
  accountId: 'account-1',
  account: {
    id: 'account-1',
    name: 'Prepaid Account',
    currency: 'JPY'
  }
}

const mockAccounts = [
  {
    id: 'account-2',
    name: 'Main Account',
    currency: 'JPY',
    balance: '100000'
  },
  {
    id: 'account-3',
    name: 'Savings Account',
    currency: 'JPY',
    balance: '50000'
  }
]

describe('ChargeDialog', () => {
  const mockOnSuccess = jest.fn()
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockAccounts })
    } as Response)
  })

  const renderChargeDialog = (props = {}) => {
    return render(
      <ChargeDialog
        card={mockCard}
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        {...props}
      />
    )
  }

  it('should render charge dialog with card information', async () => {
    renderChargeDialog()

    expect(screen.getByText('プリペイドカードチャージ')).toBeInTheDocument()
    expect(screen.getByText('Test Prepaid Card')).toBeInTheDocument()
    expect(screen.getByText('•••• •••• •••• 1234')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('現在残高: ¥5,000')).toBeInTheDocument()
    })
  })

  it('should fetch accounts when dialog opens', async () => {
    renderChargeDialog()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/accounts')
    })
  })

  it('should filter out card account from available accounts', async () => {
    renderChargeDialog()

    await waitFor(() => {
      expect(screen.getByText('Main Account')).toBeInTheDocument()
      expect(screen.getByText('Savings Account')).toBeInTheDocument()
    })

    expect(screen.queryByText('Prepaid Account')).not.toBeInTheDocument()
  })

  it('should show account balances in dropdown', async () => {
    renderChargeDialog()

    const selectTrigger = screen.getByText('口座を選択')
    fireEvent.click(selectTrigger)

    await waitFor(() => {
      expect(screen.getByText('¥100,000')).toBeInTheDocument()
      expect(screen.getByText('¥50,000')).toBeInTheDocument()
    })
  })

  it('should calculate new balance when amount is entered', async () => {
    renderChargeDialog()

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '2000' } })

    await waitFor(() => {
      expect(screen.getByText('チャージ後残高')).toBeInTheDocument()
      expect(screen.getByText('¥7,000')).toBeInTheDocument()
    })
  })

  it('should show error when charge amount exceeds account balance', async () => {
    renderChargeDialog()

    await waitFor(() => {
      const selectTrigger = screen.getByText('口座を選択')
      fireEvent.click(selectTrigger)
    })

    await waitFor(() => {
      const mainAccount = screen.getByText('Main Account')
      fireEvent.click(mainAccount)
    })

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '200000' } })

    await waitFor(() => {
      expect(screen.getByText('チャージ金額が口座残高を超えています')).toBeInTheDocument()
    })
  })

  it('should disable charge button when amount exceeds balance', async () => {
    renderChargeDialog()

    await waitFor(() => {
      const selectTrigger = screen.getByText('口座を選択')
      fireEvent.click(selectTrigger)
    })

    await waitFor(() => {
      const mainAccount = screen.getByText('Main Account')
      fireEvent.click(mainAccount)
    })

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '200000' } })

    const chargeButton = screen.getByText('チャージ実行')
    expect(chargeButton).toBeDisabled()
  })

  it('should submit charge request successfully', async () => {
    const mockChargeResponse = {
      ok: true,
      json: async () => ({ success: true })
    }
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAccounts })
      } as Response)
      .mockResolvedValueOnce(mockChargeResponse as Response)

    renderChargeDialog()

    await waitFor(() => {
      const selectTrigger = screen.getByText('口座を選択')
      fireEvent.click(selectTrigger)
    })

    await waitFor(() => {
      const mainAccount = screen.getByText('Main Account')
      fireEvent.click(mainAccount)
    })

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '2000' } })

    const chargeButton = screen.getByText('チャージ実行')
    fireEvent.click(chargeButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/card-123/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 2000,
          fromAccountId: 'account-2'
        })
      })
    })

    expect(mockOnSuccess).toHaveBeenCalled()
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should handle charge error', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    const mockErrorResponse = {
      ok: true,
      json: async () => ({ success: false, error: 'Insufficient balance' })
    }
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAccounts })
      } as Response)
      .mockResolvedValueOnce(mockErrorResponse as Response)

    renderChargeDialog()

    await waitFor(() => {
      const selectTrigger = screen.getByText('口座を選択')
      fireEvent.click(selectTrigger)
    })

    await waitFor(() => {
      const mainAccount = screen.getByText('Main Account')
      fireEvent.click(mainAccount)
    })

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '2000' } })

    const chargeButton = screen.getByText('チャージ実行')
    fireEvent.click(chargeButton)

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Insufficient balance')
    })

    alertSpy.mockRestore()
  })

  it('should close dialog when cancel button is clicked', () => {
    renderChargeDialog()

    const cancelButton = screen.getByText('キャンセル')
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should not render when dialog is closed', () => {
    renderChargeDialog({ open: false })

    expect(screen.queryByText('プリペイドカードチャージ')).not.toBeInTheDocument()
  })

  it('should show loading state during charge', async () => {
    let resolveCharge: (value: any) => void
    const chargePromise = new Promise(resolve => {
      resolveCharge = resolve
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAccounts })
      } as Response)
      .mockReturnValueOnce(chargePromise as Promise<Response>)

    renderChargeDialog()

    await waitFor(() => {
      const selectTrigger = screen.getByText('口座を選択')
      fireEvent.click(selectTrigger)
    })

    await waitFor(() => {
      const mainAccount = screen.getByText('Main Account')
      fireEvent.click(mainAccount)
    })

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '2000' } })

    const chargeButton = screen.getByText('チャージ実行')
    fireEvent.click(chargeButton)

    expect(screen.getByText('チャージ中...')).toBeInTheDocument()

    resolveCharge!({
      ok: true,
      json: async () => ({ success: true })
    })
  })
})