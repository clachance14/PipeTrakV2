/**
 * Integration Test: Mobile Milestone Update Journey
 * Feature: 015-mobile-milestone-updates
 * User Story 1: Update Milestones from Mobile Device
 * 
 * Acceptance Scenarios:
 * 1. Expand drawing on mobile viewport
 * 2. Tap discrete milestone checkbox → toggles instantly
 * 3. Tap partial milestone → full-screen modal opens with slider
 * 4. Save value → modal closes, value updated
 * 5. Verify progress recalculation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DrawingComponentTablePage from '@/pages/DrawingComponentTablePage'

// Mock viewport to mobile
const mockMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375
  })
  window.dispatchEvent(new Event('resize'))
}

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null })
  }
}))

describe('Integration: Mobile Milestone Update Journey (User Story 1)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    mockMobileViewport()
    vi.clearAllMocks()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  it('Scenario 1: Expand drawing row on mobile viewport', async () => {
    // Given: Mobile viewport (375px)
    expect(window.innerWidth).toBe(375)

    renderWithProviders(<DrawingComponentTablePage />)

    // When: User taps drawing row
    await waitFor(() => {
      const drawingRow = screen.queryByTestId('drawing-row-1')
      expect(drawingRow).toBeInTheDocument()
    })

    const drawingRow = screen.getByTestId('drawing-row-1')
    await userEvent.click(drawingRow)

    // Then: Drawing expands to show components
    await waitFor(() => {
      expect(screen.getByTestId('component-row-1')).toBeInTheDocument()
    })
  })

  it('Scenario 2: Tap discrete milestone checkbox → toggles instantly', async () => {
    renderWithProviders(<DrawingComponentTablePage />)

    // Expand drawing
    await waitFor(() => {
      const drawingRow = screen.queryByTestId('drawing-row-1')
      expect(drawingRow).toBeInTheDocument()
    })
    const drawingRow = screen.getByTestId('drawing-row-1')
    await userEvent.click(drawingRow)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('component-row-1')).toBeInTheDocument()
    })

    // When: User taps discrete milestone checkbox (Receive)
    const checkbox = screen.getByRole('button', { name: /receive/i })
    
    // Verify touch target size (44px minimum)
    const rect = checkbox.getBoundingClientRect()
    expect(rect.width).toBeGreaterThanOrEqual(44)
    expect(rect.height).toBeGreaterThanOrEqual(44)

    await userEvent.click(checkbox)

    // Then: Checkbox toggles instantly (optimistic UI)
    await waitFor(() => {
      expect(checkbox).toHaveClass('checked')
    })
  })

  it('Scenario 3: Tap partial milestone → full-screen modal opens', async () => {
    renderWithProviders(<DrawingComponentTablePage />)

    // Expand drawing and wait for component
    await waitFor(() => {
      const drawingRow = screen.queryByTestId('drawing-row-1')
      expect(drawingRow).toBeInTheDocument()
    })
    const drawingRow = screen.getByTestId('drawing-row-1')
    await userEvent.click(drawingRow)

    await waitFor(() => {
      expect(screen.getByTestId('component-row-1')).toBeInTheDocument()
    })

    // When: User taps partial milestone trigger (Install)
    const partialTrigger = screen.getByRole('button', { name: /install.*%/i })
    await userEvent.click(partialTrigger)

    // Then: Full-screen modal opens with large slider
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const modal = screen.getByRole('dialog')
    
    // Verify full-screen (h-screen w-screen classes on mobile)
    expect(modal.parentElement).toHaveClass('h-screen')
    
    // Verify slider exists and is large
    const slider = within(modal).getByRole('slider')
    expect(slider).toBeInTheDocument()
    
    const sliderRect = slider.getBoundingClientRect()
    expect(sliderRect.height).toBeGreaterThanOrEqual(48) // h-12 = 48px
  })

  it('Scenario 4: Save value → modal closes, value updated', async () => {
    renderWithProviders(<DrawingComponentTablePage />)

    // Expand drawing, wait for component
    await waitFor(() => {
      const drawingRow = screen.queryByTestId('drawing-row-1')
      expect(drawingRow).toBeInTheDocument()
    })
    const drawingRow = screen.getByTestId('drawing-row-1')
    await userEvent.click(drawingRow)

    await waitFor(() => {
      expect(screen.getByTestId('component-row-1')).toBeInTheDocument()
    })

    // Open partial milestone modal
    const partialTrigger = screen.getByRole('button', { name: /install.*%/i })
    await userEvent.click(partialTrigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const modal = screen.getByRole('dialog')

    // When: User drags slider to 75% and clicks Save
    const slider = within(modal).getByRole('slider')
    // Simulate slider value change
    await userEvent.click(slider)

    const saveButton = within(modal).getByRole('button', { name: /save/i })
    
    // Verify Save button has adequate touch target
    const saveRect = saveButton.getBoundingClientRect()
    expect(saveRect.height).toBeGreaterThanOrEqual(44)

    await userEvent.click(saveButton)

    // Then: Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Value updated in component row
    await waitFor(() => {
      const updatedValue = screen.getByText(/75%/)
      expect(updatedValue).toBeInTheDocument()
    })
  })

  it('Scenario 5: Verify progress recalculation after milestone update', async () => {
    renderWithProviders(<DrawingComponentTablePage />)

    // Wait for drawing row
    await waitFor(() => {
      const drawingRow = screen.queryByTestId('drawing-row-1')
      expect(drawingRow).toBeInTheDocument()
    })

    const drawingRow = screen.getByTestId('drawing-row-1')
    
    // Get initial progress
    const initialProgress = within(drawingRow).getByTestId('drawing-progress')
    const initialPercent = parseInt(initialProgress.textContent || '0')

    // Expand and update milestone
    await userEvent.click(drawingRow)

    await waitFor(() => {
      expect(screen.getByTestId('component-row-1')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('button', { name: /receive/i })
    await userEvent.click(checkbox)

    // Then: Drawing progress recalculates (invalidates cache)
    await waitFor(() => {
      const updatedProgress = within(drawingRow).getByTestId('drawing-progress')
      const updatedPercent = parseInt(updatedProgress.textContent || '0')
      
      // Progress should have changed after milestone update
      expect(updatedPercent).not.toBe(initialPercent)
    }, { timeout: 3000 })

    // Toast confirmation shown
    await waitFor(() => {
      expect(screen.getByText(/milestone updated/i)).toBeInTheDocument()
    })
  })

  it('Touch target validation: All interactive elements ≥44px', async () => {
    renderWithProviders(<DrawingComponentTablePage />)

    await waitFor(() => {
      const drawingRow = screen.queryByTestId('drawing-row-1')
      expect(drawingRow).toBeInTheDocument()
    })

    // Drawing expansion toggle
    const drawingRow = screen.getByTestId('drawing-row-1')
    const expandToggle = within(drawingRow).getByRole('button', { name: /expand/i })
    const toggleRect = expandToggle.getBoundingClientRect()
    expect(toggleRect.width).toBeGreaterThanOrEqual(44)
    expect(toggleRect.height).toBeGreaterThanOrEqual(44)

    // Expand to check component controls
    await userEvent.click(drawingRow)

    await waitFor(() => {
      expect(screen.getByTestId('component-row-1')).toBeInTheDocument()
    })

    // Discrete milestone checkbox
    const checkbox = screen.getByRole('button', { name: /receive/i })
    const checkboxRect = checkbox.getBoundingClientRect()
    expect(checkboxRect.width).toBeGreaterThanOrEqual(44)
    expect(checkboxRect.height).toBeGreaterThanOrEqual(44)

    // Partial milestone trigger
    const partialTrigger = screen.getByRole('button', { name: /install.*%/i })
    const partialRect = partialTrigger.getBoundingClientRect()
    expect(partialRect.minHeight || partialRect.height).toBeGreaterThanOrEqual(44)
  })
})
