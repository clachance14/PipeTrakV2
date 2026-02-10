/**
 * Integration Tests: Weld Log Mobile Optimization
 * Feature: 022-weld-log-mobile
 * Purpose: Test mobile-optimized weld log table and detail modal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'
import type { Tables } from '@/types/database.types'

type FieldWeld = Tables<'field_welds'>

/**
 * Mock Viewport Helper
 * Simulates mobile and desktop viewport widths for responsive testing
 */
export function mockMobile(): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 768, // Mobile viewport (≤1024px)
  })
  window.dispatchEvent(new Event('resize'))
}

export function mockDesktop(): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1920, // Desktop viewport (>1024px)
  })
  window.dispatchEvent(new Event('resize'))
}

/**
 * Mock Weld Data Generator
 * Creates valid EnrichedFieldWeld test data with all required fields
 */
export function createMockWeld(overrides?: Partial<EnrichedFieldWeld>): EnrichedFieldWeld {
  const baseWeld: FieldWeld = {
    id: 'test-weld-id',
    project_id: 'test-project-id',
    component_id: 'test-component-id',
    created_by: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    weld_type: 'BW',
    status: 'fitup',
    welder_id: 'test-welder-id',
    date_welded: '2025-01-01',
    nde_required: true,
    nde_type: 'RT',
    nde_result: null,
    nde_date: null,
    nde_notes: null,
    is_repair: false,
    original_weld_id: null,
    base_metal: 'CS',
    weld_size: '2"',
    schedule: 'STD',
    spec: 'B31.3',
  }

  const enrichedWeld: EnrichedFieldWeld = {
    ...baseWeld,
    component: {
      id: 'test-component-id',
      identity_key: { LINE: 'P-101', JOINT: '1' },
      component_type: 'Piping',
      progress_template_id: 'test-template-id',
      drawing_id: 'test-drawing-id',
      area_id: 'test-area-id',
      system_id: 'test-system-id',
      test_package_id: 'test-package-id',
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
  }

  return enrichedWeld
}

/**
 * Mock Weld Array Generator
 * Creates an array of mock welds with sequential IDs
 */
export function createMockWelds(count: number): EnrichedFieldWeld[] {
  return Array.from({ length: count }, (_, i) => createMockWeld({
    id: `test-weld-${i + 1}`,
    identityDisplay: `P-10${i + 1} / J-${i + 1}`,
    component: {
      id: `test-component-${i + 1}`,
      identity_key: { LINE: `P-10${i + 1}`, JOINT: `${i + 1}` },
      component_type: 'Piping',
      progress_template_id: 'test-template-id',
      drawing_id: `test-drawing-${i + 1}`,
      area_id: 'test-area-id',
      system_id: 'test-system-id',
      test_package_id: 'test-package-id',
    },
    drawing: {
      id: `test-drawing-${i + 1}`,
      drawing_no_norm: `P-100${i + 1}-A`,
      drawing_no_raw: `P-100${i + 1}-A`,
      title: `Test Drawing ${i + 1}`,
      rev: 'A',
    },
    date_welded: `2025-01-${String(i + 1).padStart(2, '0')}`,
  }))
}

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  }),
}))

// Mock hooks used by action dialogs
vi.mock('@/hooks/useRecordNDE', () => ({
  useRecordNDE: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useAssignWelder', () => ({
  useAssignWelder: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useWelders', () => ({
  useWelders: () => ({
    data: [
      { id: 'welder-1', stencil: 'JD-123', name: 'John Doe', status: 'active' },
      { id: 'welder-2', stencil: 'JS-456', name: 'Jane Smith', status: 'active' },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useFieldWeld', () => ({
  useFieldWeld: () => ({
    data: null,
    isLoading: false,
  }),
}))

/**
 * Test Setup Utilities
 */
let queryClient: QueryClient

export function setupTestQueryClient(): QueryClient {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
    },
  })
  return queryClient
}

export function cleanupTestQueryClient(): void {
  if (queryClient) {
    queryClient.clear()
  }
}

/**
 * Test Suite Setup/Teardown
 */
describe('Weld Log Mobile Integration Tests', () => {
  beforeEach(() => {
    setupTestQueryClient()
    // Reset viewport to desktop by default
    mockDesktop()
  })

  afterEach(() => {
    cleanupTestQueryClient()
    vi.clearAllMocks()
  })

  /**
   * Placeholder tests - will be implemented in Phase 3-5
   * These tests verify the structure is ready for future implementation
   */
  it('should have mock utilities available', () => {
    expect(typeof mockMobile).toBe('function')
    expect(typeof mockDesktop).toBe('function')
    expect(typeof createMockWeld).toBe('function')
    expect(typeof createMockWelds).toBe('function')
  })

  it('should generate valid mock weld data', () => {
    const mockWeld = createMockWeld()

    expect(mockWeld).toBeDefined()
    expect(mockWeld.id).toBe('test-weld-id')
    expect(mockWeld.component).toBeDefined()
    expect(mockWeld.drawing).toBeDefined()
    expect(mockWeld.welder).toBeDefined()
    expect(mockWeld.identityDisplay).toBe('P-101 / J-1')
  })

  it('should generate array of mock welds', () => {
    const mockWelds = createMockWelds(5)

    expect(mockWelds).toHaveLength(5)
    expect(mockWelds[0].id).toBe('test-weld-1')
    expect(mockWelds[4].id).toBe('test-weld-5')
  })

  it('should support weld data overrides', () => {
    const mockWeld = createMockWeld({
      status: 'welded',
      date_welded: '2025-02-15',
    })

    expect(mockWeld.status).toBe('welded')
    expect(mockWeld.date_welded).toBe('2025-02-15')
  })

  it('should mock mobile viewport correctly', () => {
    mockMobile()
    expect(window.innerWidth).toBe(768)
  })

  it('should mock desktop viewport correctly', () => {
    mockDesktop()
    expect(window.innerWidth).toBe(1920)
  })

  /**
   * Phase 3 - User Story 1 (P1): Mobile Table Rendering (T005)
   */
  describe('Mobile Table Rendering (User Story 1)', () => {
    it('should render WeldLogTable on mobile with 3 columns and no horizontal overflow', async () => {
      // Set mobile viewport
      mockMobile()

      // Create mock welds
      const mockWelds = createMockWelds(10)

      // Import WeldLogTable component
      const { WeldLogTable } = await import('@/components/weld-log/WeldLogTable')

      // Render component with router context
      const { container } = render(
        <BrowserRouter>
          <WeldLogTable welds={mockWelds} />
        </BrowserRouter>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Weld ID')).toBeInTheDocument()
      })

      // Verify only 3 columns are rendered
      expect(screen.getByText('Weld ID')).toBeInTheDocument()
      expect(screen.getByText('Drawing')).toBeInTheDocument()
      expect(screen.getByText('Date Welded')).toBeInTheDocument()

      // Verify other columns are NOT rendered
      expect(screen.queryByText('Welder')).not.toBeInTheDocument()
      expect(screen.queryByText('Type')).not.toBeInTheDocument()
      expect(screen.queryByText('Size')).not.toBeInTheDocument()
      expect(screen.queryByText('NDE Result')).not.toBeInTheDocument()
      expect(screen.queryByText('Progress')).not.toBeInTheDocument()
      expect(screen.queryByText('Actions')).not.toBeInTheDocument()

      // Verify weld data is displayed
      expect(screen.getByText('P-101 / J-1')).toBeInTheDocument()
      expect(screen.getByText('P-1001-A')).toBeInTheDocument()

      // Verify table wrapper has overflow-auto (not overflow-x-auto which forces horizontal scroll)
      const tableWrapper = container.querySelector('.overflow-auto')
      expect(tableWrapper).toBeInTheDocument()

      // Verify table does not have overflow-x-auto class
      const table = container.querySelector('table')
      expect(table?.className).not.toContain('overflow-x-auto')
    })

    it('should render all 9 columns on desktop viewport', async () => {
      // Set desktop viewport
      mockDesktop()

      // Create mock welds
      const mockWelds = createMockWelds(5)

      // Import WeldLogTable component
      const { WeldLogTable } = await import('@/components/weld-log/WeldLogTable')

      // Render component with router context
      render(
        <BrowserRouter>
          <WeldLogTable welds={mockWelds} userRole="admin" />
        </BrowserRouter>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Weld ID')).toBeInTheDocument()
      })

      // Verify all 9 columns are rendered (not 10 - no "Status" column in current implementation)
      expect(screen.getByText('Weld ID')).toBeInTheDocument()
      expect(screen.getByText('Drawing')).toBeInTheDocument()
      expect(screen.getByText('Welder')).toBeInTheDocument()
      expect(screen.getByText('Date Welded')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Size')).toBeInTheDocument()
      expect(screen.getByText('NDE Result')).toBeInTheDocument()
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should have clickable drawing links on mobile that navigate correctly', async () => {
      // Set mobile viewport
      mockMobile()

      // Create mock welds
      const mockWelds = createMockWelds(3)

      // Import WeldLogTable component
      const { WeldLogTable } = await import('@/components/weld-log/WeldLogTable')

      // Render component with router context
      render(
        <BrowserRouter>
          <WeldLogTable welds={mockWelds} />
        </BrowserRouter>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('P-1001-A')).toBeInTheDocument()
      })

      // Find drawing link
      const drawingLink = screen.getByRole('link', { name: 'P-1001-A' })

      // Verify link exists and has correct href
      expect(drawingLink).toBeInTheDocument()
      expect(drawingLink).toHaveAttribute('href', '/drawings?expanded=test-drawing-1')
    })

    it('should apply min-h-[44px] to mobile rows for touch targets', async () => {
      // Set mobile viewport
      mockMobile()

      // Create mock welds
      const mockWelds = createMockWelds(3)

      // Import WeldLogTable component
      const { WeldLogTable } = await import('@/components/weld-log/WeldLogTable')

      // Render component with router context
      const { container } = render(
        <BrowserRouter>
          <WeldLogTable welds={mockWelds} />
        </BrowserRouter>
      )

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('P-101 / J-1')).toBeInTheDocument()
      })

      // Find table rows
      const rows = container.querySelectorAll('tbody tr')

      // Verify each row has min-h-[44px] class
      rows.forEach((row) => {
        expect(row.className).toContain('min-h-[44px]')
      })
    })
  })

})
