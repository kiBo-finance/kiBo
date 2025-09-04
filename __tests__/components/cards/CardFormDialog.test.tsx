import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CardFormDialog } from '@/components/cards/CardFormDialog'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockAccounts = [
  {
    id: 'account-1',
    name: 'メイン普通預金',
    type: 'CHECKING',
    currency: 'JPY',
    balance: '500000'
  },
  {
    id: 'account-2',
    name: '貯蓄預金',
    type: 'SAVINGS',
    currency: 'JPY',
    balance: '1000000'
  }
]

describe('CardFormDialog', () => {
  const mockOnSuccess = jest.fn()
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockAccounts })
    } as Response)
  })

  const renderCardFormDialog = (props = {}) => {
    return render(
      <CardFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        {...props}
      />
    )
  }

  it('should render card form dialog', async () => {
    renderCardFormDialog()

    expect(screen.getByText('新しいカードを追加')).toBeInTheDocument()
    expect(screen.getByLabelText('カード名 *')).toBeInTheDocument()
    expect(screen.getByLabelText('カードタイプ *')).toBeInTheDocument()
    expect(screen.getByLabelText('下4桁 *')).toBeInTheDocument()
  })

  it('should fetch accounts on open', async () => {
    renderCardFormDialog()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/accounts')
    })
  })

  it('should show card type options', async () => {
    renderCardFormDialog()

    const cardTypeSelect = screen.getByText('カードタイプを選択')
    fireEvent.click(cardTypeSelect)

    expect(screen.getByText('クレジットカード')).toBeInTheDocument()
    expect(screen.getByText('デビットカード')).toBeInTheDocument()
    expect(screen.getByText('プリペイドカード')).toBeInTheDocument()
    expect(screen.getByText('ポストペイカード')).toBeInTheDocument()
  })

  describe('Credit Card Form', () => {
    it('should show credit card specific fields', async () => {
      renderCardFormDialog()

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      
      const creditOption = screen.getByText('クレジットカード')
      fireEvent.click(creditOption)

      await waitFor(() => {
        expect(screen.getByLabelText('利用限度額 *')).toBeInTheDocument()
        expect(screen.getByLabelText('締日')).toBeInTheDocument()
        expect(screen.getByLabelText('支払日')).toBeInTheDocument()
      })
    })

    it('should submit credit card creation successfully', async () => {
      const mockCreateResponse = {
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-card' } })
      }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAccounts })
        } as Response)
        .mockResolvedValueOnce(mockCreateResponse as Response)

      renderCardFormDialog()

      const nameInput = screen.getByLabelText('カード名 *')
      fireEvent.change(nameInput, { target: { value: '新しいクレジットカード' } })

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('クレジットカード'))

      const lastFourInput = screen.getByLabelText('下4桁 *')
      fireEvent.change(lastFourInput, { target: { value: '1234' } })

      await waitFor(() => {
        const accountSelect = screen.getByText('関連口座を選択')
        fireEvent.click(accountSelect)
      })

      fireEvent.click(screen.getByText('メイン普通預金'))

      await waitFor(() => {
        const creditLimitInput = screen.getByLabelText('利用限度額 *')
        fireEvent.change(creditLimitInput, { target: { value: '500000' } })
      })

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: '新しいクレジットカード',
            type: 'CREDIT',
            lastFourDigits: '1234',
            accountId: 'account-1',
            creditLimit: 500000,
            billingDate: 27,
            paymentDate: 10
          })
        })
      })

      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should validate credit limit is required', async () => {
      renderCardFormDialog()

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('クレジットカード'))

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      expect(mockFetch).not.toHaveBeenCalledWith('/api/cards', expect.anything())
    })
  })

  describe('Debit Card Form', () => {
    it('should show debit card specific fields', async () => {
      renderCardFormDialog()

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      
      const debitOption = screen.getByText('デビットカード')
      fireEvent.click(debitOption)

      await waitFor(() => {
        expect(screen.getByText('自動振替を有効にする')).toBeInTheDocument()
      })
    })

    it('should show linked account field when auto transfer is enabled', async () => {
      renderCardFormDialog()

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('デビットカード'))

      await waitFor(() => {
        const autoTransferCheckbox = screen.getByRole('checkbox', { name: '自動振替を有効にする' })
        fireEvent.click(autoTransferCheckbox)
      })

      await waitFor(() => {
        expect(screen.getByLabelText('振替元口座 *')).toBeInTheDocument()
        expect(screen.getByLabelText('最低残高')).toBeInTheDocument()
      })
    })

    it('should submit debit card with auto transfer', async () => {
      const mockCreateResponse = {
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-debit-card' } })
      }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAccounts })
        } as Response)
        .mockResolvedValueOnce(mockCreateResponse as Response)

      renderCardFormDialog()

      const nameInput = screen.getByLabelText('カード名 *')
      fireEvent.change(nameInput, { target: { value: '新しいデビットカード' } })

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('デビットカード'))

      const lastFourInput = screen.getByLabelText('下4桁 *')
      fireEvent.change(lastFourInput, { target: { value: '5678' } })

      await waitFor(() => {
        const accountSelect = screen.getByText('関連口座を選択')
        fireEvent.click(accountSelect)
      })

      fireEvent.click(screen.getByText('メイン普通預金'))

      await waitFor(() => {
        const autoTransferCheckbox = screen.getByRole('checkbox', { name: '自動振替を有効にする' })
        fireEvent.click(autoTransferCheckbox)
      })

      await waitFor(() => {
        const linkedAccountSelect = screen.getByText('振替元口座を選択')
        fireEvent.click(linkedAccountSelect)
      })

      fireEvent.click(screen.getByText('貯蓄預金'))

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cards', expect.objectContaining({
          body: expect.stringContaining('"autoTransferEnabled":true')
        }))
      })
    })
  })

  describe('Prepaid Card Form', () => {
    it('should show prepaid card specific fields', async () => {
      renderCardFormDialog()

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      
      const prepaidOption = screen.getByText('プリペイドカード')
      fireEvent.click(prepaidOption)

      await waitFor(() => {
        expect(screen.getByLabelText('初期残高')).toBeInTheDocument()
      })
    })

    it('should submit prepaid card creation', async () => {
      const mockCreateResponse = {
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-prepaid-card' } })
      }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAccounts })
        } as Response)
        .mockResolvedValueOnce(mockCreateResponse as Response)

      renderCardFormDialog()

      const nameInput = screen.getByLabelText('カード名 *')
      fireEvent.change(nameInput, { target: { value: '新しいプリペイドカード' } })

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('プリペイドカード'))

      const lastFourInput = screen.getByLabelText('下4桁 *')
      fireEvent.change(lastFourInput, { target: { value: '9012' } })

      await waitFor(() => {
        const accountSelect = screen.getByText('関連口座を選択')
        fireEvent.click(accountSelect)
      })

      fireEvent.click(screen.getByText('メイン普通預金'))

      await waitFor(() => {
        const balanceInput = screen.getByLabelText('初期残高')
        fireEvent.change(balanceInput, { target: { value: '10000' } })
      })

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cards', expect.objectContaining({
          body: expect.stringContaining('"balance":10000')
        }))
      })
    })
  })

  describe('Postpay Card Form', () => {
    it('should show postpay card specific fields', async () => {
      renderCardFormDialog()

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      
      const postpayOption = screen.getByText('ポストペイカード')
      fireEvent.click(postpayOption)

      await waitFor(() => {
        expect(screen.getByLabelText('月間利用限度額 *')).toBeInTheDocument()
        expect(screen.getByLabelText('決済日')).toBeInTheDocument()
      })
    })

    it('should submit postpay card creation', async () => {
      const mockCreateResponse = {
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-postpay-card' } })
      }
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAccounts })
        } as Response)
        .mockResolvedValueOnce(mockCreateResponse as Response)

      renderCardFormDialog()

      const nameInput = screen.getByLabelText('カード名 *')
      fireEvent.change(nameInput, { target: { value: '新しいポストペイカード' } })

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('ポストペイカード'))

      const lastFourInput = screen.getByLabelText('下4桁 *')
      fireEvent.change(lastFourInput, { target: { value: '3456' } })

      await waitFor(() => {
        const accountSelect = screen.getByText('関連口座を選択')
        fireEvent.click(accountSelect)
      })

      fireEvent.click(screen.getByText('メイン普通預金'))

      await waitFor(() => {
        const monthlyLimitInput = screen.getByLabelText('月間利用限度額 *')
        fireEvent.change(monthlyLimitInput, { target: { value: '100000' } })
      })

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cards', expect.objectContaining({
          body: expect.stringContaining('"monthlyLimit":100000')
        }))
      })
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      renderCardFormDialog()

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      expect(mockFetch).not.toHaveBeenCalledWith('/api/cards', expect.anything())
    })

    it('should validate last four digits format', async () => {
      renderCardFormDialog()

      const lastFourInput = screen.getByLabelText('下4桁 *')
      
      fireEvent.change(lastFourInput, { target: { value: '12345' } })
      fireEvent.blur(lastFourInput)
      
      expect(lastFourInput).toHaveAttribute('maxLength', '4')
    })

    it('should handle API error during creation', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      const mockErrorResponse = {
        ok: true,
        json: async () => ({ success: false, error: 'Account not found' })
      }
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAccounts })
        } as Response)
        .mockResolvedValueOnce(mockErrorResponse as Response)

      renderCardFormDialog()

      const nameInput = screen.getByLabelText('カード名 *')
      fireEvent.change(nameInput, { target: { value: 'テストカード' } })

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('クレジットカード'))

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Account not found')
      })

      alertSpy.mockRestore()
    })

    it('should close dialog when cancel is clicked', () => {
      renderCardFormDialog()

      const cancelButton = screen.getByText('キャンセル')
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should show loading state during creation', async () => {
      let resolveCreate: (value: any) => void
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve
      })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAccounts })
        } as Response)
        .mockReturnValueOnce(createPromise as Promise<Response>)

      renderCardFormDialog()

      const nameInput = screen.getByLabelText('カード名 *')
      fireEvent.change(nameInput, { target: { value: 'テストカード' } })

      const cardTypeSelect = screen.getByText('カードタイプを選択')
      fireEvent.click(cardTypeSelect)
      fireEvent.click(screen.getByText('クレジットカード'))

      const createButton = screen.getByText('カードを作成')
      fireEvent.click(createButton)

      expect(screen.getByText('作成中...')).toBeInTheDocument()

      resolveCreate!({
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-card' } })
      })
    })
  })

  it('should not render when dialog is closed', () => {
    renderCardFormDialog({ open: false })

    expect(screen.queryByText('新しいカードを追加')).not.toBeInTheDocument()
  })
})