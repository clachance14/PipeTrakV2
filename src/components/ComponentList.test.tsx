import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComponentList } from './ComponentList'

describe('ComponentList', () => {
  const mockComponents = [
    {
      id: '1',
      identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 },
      percent_complete: 50,
      component_type: 'spool',
      project_id: 'proj-1',
      created_at: '2025-01-01',
      last_updated_at: '2025-01-01',
      is_retired: false,
      current_milestones: {},
      drawing_id: null,
      last_updated_by: null,
    },
  ]

  it('renders sortable column headers', () => {
    const onSort = vi.fn()

    render(
      <ComponentList
        components={mockComponents}
        sortField="identity_key"
        sortDirection="asc"
        onSort={onSort}
      />
    )

    expect(screen.getByRole('button', { name: /component/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /progress/i })).toBeInTheDocument()
  })
})
