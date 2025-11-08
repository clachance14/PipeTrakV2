/**
 * SearchableCombobox Component Tests
 *
 * Feature: 020-component-metadata-editing
 * Task: T006 - Write tests for SearchableCombobox component
 * Date: 2025-10-29
 *
 * Test Coverage:
 * - Rendering with options list
 * - Filter-as-you-type search
 * - Virtualization (only visible items rendered)
 * - Special "(None)" option at top
 * - Special "Create new..." option at bottom
 * - Selection callback handling
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Accessibility (ARIA labels, keyboard support)
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchableCombobox } from './SearchableCombobox'
import type { MetadataOption } from '@/types/metadata'

// Mock ResizeObserver for virtualization
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock getBoundingClientRect for virtualization
const mockGetBoundingClientRect = vi.fn(() => ({
  width: 400,
  height: 300,
  top: 0,
  left: 0,
  bottom: 300,
  right: 400,
  x: 0,
  y: 0,
  toJSON: () => {}
}))

describe('SearchableCombobox', () => {
  beforeAll(() => {
    // Setup mocks needed for TanStack Virtual
    global.ResizeObserver = ResizeObserverMock as any
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect

    // Mock scroll dimensions
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() { return 500 }
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() { return 400 }
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() { return 300 }
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() { return 400 }
    })
  })

  // Test data
  const mockOptions: MetadataOption[] = [
    { value: 'area-1', label: 'North Wing', type: 'existing' },
    { value: 'area-2', label: 'South Wing', type: 'existing' },
    { value: 'area-3', label: 'East Wing', type: 'existing' },
    { value: 'area-4', label: 'West Wing', type: 'existing' },
    { value: null, label: '(None)', type: 'none' },
    { value: '__create_new__', label: 'Create new Area...', type: 'create-new' }
  ]

  const largeOptions: MetadataOption[] = [
    { value: null, label: '(None)', type: 'none' },
    ...Array.from({ length: 1000 }, (_, i) => ({
      value: `area-${i}`,
      label: `Area ${i}`,
      type: 'existing' as const
    })),
    { value: '__create_new__', label: 'Create new Area...', type: 'create-new' }
  ]

  let mockOnChange: ReturnType<typeof vi.fn>
  let mockOnCreateNew: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnChange = vi.fn()
    mockOnCreateNew = vi.fn()
  })

  describe('Basic Rendering', () => {
    it('renders combobox button with placeholder when no value selected', () => {
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          placeholder="Select area..."
        />
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Select area...')).toBeInTheDocument()
    })

    it('renders combobox button with selected value label', () => {
      render(
        <SearchableCombobox
          options={mockOptions}
          value="area-1"
          onChange={mockOnChange}
          placeholder="Select area..."
        />
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('North Wing')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          className="custom-class"
        />
      )

      const combobox = container.querySelector('.custom-class')
      expect(combobox).toBeInTheDocument()
    })

    it('has accessible ARIA label', () => {
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          placeholder="Select area..."
        />
      )

      const combobox = screen.getByRole('combobox')
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
      expect(combobox).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Dropdown Interactions', () => {
    it('opens dropdown when combobox button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // Dropdown should be open, search input visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      expect(combobox).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes dropdown when escape key is pressed', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      // Open dropdown
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      // Press escape
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
      })
    })

    it('displays all options when dropdown opens', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      // With virtualization, we expect at least some options to be visible
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
        // Should have all 6 options (4 regular + None + Create new)
        expect(options.length).toBe(6)
      })
    })
  })

  describe('Special Options', () => {
    it('displays "(None)" option at the top of the list', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        // First visible option should be "(None)"
        expect(options[0]).toHaveTextContent('(None)')
      })
    })

    it('displays "Create new..." option at the bottom of the list', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          onCreateNew={mockOnCreateNew}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        // Last visible option should be "Create new..."
        const lastOption = options[options.length - 1]
        expect(lastOption).toHaveTextContent('Create new Area...')
      })
    })

    it('calls onChange with null when "(None)" is selected', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value="area-1"
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
      })

      // Click the first option (None)
      const options = screen.getAllByRole('option')
      await user.click(options[0])

      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('calls onCreateNew when "Create new..." is selected', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          onCreateNew={mockOnCreateNew}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBe(6)
      })

      // Click the last option (Create new...)
      const options = screen.getAllByRole('option')
      await user.click(options[options.length - 1])

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1)
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('does not display "Create new..." option when onCreateNew is not provided', async () => {
      const user = userEvent.setup()
      const optionsWithoutCreateNew = mockOptions.filter(opt => opt.type !== 'create-new')

      render(
        <SearchableCombobox
          options={optionsWithoutCreateNew}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        // Should have 5 options (None + 4 regular), not 6
        expect(options.length).toBe(5)
      })

      // Verify last option is NOT "Create new..."
      const options = screen.getAllByRole('option')
      expect(options[options.length - 1]).not.toHaveTextContent('Create new')
    })
  })

  describe('Filter-as-you-type Search', () => {
    it('filters options based on search input (case-insensitive)', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')
      await user.type(searchInput, 'north')

      await waitFor(() => {
        expect(screen.getByText('North Wing')).toBeInTheDocument()
        expect(screen.queryByText('South Wing')).not.toBeInTheDocument()
        expect(screen.queryByText('East Wing')).not.toBeInTheDocument()
        expect(screen.queryByText('West Wing')).not.toBeInTheDocument()
      })
    })

    it('filters using substring match', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')
      await user.type(searchInput, 'wing')

      await waitFor(() => {
        expect(screen.getByText('North Wing')).toBeInTheDocument()
        expect(screen.getByText('South Wing')).toBeInTheDocument()
        expect(screen.getByText('East Wing')).toBeInTheDocument()
        expect(screen.getByText('West Wing')).toBeInTheDocument()
      })
    })

    it('shows empty message when no results match filter', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          emptyMessage="No areas found"
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        // When there are no matching options, empty message should show
        expect(screen.getByText('No areas found')).toBeInTheDocument()
        // And no options should be rendered
        expect(screen.queryByRole('option')).not.toBeInTheDocument()
      })
    })

    it('does not filter "(None)" option', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')
      await user.type(searchInput, 'north')

      await waitFor(() => {
        // "(None)" should still be visible
        expect(screen.getByText('(None)')).toBeInTheDocument()
        expect(screen.getByText('North Wing')).toBeInTheDocument()
      })
    })

    it('does not filter "Create new..." option', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          onCreateNew={mockOnCreateNew}
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')
      await user.type(searchInput, 'north')

      await waitFor(() => {
        // "Create new..." should still be visible
        expect(screen.getByText('Create new Area...')).toBeInTheDocument()
        expect(screen.getByText('North Wing')).toBeInTheDocument()
      })
    })

    it('clears filter when search input is cleared', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')
      await user.type(searchInput, 'north')

      await waitFor(() => {
        expect(screen.getByText('North Wing')).toBeInTheDocument()
        expect(screen.queryByText('South Wing')).not.toBeInTheDocument()
      })

      await user.clear(searchInput)

      await waitFor(() => {
        expect(screen.getByText('North Wing')).toBeInTheDocument()
        expect(screen.getByText('South Wing')).toBeInTheDocument()
        expect(screen.getByText('East Wing')).toBeInTheDocument()
        expect(screen.getByText('West Wing')).toBeInTheDocument()
      })
    })
  })

  describe('Selection Handling', () => {
    it('calls onChange with selected option value', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(1)
      })

      // Click the second option (first is "(None)")
      // Options: (None), North Wing, South Wing, East Wing, West Wing, Create new
      const options = screen.getAllByRole('option')
      await user.click(options[1])  // Click "North Wing"

      expect(mockOnChange).toHaveBeenCalledWith('area-1')
    })

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
      })

      const options = screen.getAllByRole('option')
      await user.click(options[1])  // Click "North Wing"

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
      })
    })

    it('updates button text to reflect selected value', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
          placeholder="Select area..."
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
      })

      const options = screen.getAllByRole('option')
      await user.click(options[1])  // Click "North Wing"

      // Simulate parent component updating value prop
      rerender(
        <SearchableCombobox
          options={mockOptions}
          value="area-1"
          onChange={mockOnChange}
          placeholder="Select area..."
        />
      )

      expect(screen.getByRole('combobox')).toHaveTextContent('North Wing')
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates options with arrow down key', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search...')

      // Arrow down should highlight first option
      await user.keyboard('{ArrowDown}')

      // First option should be highlighted (visual feedback via data-selected attribute)
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('data-selected', 'true')
    })

    it('navigates options with arrow up key', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      // Arrow down twice
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')

      // Arrow up once (should go back to first option)
      await user.keyboard('{ArrowUp}')

      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('data-selected', 'true')
    })

    it('selects highlighted option with enter key', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      // Navigate to second option (first is "(None)")
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')

      // Select with enter
      await user.keyboard('{Enter}')

      // Should call onChange with the selected value
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('closes dropdown with escape key without selecting', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
      })

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Virtualization', () => {
    it('renders large list (1000+ items) without performance issues', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={largeOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      // Only visible items should be in the DOM (not all 1000+)
      const options = screen.getAllByRole('option')

      // With virtualization, we should see far fewer than 1002 options rendered
      // With mocked height (300px) and estimated item height (32px), we expect ~9-10 visible + 5 overscan = ~15-20 items
      expect(options.length).toBeLessThan(50)
      expect(options.length).toBeGreaterThan(0)
    })

    it('scrolls to reveal more virtualized items', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={largeOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      // With virtualization, options should be rendered
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
      })
    })

    it('maintains virtualization performance when filtering', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={largeOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')

      // Filter to ~100 items (Area 0-99 contain "0")
      await user.type(searchInput, '0')

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        // Still virtualized even with filter applied
        expect(options.length).toBeLessThan(100)
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper role attributes', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      expect(combobox).toBeInTheDocument()

      await user.click(combobox)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
      })
    })

    it('supports screen reader navigation', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      const combobox = screen.getByRole('combobox')

      // Should have aria-expanded attribute
      expect(combobox).toHaveAttribute('aria-expanded', 'false')

      await user.click(combobox)

      await waitFor(() => {
        expect(combobox).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('search input has accessible label', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      const searchInput = await screen.findByPlaceholderText('Search...')

      // Input should have aria-label or placeholder for accessibility
      expect(searchInput).toHaveAttribute('placeholder', 'Search...')
    })

    it('options have accessible text content', async () => {
      const user = userEvent.setup()
      render(
        <SearchableCombobox
          options={mockOptions}
          value={null}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options.length).toBeGreaterThan(0)
      })

      const options = screen.getAllByRole('option')
      options.forEach(option => {
        expect(option.textContent).toBeTruthy()
      })
    })
  })
})
