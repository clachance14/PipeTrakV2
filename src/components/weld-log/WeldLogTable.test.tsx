/**
 * Unit Tests: WeldLogTable Component
 * Feature: 022-weld-log-mobile (T003)
 * Tests mobile and desktop responsive rendering of weld log table
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { WeldLogTable } from './WeldLogTable'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

// Mock useMobileDetection hook
vi.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: vi.fn(),
}))

import { useMobileDetection } from '@/hooks/useMobileDetection'

const mockUseMobileDetection = useMobileDetection as unknown as ReturnType<typeof vi.fn>

/**
 * Mock Weld Data Generator
 */
function createMockWeld(overrides?: Partial<EnrichedFieldWeld>): EnrichedFieldWeld {
  return {
    id: 'test-weld-1',
    project_id: 'test-project-id',
    component_id: 'test-component-id',
    created_by: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    weld_type: 'BW',
    status: 'active',
    welder_id: 'test-welder-id',
    date_welded: '2025-01-15',
    nde_required: true,
    nde_type: 'RT',
    nde_result: 'PASS',
    nde_date: '2025-01-16',
    nde_notes: null,
    is_repair: false,
    original_weld_id: null,
    base_metal: 'CS',
    weld_size: '2"',
    schedule: 'STD',
    spec: 'B31.3',
    component: {
      id: 'test-component-id',
      identity_key: { LINE: 'P-101', JOINT: '1' },
      component_type: 'Piping',
      progress_template_id: 'test-template-id',
      drawing_id: 'test-drawing-id',
      area_id: 'test-area-id',
      system_id: 'test-system-id',
      test_package_id: 'test-package-id',
      percent_complete: 85,
    },
    drawing: {
      id: 'test-drawing-id',
      drawing_no_norm: 'P-1001-A',
      drawing_no_raw: 'P-1001-A',
      title: 'Test Drawing',
      rev: 'A',
    },
    welder: {
      id: 'test-welder-id',
      name: 'John Doe',
      stencil: 'JD-123',
      stencil_norm: 'JD123',
      status: 'active',
    },
    area: {
      id: 'test-area-id',
      name: 'Area 100',
      description: 'Test Area',
    },
    system: {
      id: 'test-system-id',
      name: 'System 200',
      description: 'Test System',
    },
    test_package: {
      id: 'test-package-id',
      name: 'Package A',
      description: 'Test Package',
    },
    identityDisplay: 'P-101 / J-1',
    ...overrides,
  } as EnrichedFieldWeld
}

/**
 * Wrapper component with Router context
 */
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('WeldLogTable', () => {
  const mockWelds = [
    createMockWeld({
      id: 'weld-1',
      identityDisplay: 'P-101 / J-1',
      date_welded: '2025-01-15',
    }),
    createMockWeld({
      id: 'weld-2',
      identityDisplay: 'P-102 / J-2',
      date_welded: '2025-01-16',
      drawing: {
        id: 'test-drawing-2',
        drawing_no_norm: 'P-1002-B',
        drawing_no_raw: 'P-1002-B',
        title: 'Test Drawing 2',
        rev: 'B',
      },
    }),
    createMockWeld({
      id: 'weld-3',
      identityDisplay: 'P-103 / J-3',
      date_welded: '2025-01-17',
      drawing: {
        id: 'test-drawing-3',
        drawing_no_norm: 'P-1003-C',
        drawing_no_raw: 'P-1003-C',
        title: 'Test Drawing 3',
        rev: 'C',
      },
    }),
  ]

  beforeEach(() => {
    // Default to desktop view
    mockUseMobileDetection.mockReturnValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('displays empty state when no welds provided', () => {
      renderWithRouter(<WeldLogTable welds={[]} />)

      expect(screen.getByText('No field welds found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
    })
  })

  describe('Desktop View (>1024px)', () => {
    beforeEach(() => {
      mockUseMobileDetection.mockReturnValue(false)
    })

    it('renders all 10 columns on desktop', () => {
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // Check for all column headers
      expect(screen.getByText('Weld ID')).toBeInTheDocument()
      expect(screen.getByText('Drawing')).toBeInTheDocument()
      expect(screen.getByText('Welder')).toBeInTheDocument()
      expect(screen.getByText('Date Welded')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Size')).toBeInTheDocument()
      expect(screen.getByText('NDE Result')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('displays all weld data in desktop columns', () => {
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // Check first weld data - verify key columns are populated
      expect(screen.getByText('P-101 / J-1')).toBeInTheDocument()
      expect(screen.getByText('P-1001-A')).toBeInTheDocument()

      // Use getAllByText for welder info since we have 3 welds with same welder
      const welderElements = screen.getAllByText(/JD-123 - John Doe/)
      expect(welderElements.length).toBeGreaterThan(0)

      expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument()

      // Verify table has progress indicators
      expect(screen.getAllByText(/85%/).length).toBeGreaterThan(0)
    })

    it('renders action buttons on desktop for active welds', () => {
      // Create a weld without welder assigned to show "Update Weld" button
      const weldWithoutWelder = createMockWeld({
        id: 'weld-no-welder',
        welder_id: null,
        welder: null,
        status: 'active',
      })

      renderWithRouter(<WeldLogTable welds={[weldWithoutWelder]} userRole="admin" />)

      // Should have "Update Weld" button for active weld without welder
      const updateButton = screen.getByText(/Update Weld/i)
      expect(updateButton).toBeInTheDocument()
    })
  })

  describe('Mobile View (≤1024px)', () => {
    beforeEach(() => {
      mockUseMobileDetection.mockReturnValue(true)
    })

    it('renders only 3 essential columns on mobile', () => {
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // Should have only 3 column headers
      expect(screen.getByText('Weld ID')).toBeInTheDocument()
      expect(screen.getByText('Drawing')).toBeInTheDocument()
      expect(screen.getByText('Date Welded')).toBeInTheDocument()

      // Should NOT have other column headers
      expect(screen.queryByText('Welder')).not.toBeInTheDocument()
      expect(screen.queryByText('Type')).not.toBeInTheDocument()
      expect(screen.queryByText('Size')).not.toBeInTheDocument()
      expect(screen.queryByText('NDE Result')).not.toBeInTheDocument()
      expect(screen.queryByText('Status')).not.toBeInTheDocument()
      expect(screen.queryByText('Progress')).not.toBeInTheDocument()
      expect(screen.queryByText('Actions')).not.toBeInTheDocument()
    })

    it('displays weld ID, drawing number, and date in mobile view', () => {
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // Check that essential data is displayed
      expect(screen.getByText('P-101 / J-1')).toBeInTheDocument()
      expect(screen.getByText('P-1001-A')).toBeInTheDocument()
      expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument()
    })

    it('applies minimum height for touch targets on mobile rows', () => {
      const { container } = renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // Find table rows (tbody tr elements)
      const rows = container.querySelectorAll('tbody tr')

      // Check that rows have min-h-[44px] class for touch targets
      rows.forEach((row) => {
        expect(row.className).toContain('min-h-[44px]')
      })
    })

    it('renders drawing number as clickable link on mobile', () => {
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      const drawingLink = screen.getByRole('link', { name: 'P-1001-A' })
      expect(drawingLink).toBeInTheDocument()
      expect(drawingLink).toHaveAttribute('href', '/drawings?expanded=test-drawing-id')
    })

    it('does not apply horizontal scroll wrapper on mobile', () => {
      const { container } = renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // The outer container should have overflow-auto for vertical scroll only on mobile
      const tableWrapper = container.querySelector('.overflow-auto')
      expect(tableWrapper).toBeInTheDocument()

      // On mobile, the table should NOT have a class that forces horizontal overflow
      const table = container.querySelector('table')
      expect(table?.className).not.toContain('overflow-x-auto')
    })
  })

  describe('Drawing Link Behavior', () => {
    it('drawing link navigates to correct route on mobile', () => {
      mockUseMobileDetection.mockReturnValue(true)
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      const drawingLink = screen.getByRole('link', { name: 'P-1001-A' })
      expect(drawingLink).toHaveAttribute('href', '/drawings?expanded=test-drawing-id')
    })

    it('drawing link navigates to correct route on desktop', () => {
      mockUseMobileDetection.mockReturnValue(false)
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      const drawingLink = screen.getByRole('link', { name: 'P-1001-A' })
      expect(drawingLink).toHaveAttribute('href', '/drawings?expanded=test-drawing-id')
    })
  })

  describe('Sorting Functionality', () => {
    it('maintains sorting functionality on desktop', () => {
      mockUseMobileDetection.mockReturnValue(false)
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // All sortable headers should be present
      const headers = screen.getAllByRole('button')
      expect(headers.length).toBeGreaterThan(0)
    })

    it('maintains sorting functionality on mobile for visible columns', () => {
      mockUseMobileDetection.mockReturnValue(true)
      renderWithRouter(<WeldLogTable welds={mockWelds} />)

      // Should have 3 sortable column headers on mobile
      const headers = screen.getAllByRole('button')
      expect(headers.length).toBe(3) // Weld ID, Drawing, Date Welded
    })
  })
})
