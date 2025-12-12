/**
 * ComponentRow component tests
 * Tests rendering of different component types with various identity_key structures
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComponentRow } from './ComponentRow'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row']

// Default visible columns for testing
const defaultVisibleColumns = [
  'selection',
  'identity_key',
  'component_type',
  'percent_complete',
  'milestones',
  'area',
  'system',
  'test_package',
  'drawing',
  'actions',
]

// Default props required by ComponentRow
const defaultRowProps = {
  visibleColumns: defaultVisibleColumns,
  isSelected: false,
  onSelectionChange: vi.fn(),
  onView: vi.fn(),
}

describe('ComponentRow', () => {
  const baseStyle = { position: 'absolute' as const, top: 0, left: 0, width: '100%' }

  describe('identity_key rendering', () => {
    it('renders spool with spool_id', () => {
      const component: Component & { drawing?: any; area?: any; system?: any; test_package?: any } = {
        id: '123',
        project_id: 'proj-1',
        drawing_id: null,
        component_type: 'spool',
        identity_key: { spool_id: 'SP-002' },
        current_milestones: {},
        percent_complete: 0,
        created_at: '2025-01-01T00:00:00Z',
        last_updated_at: '2025-01-01T00:00:00Z',
        last_updated_by: null,
        is_retired: false,
        area_id: null,
        system_id: null,
        test_package_id: null,
      }

      render(<ComponentRow component={component} style={baseStyle} {...defaultRowProps} />)

      // Should display the spool_id
      expect(screen.getByText('SP-002')).toBeInTheDocument()
      expect(screen.getByText('Spool')).toBeInTheDocument()
    })

    it('renders field_weld with weld_number', () => {
      const component: Component & { drawing?: any; area?: any; system?: any; test_package?: any } = {
        id: '456',
        project_id: 'proj-1',
        drawing_id: null,
        component_type: 'field_weld',
        identity_key: { weld_number: 'W-008' },
        current_milestones: {},
        percent_complete: 0,
        created_at: '2025-01-01T00:00:00Z',
        last_updated_at: '2025-01-01T00:00:00Z',
        last_updated_by: null,
        is_retired: false,
        area_id: null,
        system_id: null,
        test_package_id: null,
      }

      render(<ComponentRow component={component} style={baseStyle} {...defaultRowProps} />)

      // Should display the weld_number
      expect(screen.getByText('W-008')).toBeInTheDocument()
      expect(screen.getByText('Field Weld')).toBeInTheDocument()
    })

    it('renders valve with commodity_code format', () => {
      const component: Component & { drawing?: any; area?: any; system?: any; test_package?: any } = {
        id: '789',
        project_id: 'proj-1',
        drawing_id: null,
        component_type: 'valve',
        identity_key: {
          commodity_code: 'VBALU-001',
          size: '2',
          seq: 1,
          drawing_norm: 'P-001'
        },
        current_milestones: {},
        percent_complete: 0,
        created_at: '2025-01-01T00:00:00Z',
        last_updated_at: '2025-01-01T00:00:00Z',
        last_updated_by: null,
        is_retired: false,
        area_id: null,
        system_id: null,
        test_package_id: null,
      }

      render(<ComponentRow component={component} style={baseStyle} {...defaultRowProps} />)

      // Should display formatted commodity_code
      expect(screen.getByText(/VBALU-001/)).toBeInTheDocument()
      expect(screen.getByText('Valve')).toBeInTheDocument()
    })
  })

  describe('progress display', () => {
    it('displays progress percentage', () => {
      const component: Component & { drawing?: any; area?: any; system?: any; test_package?: any } = {
        id: '123',
        project_id: 'proj-1',
        drawing_id: null,
        component_type: 'spool',
        identity_key: { spool_id: 'SP-001' },
        current_milestones: {},
        percent_complete: 45.5,
        created_at: '2025-01-01T00:00:00Z',
        last_updated_at: '2025-01-01T00:00:00Z',
        last_updated_by: null,
        is_retired: false,
        area_id: null,
        system_id: null,
        test_package_id: null,
      }

      render(<ComponentRow component={component} style={baseStyle} {...defaultRowProps} />)

      expect(screen.getByText('45.5%')).toBeInTheDocument()
    })
  })
})
