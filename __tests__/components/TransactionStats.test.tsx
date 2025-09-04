import { render, screen, waitFor } from '@testing-library/react'
import { TransactionStats } from '@/components/transactions/TransactionStats'

// Mock fetch globally
global.fetch = jest.fn()

const mockStatsData = {
  summary: {
    totalIncome: '500000',
    totalExpense: '300000',
    netIncome: '200000',
    transactionCount: 25,
    period: {
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-31T23:59:59.999Z',
      days: 31
    }
  },
  breakdown: {
    byCategory: [
      {
        categoryId: 'cat-1',
        category: { name: '食費' },
        type: 'EXPENSE',
        amount: '80000',
        count: 12
      },
      {
        categoryId: 'cat-2',
        category: { name: '交通費' },
        type: 'EXPENSE',
        amount: '25000',
        count: 8
      },
      {
        categoryId: 'cat-3',
        category: { name: '給与' },
        type: 'INCOME',
        amount: '500000',
        count: 1
      }
    ],
    byAccount: [
      {
        accountId: 'acc-1',
        account: { name: 'メイン口座' },
        amount: '150000',
        count: 15
      },
      {
        accountId: 'acc-2',
        account: { name: '貯金口座' },
        amount: '50000',
        count: 5
      }
    ],
    topExpenseCategories: [
      {
        categoryId: 'cat-1',
        category: { name: '食費' },
        amount: '80000'
      },
      {
        categoryId: 'cat-2',
        category: { name: '交通費' },
        amount: '25000'
      }
    ]
  },
  trends: {
    daily: [
      {
        date: '2024-01-01',
        type: 'EXPENSE',
        amount: '5000',
        count: 2
      },
      {
        date: '2024-01-01',
        type: 'INCOME',
        amount: '500000',
        count: 1
      }
    ]
  }
}

describe('TransactionStats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<TransactionStats />)
    
    expect(screen.getByText('統計データを読み込んでいます...')).toBeInTheDocument()
    expect(screen.getByLabelText('loading')).toBeInTheDocument()
  })

  it('should display stats data after successful fetch', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStatsData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('¥500,000')).toBeInTheDocument() // Total income
      expect(screen.getByText('¥300,000')).toBeInTheDocument() // Total expense  
      expect(screen.getByText('+¥200,000')).toBeInTheDocument() // Net income with sign
      expect(screen.getByText('25')).toBeInTheDocument() // Transaction count
      expect(screen.getByText('31日間')).toBeInTheDocument() // Period days
    })
  })

  it('should display proper formatting for negative net income', async () => {
    const negativeNetData = {
      ...mockStatsData,
      summary: {
        ...mockStatsData.summary,
        netIncome: '-100000'
      }
    }

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: negativeNetData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('¥100,000')).toBeInTheDocument() // Net loss without explicit sign
    })
  })

  it('should display expense categories with percentages', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStatsData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('食費')).toBeInTheDocument()
      expect(screen.getByText('12件')).toBeInTheDocument()
      expect(screen.getByText('¥80,000')).toBeInTheDocument()
      expect(screen.getByText('26.7%')).toBeInTheDocument() // 80000/300000 * 100
      
      expect(screen.getByText('交通費')).toBeInTheDocument()
      expect(screen.getByText('8件')).toBeInTheDocument()
      expect(screen.getByText('¥25,000')).toBeInTheDocument()
    })
  })

  it('should display account breakdown', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStatsData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('メイン口座')).toBeInTheDocument()
      expect(screen.getByText('15件の取引')).toBeInTheDocument()
      expect(screen.getByText('¥150,000')).toBeInTheDocument()
      
      expect(screen.getByText('貯金口座')).toBeInTheDocument()
      expect(screen.getByText('5件の取引')).toBeInTheDocument()
      expect(screen.getByText('¥50,000')).toBeInTheDocument()
    })
  })

  it('should display top expense categories with rankings', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStatsData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      // Check for ranking numbers
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      
      // Check that top categories are displayed in order
      const foodExpense = screen.getAllByText('食費')[1] // Second occurrence in top categories
      const transportExpense = screen.getAllByText('交通費')[1] // Second occurrence in top categories
      expect(foodExpense).toBeInTheDocument()
      expect(transportExpense).toBeInTheDocument()
    })
  })

  it('should handle empty data gracefully', async () => {
    const emptyData = {
      summary: {
        totalIncome: '0',
        totalExpense: '0',
        netIncome: '0',
        transactionCount: 0,
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z',
          days: 31
        }
      },
      breakdown: {
        byCategory: [],
        byAccount: [],
        topExpenseCategories: []
      },
      trends: {
        daily: []
      }
    }

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: emptyData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('¥0')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument() // Transaction count
      expect(screen.getAllByText('データがありません')).toHaveLength(3) // Three empty sections
    })
  })

  it('should display no data message when stats is null', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('統計データがありません')).toBeInTheDocument()
    })
  })

  it('should change period when tab is selected', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStatsData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('週間')).toBeInTheDocument()
      expect(screen.getByText('月間')).toBeInTheDocument()
      expect(screen.getByText('年間')).toBeInTheDocument()
    })

    // Initial fetch should be for month
    expect(fetch).toHaveBeenCalledWith('/api/transactions/stats?period=month')

    // Click on week tab
    const weekTab = screen.getByText('週間')
    weekTab.click()

    // Should fetch with week period
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/transactions/stats?period=week')
    })
  })

  it('should handle fetch error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('統計データがありません')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch stats:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('should correctly calculate and display category percentages', async () => {
    const customData = {
      ...mockStatsData,
      summary: {
        ...mockStatsData.summary,
        totalExpense: '100000' // Make calculation easier
      },
      breakdown: {
        ...mockStatsData.breakdown,
        byCategory: [
          {
            categoryId: 'cat-1',
            category: { name: '食費' },
            type: 'EXPENSE',
            amount: '50000', // 50% of total
            count: 10
          },
          {
            categoryId: 'cat-2',
            category: { name: '交通費' },
            type: 'EXPENSE',
            amount: '30000', // 30% of total
            count: 5
          }
        ]
      }
    }

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: customData })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('50.0%')).toBeInTheDocument()
      expect(screen.getByText('30.0%')).toBeInTheDocument()
    })
  })

  it('should handle uncategorized transactions', async () => {
    const dataWithUncategorized = {
      ...mockStatsData,
      breakdown: {
        ...mockStatsData.breakdown,
        byCategory: [
          {
            categoryId: null,
            category: null,
            type: 'EXPENSE',
            amount: '10000',
            count: 3
          }
        ]
      }
    }

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: dataWithUncategorized })
    })

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('未分類')).toBeInTheDocument()
      expect(screen.getByText('3件')).toBeInTheDocument()
    })
  })
})