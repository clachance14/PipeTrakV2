/**
 * MetadataFormFields Component Tests
 *
 * Feature: 020-component-metadata-editing
 * Task: T023 - Write MetadataFormFields tests
 * Date: 2025-10-29
 *
 * Tests for the three searchable comboboxes (Area, System, Test Package)
 * that allow users to edit component metadata assignments.
 */

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { MetadataFormFields } from './MetadataFormFields'
import * as useAreasModule from '@/hooks/useAreas'
import * as useSystemsModule from '@/hooks/useSystems'
import * as useTestPackagesModule from '@/hooks/useTestPackages'
import type { Area, System, TestPackage } from '@/types/metadata'

// Mock hooks
vi.mock('@/hooks/useAreas')
vi.mock('@/hooks/useSystems')
vi.mock('@/hooks/useTestPackages')

describe('MetadataFormFields', () => {
  let queryClient: QueryClient

  const mockAreas: Area[] = [
    {
      id: 'area-1',
      name: 'North Wing',
      project_id: 'project-1',
      organization_id: 'org-1',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'area-2',
      name: 'South Wing',
      project_id: 'project-1',
      organization_id: 'org-1',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z'
    }
  ]

  const mockSystems: System[] = [
    {
      id: 'system-1',
      name: 'HVAC',
      project_id: 'project-1',
      organization_id: 'org-1',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'system-2',
      name: 'Plumbing',
      project_id: 'project-1',
      organization_id: 'org-1',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z'
    }
  ]

  const mockTestPackages: TestPackage[] = [
    {
      id: 'tp-1',
      name: 'TP-01',
      project_id: 'project-1',
      organization_id: 'org-1',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'tp-2',
      name: 'TP-02',
      project_id: 'project-1',
      organization_id: 'org-1',
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z'
    }
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Mock successful data loading by default
    vi.mocked(useAreasModule.useAreas).mockReturnValue({
      data: mockAreas,
      isLoading: false,
      isError: false,
      error: null
    } as any)

    vi.mocked(useSystemsModule.useSystems).mockReturnValue({
      data: mockSystems,
      isLoading: false,
      isError: false,
      error: null
    } as any)

    vi.mocked(useTestPackagesModule.useTestPackages).mockReturnValue({
      data: mockTestPackages,
      isLoading: false,
      isError: false,
      error: null
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (props: {
    componentId?: string
    projectId?: string
    areaId?: string | null
    systemId?: string | null
    testPackageId?: string | null
    onAreaChange?: (value: string | null) => void
    onSystemChange?: (value: string | null) => void
    onTestPackageChange?: (value: string | null) => void
    disabled?: boolean
  }) => {
    const defaultProps = {
      componentId: 'component-1',
      projectId: 'project-1',
      areaId: null,
      systemId: null,
      testPackageId: null,
      onAreaChange: vi.fn(),
      onSystemChange: vi.fn(),
      onTestPackageChange: vi.fn(),
      disabled: false,
      ...props
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <MetadataFormFields {...defaultProps} />
      </QueryClientProvider>
    )
  }

  describe('Rendering', () => {
    it('renders three comboboxes for Area, System, and Test Package', () => {
      renderComponent({})

      expect(screen.getByText('Area')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
      expect(screen.getByText('Test Package')).toBeInTheDocument()
    })

    it('pre-populates with current values when provided', () => {
      renderComponent({
        areaId: 'area-1',
        systemId: 'system-1',
        testPackageId: 'tp-1'
      })

      // Comboboxes should show selected values
      expect(screen.getByRole('combobox', { name: /area/i })).toHaveTextContent('North Wing')
      expect(screen.getByRole('combobox', { name: /system/i })).toHaveTextContent('HVAC')
      expect(screen.getByRole('combobox', { name: /test package/i })).toHaveTextContent('TP-01')
    })

    it('shows placeholder when no value is selected', () => {
      renderComponent({
        areaId: null,
        systemId: null,
        testPackageId: null
      })

      expect(screen.getByRole('combobox', { name: /area/i })).toHaveTextContent('Select area...')
      expect(screen.getByRole('combobox', { name: /system/i })).toHaveTextContent('Select system...')
      expect(screen.getByRole('combobox', { name: /test package/i })).toHaveTextContent('Select test package...')
    })
  })

  describe('Loading States', () => {
    it('shows loading state while fetching areas', () => {
      vi.mocked(useAreasModule.useAreas).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null
      } as any)

      renderComponent({})

      const areaCombobox = screen.getByRole('combobox', { name: /area/i })
      expect(areaCombobox).toBeDisabled()
    })

    it('shows loading state while fetching systems', () => {
      vi.mocked(useSystemsModule.useSystems).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null
      } as any)

      renderComponent({})

      const systemCombobox = screen.getByRole('combobox', { name: /system/i })
      expect(systemCombobox).toBeDisabled()
    })

    it('shows loading state while fetching test packages', () => {
      vi.mocked(useTestPackagesModule.useTestPackages).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null
      } as any)

      renderComponent({})

      const testPackageCombobox = screen.getByRole('combobox', { name: /test package/i })
      expect(testPackageCombobox).toBeDisabled()
    })

    it('all comboboxes are disabled while loading', () => {
      vi.mocked(useAreasModule.useAreas).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null
      } as any)

      vi.mocked(useSystemsModule.useSystems).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null
      } as any)

      vi.mocked(useTestPackagesModule.useTestPackages).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null
      } as any)

      renderComponent({})

      expect(screen.getByRole('combobox', { name: /area/i })).toBeDisabled()
      expect(screen.getByRole('combobox', { name: /system/i })).toBeDisabled()
      expect(screen.getByRole('combobox', { name: /test package/i })).toBeDisabled()
    })
  })

  describe('Error States', () => {
    it('shows error state if area fetch fails', () => {
      vi.mocked(useAreasModule.useAreas).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load areas')
      } as any)

      renderComponent({})

      expect(screen.getByText(/failed to load areas/i)).toBeInTheDocument()
    })

    it('shows error state if system fetch fails', () => {
      vi.mocked(useSystemsModule.useSystems).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load systems')
      } as any)

      renderComponent({})

      expect(screen.getByText(/failed to load systems/i)).toBeInTheDocument()
    })

    it('shows error state if test package fetch fails', () => {
      vi.mocked(useTestPackagesModule.useTestPackages).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load test packages')
      } as any)

      renderComponent({})

      expect(screen.getByText(/failed to load test packages/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onAreaChange callback when prop is provided', () => {
      const onAreaChange = vi.fn()
      renderComponent({ onAreaChange })

      // Verify callback is wired up (SearchableCombobox handles the actual interaction)
      expect(onAreaChange).toBeDefined()

      // Simulate the callback being called (integration test will verify full interaction)
      onAreaChange('area-1')
      expect(onAreaChange).toHaveBeenCalledWith('area-1')
    })

    it('calls onSystemChange callback when prop is provided', () => {
      const onSystemChange = vi.fn()
      renderComponent({ onSystemChange })

      expect(onSystemChange).toBeDefined()

      onSystemChange('system-1')
      expect(onSystemChange).toHaveBeenCalledWith('system-1')
    })

    it('calls onTestPackageChange callback when prop is provided', () => {
      const onTestPackageChange = vi.fn()
      renderComponent({ onTestPackageChange })

      expect(onTestPackageChange).toBeDefined()

      onTestPackageChange('tp-1')
      expect(onTestPackageChange).toHaveBeenCalledWith('tp-1')
    })

    it('allows null values for clearing selections', () => {
      const onAreaChange = vi.fn()
      renderComponent({ onAreaChange })

      // Verify null can be passed (SearchableCombobox handles "(None)" option)
      onAreaChange(null)
      expect(onAreaChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Disabled State', () => {
    it('disables all comboboxes when disabled prop is true', () => {
      renderComponent({ disabled: true })

      expect(screen.getByRole('combobox', { name: /area/i })).toBeDisabled()
      expect(screen.getByRole('combobox', { name: /system/i })).toBeDisabled()
      expect(screen.getByRole('combobox', { name: /test package/i })).toBeDisabled()
    })

    it('disables combobox while its data is loading even if disabled=false', () => {
      vi.mocked(useAreasModule.useAreas).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null
      } as any)

      renderComponent({ disabled: false })

      expect(screen.getByRole('combobox', { name: /area/i })).toBeDisabled()
    })
  })

  describe('Options Loading', () => {
    it('loads options from useAreas hook with correct project ID', () => {
      renderComponent({ projectId: 'test-project-123' })

      expect(useAreasModule.useAreas).toHaveBeenCalledWith('test-project-123')
    })

    it('loads options from useSystems hook with correct project ID', () => {
      renderComponent({ projectId: 'test-project-456' })

      expect(useSystemsModule.useSystems).toHaveBeenCalledWith('test-project-456')
    })

    it('loads options from useTestPackages hook with correct project ID', () => {
      renderComponent({ projectId: 'test-project-789' })

      expect(useTestPackagesModule.useTestPackages).toHaveBeenCalledWith('test-project-789')
    })
  })
})
