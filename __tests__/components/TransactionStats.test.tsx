import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test'
import '@testing-library/jest-dom'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

const mockStatsData = {
  summary: {
    totalIncome: '500000',
    totalExpense: '300000',
    netIncome: '200000',
    transactionCount: 25,
    period: {
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-31T23:59:59.999Z',
      days: 31,
    },
  },
  breakdown: {
    byCategory: [
      {
        categoryId: 'cat-1',
        category: { name: '食費' },
        type: 'EXPENSE',
        amount: '80000',
        count: 12,
      },
      {
        categoryId: 'cat-2',
        category: { name: '交通費' },
        type: 'EXPENSE',
        amount: '25000',
        count: 8,
      },
      {
        categoryId: 'cat-3',
        category: { name: '給与' },
        type: 'INCOME',
        amount: '500000',
        count: 1,
      },
    ],
    byAccount: [
      {
        accountId: 'acc-1',
        account: { name: 'メイン口座' },
        amount: '150000',
        count: 15,
      },
      {
        accountId: 'acc-2',
        account: { name: '貯金口座' },
        amount: '50000',
        count: 5,
      },
    ],
    topExpenseCategories: [
      {
        categoryId: 'cat-1',
        category: { name: '食費' },
        amount: '80000',
      },
      {
        categoryId: 'cat-2',
        category: { name: '交通費' },
        amount: '25000',
      },
    ],
  },
  trends: {
    daily: [
      {
        date: '2024-01-01',
        type: 'EXPENSE',
        amount: '5000',
        count: 2,
      },
      {
        date: '2024-01-01',
        type: 'INCOME',
        amount: '500000',
        count: 1,
      },
    ],
  },
}

import { TransactionStats } from '~/components/transactions/TransactionStats'

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: async () => ({ data: mockStatsData }),
} as Response))
global.fetch = mockFetch as unknown as typeof fetch

describe('TransactionStats', () => {
  beforeEach(() => {
    cleanup() // Clean up DOM between tests
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ data: mockStatsData }),
    } as Response))
  })

  it('should display loading state initially', () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )

    render(<TransactionStats />)

    expect(screen.getByText('統計データを読み込んでいます...')).toBeInTheDocument()
  })

  it('should display stats data after successful fetch', async () => {
    render(<TransactionStats />)

    await waitFor(() => {
      // Check for income - may use different yen sign
      expect(screen.getByText(/500,000/)).toBeInTheDocument()
    })
  })

  it('should display expense categories section', async () => {
    render(<TransactionStats />)

    await waitFor(() => {
      // Check for category section header
      expect(screen.getByText(/支出カテゴリ別/)).toBeInTheDocument()
    })
  })

  it('should display period tabs', async () => {
    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('週間')).toBeInTheDocument()
      expect(screen.getByText('月間')).toBeInTheDocument()
      expect(screen.getByText('年間')).toBeInTheDocument()
    })
  })

  it('should call fetch with stats API', async () => {
    render(<TransactionStats />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Check that fetch was called with a stats URL
    const calls = mockFetch.mock.calls as unknown[][]
    expect(String(calls[0][0])).toContain('/api/transactions/stats')
  })

  it('should display no data message when stats is null', async () => {
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: false,
      status: 500,
    } as Response))

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('統計データがありません')).toBeInTheDocument()
    })
  })

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')))

    // Mock console.error to avoid test output noise
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('統計データがありません')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('should display account breakdown', async () => {
    render(<TransactionStats />)

    await waitFor(() => {
      expect(screen.getByText('メイン口座')).toBeInTheDocument()
      expect(screen.getByText('貯金口座')).toBeInTheDocument()
    })
  })

  it('should render summary cards', async () => {
    render(<TransactionStats />)

    await waitFor(() => {
      // Check that summary cards are rendered
      expect(screen.getByText('総収入')).toBeInTheDocument()
      expect(screen.getByText('総支出')).toBeInTheDocument()
    })
  })

  it('should render with valid stats data', async () => {
    render(<TransactionStats />)

    await waitFor(() => {
      // After loading, stats should be visible (not loading message)
      expect(screen.queryByText('統計データを読み込んでいます...')).not.toBeInTheDocument()
    })
  })
})
