import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'jotai'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { 
  transactionFiltersAtom,
  transactionSearchAtom,
  transactionDateRangeAtom 
} from '@/lib/atoms/transactions'

// Mock date-fns locale
jest.mock('date-fns/locale', () => ({
  ja: {}
}))

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'PPP') {
      return '2024年1月1日月曜日'
    }
    return '2024/01/01'
  })
}))

// Create a test wrapper with Jotai provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <Provider>{children}</Provider>
}

describe('TransactionFilters', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render search input and type filter', () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    expect(screen.getByPlaceholderText('取引を検索...')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('詳細フィルター')).toBeInTheDocument()
  })

  it('should update search value when typing', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText('取引を検索...')
    await user.type(searchInput, 'ランチ')

    expect(searchInput).toHaveValue('ランチ')
  })

  it('should update transaction type filter', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const typeSelect = screen.getByRole('combobox')
    await user.click(typeSelect)

    await waitFor(() => {
      expect(screen.getByText('収入')).toBeInTheDocument()
      expect(screen.getByText('支出')).toBeInTheDocument()
      expect(screen.getByText('振替')).toBeInTheDocument()
    })

    await user.click(screen.getByText('支出'))
    expect(typeSelect).toHaveTextContent('支出')
  })

  it('should show/hide advanced filters when button is clicked', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const advancedButton = screen.getByText('詳細フィルター')
    
    // Advanced filters should not be visible initially
    expect(screen.queryByText('開始日')).not.toBeInTheDocument()
    expect(screen.queryByText('終了日')).not.toBeInTheDocument()

    await user.click(advancedButton)

    // Advanced filters should now be visible
    expect(screen.getByText('開始日')).toBeInTheDocument()
    expect(screen.getByText('終了日')).toBeInTheDocument()
    expect(screen.getByText('クイック選択')).toBeInTheDocument()
  })

  it('should show date picker when date button is clicked', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const advancedButton = screen.getByText('詳細フィルター')
    await user.click(advancedButton)

    const startDateButton = screen.getByText('開始日を選択')
    await user.click(startDateButton)

    // Calendar should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('should set quick date ranges correctly', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const advancedButton = screen.getByText('詳細フィルター')
    await user.click(advancedButton)

    const currentMonthButton = screen.getByText('今月')
    await user.click(currentMonthButton)

    // Should show active filter badge
    await waitFor(() => {
      expect(screen.getByText(/フィルター:/)).toBeInTheDocument()
    })
  })

  it('should set last month date range correctly', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const advancedButton = screen.getByText('詳細フィルター')
    await user.click(advancedButton)

    const lastMonthButton = screen.getByText('先月')
    await user.click(lastMonthButton)

    // Should show active filter badge
    await waitFor(() => {
      expect(screen.getByText(/フィルター:/)).toBeInTheDocument()
    })
  })

  it('should set current year date range correctly', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const advancedButton = screen.getByText('詳細フィルター')
    await user.click(advancedButton)

    const currentYearButton = screen.getByText('今年')
    await user.click(currentYearButton)

    // Should show active filter badge
    await waitFor(() => {
      expect(screen.getByText(/フィルター:/)).toBeInTheDocument()
    })
  })

  it('should display active filter badges', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    // Set search filter
    const searchInput = screen.getByPlaceholderText('取引を検索...')
    await user.type(searchInput, 'ランチ')

    // Set type filter
    const typeSelect = screen.getByRole('combobox')
    await user.click(typeSelect)
    await user.click(screen.getByText('支出'))

    // Should show filter badges
    await waitFor(() => {
      expect(screen.getByText(/フィルター:/)).toBeInTheDocument()
      expect(screen.getByText(/検索: ランチ/)).toBeInTheDocument()
      expect(screen.getByText(/種類: 支出/)).toBeInTheDocument()
    })
  })

  it('should remove individual filters via badge close buttons', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    // Set search filter
    const searchInput = screen.getByPlaceholderText('取引を検索...')
    await user.type(searchInput, 'ランチ')

    // Should show search badge
    await waitFor(() => {
      expect(screen.getByText(/検索: ランチ/)).toBeInTheDocument()
    })

    // Click the close button on the search badge
    const searchBadge = screen.getByText(/検索: ランチ/)
    const closeButton = searchBadge.nextElementSibling
    if (closeButton) {
      await user.click(closeButton)
    }

    // Search should be cleared
    await waitFor(() => {
      expect(searchInput).toHaveValue('')
    })
  })

  it('should clear all filters when clear all button is clicked', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    // Set multiple filters
    const searchInput = screen.getByPlaceholderText('取引を検索...')
    await user.type(searchInput, 'ランチ')

    const typeSelect = screen.getByRole('combobox')
    await user.click(typeSelect)
    await user.click(screen.getByText('支出'))

    // Should show filters
    await waitFor(() => {
      expect(screen.getByText(/検索: ランチ/)).toBeInTheDocument()
      expect(screen.getByText(/種類: 支出/)).toBeInTheDocument()
    })

    // Click clear all button
    const clearAllButton = screen.getByText('すべてクリア')
    await user.click(clearAllButton)

    // All filters should be cleared
    await waitFor(() => {
      expect(searchInput).toHaveValue('')
      expect(typeSelect).toHaveTextContent('すべて')
      expect(screen.queryByText(/フィルター:/)).not.toBeInTheDocument()
    })
  })

  it('should display formatted date in filter badges', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const advancedButton = screen.getByText('詳細フィルター')
    await user.click(advancedButton)

    const currentMonthButton = screen.getByText('今月')
    await user.click(currentMonthButton)

    // Should show date filter badges with formatted dates
    await waitFor(() => {
      expect(screen.getByText(/開始:/)).toBeInTheDocument()
      expect(screen.getByText(/終了:/)).toBeInTheDocument()
      expect(screen.getByText(/2024\/01\/01/)).toBeInTheDocument()
    })
  })

  it('should handle all transaction types in filter display', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const typeSelect = screen.getByRole('combobox')

    // Test each transaction type
    const types = [
      { value: '収入', expected: '種類: 収入' },
      { value: '支出', expected: '種類: 支出' },
      { value: '振替', expected: '種類: 振替' }
    ]

    for (const type of types) {
      await user.click(typeSelect)
      await user.click(screen.getByText(type.value))

      await waitFor(() => {
        expect(screen.getByText(type.expected)).toBeInTheDocument()
      })

      // Clear for next iteration
      const clearAllButton = screen.getByText('すべてクリア')
      await user.click(clearAllButton)
    }
  })

  it('should not show filter section when no active filters', () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    expect(screen.queryByText(/フィルター:/)).not.toBeInTheDocument()
    expect(screen.queryByText('すべてクリア')).not.toBeInTheDocument()
  })

  it('should handle date selection from calendar', async () => {
    // This test would require mocking the calendar component behavior
    // For now, we'll test the basic interaction
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    const advancedButton = screen.getByText('詳細フィルター')
    await user.click(advancedButton)

    const startDateButton = screen.getByText('開始日を選択')
    expect(startDateButton).toBeInTheDocument()

    const endDateButton = screen.getByText('終了日を選択')
    expect(endDateButton).toBeInTheDocument()
  })

  it('should maintain filter state across re-renders', async () => {
    const { rerender } = render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    // Set a filter
    const searchInput = screen.getByPlaceholderText('取引を検索...')
    await user.type(searchInput, 'ランチ')

    // Rerender the component
    rerender(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    )

    // Filter should still be there (due to Jotai state persistence)
    expect(screen.getByDisplayValue('ランチ')).toBeInTheDocument()
  })
})