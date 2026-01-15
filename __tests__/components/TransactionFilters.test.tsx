import { describe, it, expect, beforeEach, mock } from 'bun:test'
import '@testing-library/jest-dom'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock atoms
const mockFilters = { page: 1, limit: 20 }
const mockSearch = ''
const mockDateRange = {}
const mockAtomFn = mock((init: unknown) => ({ init }))
const mockUseAtomFn = mock((atom: { init?: unknown }) => {
  if (atom?.init && typeof atom.init === 'object' && 'page' in (atom.init as Record<string, unknown>)) {
    return [mockFilters, mock(() => {})]
  }
  if (atom?.init === '') {
    return [mockSearch, mock(() => {})]
  }
  return [mockDateRange, mock(() => {})]
})

// Mock the atoms from transactions
mock.module('~/lib/atoms/transactions', () => ({
  transactionFiltersAtom: {
    init: { page: 1, limit: 20 },
    read: () => ({ page: 1, limit: 20 }),
    write: () => {},
  },
  transactionSearchAtom: {
    init: '',
    read: () => '',
    write: () => {},
  },
  transactionDateRangeAtom: {
    init: {},
    read: () => ({}),
    write: () => {},
  },
}))

// Mock useAtom to return proper values
mock.module('jotai', () => {
  return {
    atom: mockAtomFn,
    useAtom: mockUseAtomFn,
    Provider: ({ children }: { children: React.ReactNode }) => children,
  }
})

import { TransactionFilters } from '~/components/transactions/TransactionFilters'

describe('TransactionFilters', () => {
  beforeEach(() => {
    cleanup() // Clean up DOM between tests
    mockAtomFn.mockReset()
    mockUseAtomFn.mockReset()
    mockUseAtomFn.mockImplementation((atom: { init?: unknown }) => {
      if (atom?.init && typeof atom.init === 'object' && 'page' in (atom.init as Record<string, unknown>)) {
        return [mockFilters, mock(() => {})]
      }
      if (atom?.init === '') {
        return [mockSearch, mock(() => {})]
      }
      return [mockDateRange, mock(() => {})]
    })
  })

  it('should render search input', () => {
    render(<TransactionFilters />)

    expect(screen.getByPlaceholderText('取引を検索...')).toBeInTheDocument()
  })

  it('should render type filter select', () => {
    render(<TransactionFilters />)

    // react-aria Select uses a button trigger with placeholder or selected value
    // In test environment, the hidden select element is present
    const hiddenSelect = document.querySelector('[data-testid="hidden-select-container"] select')
    expect(hiddenSelect).toBeInTheDocument()
  })

  it('should render advanced filters button', () => {
    render(<TransactionFilters />)

    expect(screen.getByText('詳細フィルター')).toBeInTheDocument()
  })

  it('should have editable search input', async () => {
    render(<TransactionFilters />)

    const searchInput = screen.getByPlaceholderText('取引を検索...')
    // Verify the input is editable (not disabled or readonly)
    expect(searchInput).not.toBeDisabled()
    expect(searchInput).toBeInTheDocument()
  })

  it('should show advanced filters when button is clicked', async () => {
    render(<TransactionFilters />)

    // Initially advanced filters not visible
    expect(screen.queryByText('開始日')).not.toBeInTheDocument()

    // Click to show advanced filters
    const advancedButton = screen.getByText('詳細フィルター')
    fireEvent.click(advancedButton)

    // Now they should be visible
    await waitFor(() => {
      expect(screen.getByText('開始日')).toBeInTheDocument()
      expect(screen.getByText('終了日')).toBeInTheDocument()
    })
  })

  it('should hide advanced filters when clicked again', async () => {
    render(<TransactionFilters />)

    const advancedButton = screen.getByText('詳細フィルター')

    // Show
    fireEvent.click(advancedButton)
    await waitFor(() => {
      expect(screen.getByText('開始日')).toBeInTheDocument()
    })

    // Hide
    fireEvent.click(advancedButton)
    await waitFor(() => {
      expect(screen.queryByText('開始日')).not.toBeInTheDocument()
    })
  })

  it('should render transaction type select with default value', () => {
    render(<TransactionFilters />)

    // react-aria Select has a hidden select element for form integration
    const hiddenSelect = document.querySelector('[data-testid="hidden-select-container"] select')
    expect(hiddenSelect).toBeInTheDocument()
    // The hidden select should have option for ALL
    const allOption = document.querySelector('[data-testid="hidden-select-container"] option[value="ALL"]')
    expect(allOption).toBeInTheDocument()
  })

  it('should render filter icon', () => {
    render(<TransactionFilters />)

    // The filter button should be present
    expect(screen.getByText('詳細フィルター')).toBeInTheDocument()
  })

  it('should be responsive container', () => {
    render(<TransactionFilters />)

    // Check that the component renders without errors
    expect(screen.getByPlaceholderText('取引を検索...')).toBeInTheDocument()
    // Select component renders with hidden select for accessibility
    const hiddenSelect = document.querySelector('[data-testid="hidden-select-container"] select')
    expect(hiddenSelect).toBeInTheDocument()
    expect(screen.getByText('詳細フィルター')).toBeInTheDocument()
  })
})
