import { describe, it, expect, beforeEach, mock } from 'bun:test'
import '@testing-library/jest-dom'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'

// Define mock functions at top level
const mockRefreshAccounts = mock(() => Promise.resolve())
const mockCreateAccount = mock(() => Promise.resolve())
const mockUpdateAccount = mock(() => Promise.resolve())
const mockDeleteAccount = mock(() => Promise.resolve())
const mockRefreshCards = mock(() => Promise.resolve())
const mockCreateCard = mock(() => Promise.resolve())
const mockUpdateCard = mock(() => Promise.resolve())
const mockDeleteCard = mock(() => Promise.resolve())
const mockOnSuccess = mock(() => {})
const mockOnOpenChange = mock(() => {})

// Mock hooks to prevent import chain issues
mock.module('~/lib/hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      { id: 'account-1', name: 'メイン普通預金', type: 'CHECKING', currency: 'JPY', balance: '500000' },
      { id: 'account-2', name: '貯蓄預金', type: 'SAVINGS', currency: 'JPY', balance: '1000000' },
    ],
    refreshAccounts: mockRefreshAccounts,
    createAccount: mockCreateAccount,
    updateAccount: mockUpdateAccount,
    deleteAccount: mockDeleteAccount,
  }),
}))

mock.module('~/lib/hooks/useCards', () => ({
  useCards: () => ({
    cards: [],
    refreshCards: mockRefreshCards,
    createCard: mockCreateCard,
    updateCard: mockUpdateCard,
    deleteCard: mockDeleteCard,
  }),
}))

import { CardFormDialog } from '~/components/cards/CardFormDialog'

// Create a properly typed mock fetch function
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({ success: true, data: {} }),
} as Response))
global.fetch = mockFetch as unknown as typeof fetch

describe('CardFormDialog', () => {
  beforeEach(() => {
    cleanup() // Clean up DOM between tests
    mockOnSuccess.mockReset()
    mockOnOpenChange.mockReset()
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    } as Response))
  })

  interface CardFormDialogTestProps {
    open?: boolean
    onOpenChange?: () => void
    onSuccess?: () => void
  }

  const renderCardFormDialog = (props: CardFormDialogTestProps = {}) => {
    return render(
      <CardFormDialog
        open={props.open ?? true}
        onOpenChange={props.onOpenChange ?? mockOnOpenChange}
        onSuccess={props.onSuccess ?? mockOnSuccess}
      />
    )
  }

  describe('Basic Rendering', () => {
    it('should render card form dialog with title', async () => {
      renderCardFormDialog()
      expect(screen.getByText('新しいカードを追加')).toBeInTheDocument()
    })

    it('should render card name input', async () => {
      renderCardFormDialog()
      expect(screen.getByLabelText('カード名 *')).toBeInTheDocument()
    })

    it('should render card type select', async () => {
      renderCardFormDialog()
      // Radix UI Select doesn't link label with htmlFor properly in jsdom
      expect(screen.getByText('カード種別 *')).toBeInTheDocument()
    })

    it('should render last four digits input', async () => {
      renderCardFormDialog()
      expect(screen.getByLabelText('下4桁 *')).toBeInTheDocument()
    })

    it('should not render when dialog is closed', () => {
      renderCardFormDialog({ open: false })
      expect(screen.queryByText('新しいカードを追加')).not.toBeInTheDocument()
    })
  })

  describe('Form Input Interactions', () => {
    it('should allow entering card name', async () => {
      renderCardFormDialog()

      const nameInput = screen.getByLabelText('カード名 *')
      fireEvent.change(nameInput, { target: { value: '新しいクレジットカード' } })

      expect(nameInput).toHaveValue('新しいクレジットカード')
    })

    it('should allow entering last four digits', async () => {
      renderCardFormDialog()

      const lastFourInput = screen.getByLabelText('下4桁 *')
      fireEvent.change(lastFourInput, { target: { value: '1234' } })

      expect(lastFourInput).toHaveValue('1234')
    })

    it('should have maxLength=4 on last four digits input', async () => {
      renderCardFormDialog()

      const lastFourInput = screen.getByLabelText('下4桁 *')
      expect(lastFourInput).toHaveAttribute('maxLength', '4')
    })
  })

  describe('Dialog Controls', () => {
    it('should close dialog when cancel is clicked', () => {
      renderCardFormDialog()

      const cancelButton = screen.getByText('キャンセル')
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should have create button', async () => {
      renderCardFormDialog()
      expect(screen.getByText('カードを追加')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should not submit without card name', async () => {
      renderCardFormDialog()

      const createButton = screen.getByText('カードを追加')
      fireEvent.click(createButton)

      // Should not call fetch for card creation without required fields
      expect(mockFetch).not.toHaveBeenCalledWith('/api/cards', expect.anything())
    })
  })
})
