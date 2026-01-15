import { describe, it, expect, beforeEach, mock } from 'bun:test'
import '@testing-library/jest-dom'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { CardType } from '@prisma/client'

// Mock card interface for testing charge dialog
interface MockCardForCharge {
  id: string
  name: string
  type: CardType
  lastFourDigits: string
  balance: string
  accountId: string
  account: {
    id: string
    name: string
    currency: string
  }
}

// Mock account interface for testing
interface MockAccount {
  id: string
  name: string
  currency: string
  balance: string
}

const mockCard: MockCardForCharge = {
  id: 'card-123',
  name: 'Test Prepaid Card',
  type: 'PREPAID',
  lastFourDigits: '1234',
  balance: '5000',
  accountId: 'account-1',
  account: {
    id: 'account-1',
    name: 'Prepaid Account',
    currency: 'JPY',
  },
}

const mockAccounts: MockAccount[] = [
  {
    id: 'account-2',
    name: 'Main Account',
    currency: 'JPY',
    balance: '100000',
  },
  {
    id: 'account-3',
    name: 'Savings Account',
    currency: 'JPY',
    balance: '50000',
  },
]

import { ChargeDialog } from '~/components/cards/ChargeDialog'

// Mock fetch for API calls
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({ success: true, data: mockAccounts }),
} as Response))
global.fetch = mockFetch as unknown as typeof fetch

describe('ChargeDialog', () => {
  const mockOnSuccess = mock(() => {})
  const mockOnOpenChange = mock(() => {})

  beforeEach(() => {
    cleanup() // Clean up DOM between tests
    mockOnSuccess.mockReset()
    mockOnOpenChange.mockReset()
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: mockAccounts }),
    } as Response))
  })

  interface ChargeDialogTestProps {
    card?: MockCardForCharge
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
  }

  const renderChargeDialog = (props: ChargeDialogTestProps = {}) => {
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
      // Note: Intl.NumberFormat may use narrow yen sign ￥ instead of ¥
      expect(screen.getByText(/現在残高:.*5,000/)).toBeInTheDocument()
    })
  })

  it('should fetch accounts when dialog opens', async () => {
    renderChargeDialog()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/accounts')
    })
  })

  it('should render select for source account', async () => {
    renderChargeDialog()

    // The select trigger should be visible
    expect(screen.getByText('口座を選択')).toBeInTheDocument()
  })

  it('should calculate new balance when amount is entered', async () => {
    renderChargeDialog()

    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '2000' } })

    await waitFor(() => {
      expect(screen.getByText('チャージ後残高')).toBeInTheDocument()
      // Note: Intl.NumberFormat may use narrow yen sign ￥ instead of ¥
      expect(screen.getByText(/7,000/)).toBeInTheDocument()
    })
  })

  it('should not render when dialog is closed', () => {
    renderChargeDialog({ open: false })

    expect(screen.queryByText('プリペイドカードチャージ')).not.toBeInTheDocument()
  })

  it('should show charge button disabled initially', () => {
    renderChargeDialog()

    const chargeButton = screen.getByText('チャージ実行')
    expect(chargeButton).toBeDisabled()
  })

  it('should show cancel button', () => {
    renderChargeDialog()

    expect(screen.getByText('キャンセル')).toBeInTheDocument()
  })

  it('should call onOpenChange when cancel is clicked', () => {
    renderChargeDialog()

    const cancelButton = screen.getByText('キャンセル')
    fireEvent.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should render amount input field', () => {
    renderChargeDialog()

    const amountInput = screen.getByPlaceholderText('0.00')
    expect(amountInput).toBeInTheDocument()
    expect(amountInput).toHaveAttribute('type', 'number')
  })

  it('should show label for charge amount', () => {
    renderChargeDialog()

    expect(screen.getByText('チャージ金額 *')).toBeInTheDocument()
  })

  it('should show label for source account', () => {
    renderChargeDialog()

    expect(screen.getByText('チャージ元口座 *')).toBeInTheDocument()
  })
})
