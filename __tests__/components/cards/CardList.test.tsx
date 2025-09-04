import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CardList } from '@/components/cards/CardList'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockCards = [
  {
    id: 'card-1',
    name: 'メインクレジットカード',
    type: 'CREDIT',
    lastFourDigits: '1234',
    isActive: true,
    creditLimit: '500000',
    monthlyUsage: '75000',
    account: {
      id: 'account-1',
      name: 'メイン口座',
      currency: 'JPY'
    },
    _count: {
      transactions: 25
    }
  },
  {
    id: 'card-2',
    name: 'デビットカード',
    type: 'DEBIT',
    lastFourDigits: '5678',
    isActive: true,
    balance: '120000',
    autoTransferEnabled: true,
    linkedAccountId: 'account-2',
    account: {
      id: 'account-1',
      name: 'メイン口座',
      currency: 'JPY'
    },
    _count: {
      transactions: 18
    }
  },
  {
    id: 'card-3',
    name: 'プリペイドカード',
    type: 'PREPAID',
    lastFourDigits: '9012',
    isActive: true,
    balance: '15000',
    account: {
      id: 'account-3',
      name: 'プリペイド口座',
      currency: 'JPY'
    },
    _count: {
      transactions: 8
    }
  }
]

describe('CardList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockCards })
    } as Response)
  })

  it('should render loading state initially', () => {
    render(<CardList />)
    expect(screen.getByText('カードを読み込み中...')).toBeInTheDocument()
  })

  it('should fetch and display cards', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cards')
    })

    await waitFor(() => {
      expect(screen.getByText('メインクレジットカード')).toBeInTheDocument()
      expect(screen.getByText('デビットカード')).toBeInTheDocument()
      expect(screen.getByText('プリペイドカード')).toBeInTheDocument()
    })
  })

  it('should display card numbers with masking', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('•••• •••• •••• 1234')).toBeInTheDocument()
      expect(screen.getByText('•••• •••• •••• 5678')).toBeInTheDocument()
      expect(screen.getByText('•••• •••• •••• 9012')).toBeInTheDocument()
    })
  })

  it('should show appropriate card type badges', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('クレジット')).toBeInTheDocument()
      expect(screen.getByText('デビット')).toBeInTheDocument()
      expect(screen.getByText('プリペイド')).toBeInTheDocument()
    })
  })

  it('should display account information', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getAllByText('メイン口座')).toHaveLength(2)
      expect(screen.getByText('プリペイド口座')).toBeInTheDocument()
    })
  })

  it('should show transaction counts', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('25件の取引')).toBeInTheDocument()
      expect(screen.getByText('18件の取引')).toBeInTheDocument()
      expect(screen.getByText('8件の取引')).toBeInTheDocument()
    })
  })

  it('should show credit card specific information', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('利用可能額')).toBeInTheDocument()
      expect(screen.getByText('¥425,000')).toBeInTheDocument()
    })
  })

  it('should show debit card balance', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('残高: ¥120,000')).toBeInTheDocument()
    })
  })

  it('should show auto transfer status for debit cards', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('自動振替: 有効')).toBeInTheDocument()
    })
  })

  it('should show prepaid card balance', async () => {
    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('残高: ¥15,000')).toBeInTheDocument()
    })
  })

  it('should open card detail dialog when card is clicked', async () => {
    render(<CardList />)

    await waitFor(() => {
      const creditCard = screen.getByText('メインクレジットカード')
      fireEvent.click(creditCard.closest('div[role="button"]')!)
    })

    expect(screen.getByText('カード詳細')).toBeInTheDocument()
  })

  it('should open card form dialog when add button is clicked', async () => {
    render(<CardList />)

    await waitFor(() => {
      const addButton = screen.getByText('新しいカードを追加')
      fireEvent.click(addButton)
    })

    expect(screen.getByText('新しいカードを追加')).toBeInTheDocument()
  })

  it('should refresh cards after successful card creation', async () => {
    const successCallbackSpy = jest.fn()
    render(<CardList />)

    await waitFor(() => {
      const addButton = screen.getByText('新しいカードを追加')
      fireEvent.click(addButton)
    })

    const cardFormDialog = screen.getByText('新しいカードを追加').closest('[role="dialog"]')
    expect(cardFormDialog).toBeInTheDocument()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [...mockCards] })
    } as Response)
  })

  it('should handle empty cards list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] })
    } as Response)

    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('カードが登録されていません')).toBeInTheDocument()
      expect(screen.getByText('最初のカードを追加しましょう')).toBeInTheDocument()
    })
  })

  it('should handle API error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('カードの読み込みに失敗しました')).toBeInTheDocument()
      expect(screen.getByText('再読み込み')).toBeInTheDocument()
    })
  })

  it('should retry loading when retry button is clicked', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCards })
      } as Response)

    render(<CardList />)

    await waitFor(() => {
      expect(screen.getByText('カードの読み込みに失敗しました')).toBeInTheDocument()
    })

    const retryButton = screen.getByText('再読み込み')
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('メインクレジットカード')).toBeInTheDocument()
    })
  })

  it('should show inactive cards when toggle is enabled', async () => {
    const cardsWithInactive = [
      ...mockCards,
      {
        id: 'card-4',
        name: '無効なカード',
        type: 'CREDIT',
        lastFourDigits: '3456',
        isActive: false,
        account: {
          id: 'account-1',
          name: 'メイン口座',
          currency: 'JPY'
        },
        _count: {
          transactions: 0
        }
      }
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCards })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: cardsWithInactive })
      } as Response)

    render(<CardList />)

    await waitFor(() => {
      const toggleLabel = screen.getByText('無効なカードも表示')
      fireEvent.click(toggleLabel)
    })

    await waitFor(() => {
      expect(screen.getByText('無効なカード')).toBeInTheDocument()
    })
  })

  it('should show payment dialog when payment button is clicked', async () => {
    render(<CardList />)

    await waitFor(() => {
      const paymentButtons = screen.getAllByText('支払い')
      fireEvent.click(paymentButtons[0])
    })

    expect(screen.getByText('カード支払い')).toBeInTheDocument()
  })

  it('should show charge dialog for prepaid cards', async () => {
    render(<CardList />)

    await waitFor(() => {
      const chargeButton = screen.getByText('チャージ')
      fireEvent.click(chargeButton)
    })

    expect(screen.getByText('プリペイドカードチャージ')).toBeInTheDocument()
  })

  it('should refresh data after successful payment', async () => {
    render(<CardList />)

    await waitFor(() => {
      const paymentButtons = screen.getAllByText('支払い')
      fireEvent.click(paymentButtons[0])
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockCards })
    } as Response)
  })

  it('should refresh data after successful charge', async () => {
    render(<CardList />)

    await waitFor(() => {
      const chargeButton = screen.getByText('チャージ')
      fireEvent.click(chargeButton)
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockCards })
    } as Response)
  })
})