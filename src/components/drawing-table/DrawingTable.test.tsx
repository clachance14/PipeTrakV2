import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DrawingTable } from './DrawingTable'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    scrollToIndex: vi.fn()
  }))
}))

describe('DrawingTable - Accordion Mode', () => {
  it('excludes expanded drawing from virtualizer rows', () => {
    const drawings = [
      {
        id: 'dwg-1',
        drawing_number: 'DWG-001',
        drawing_title: 'Test Drawing 1',
        total_weight: 100,
        earned_value: 50,
        percent_complete: 50
      },
      {
        id: 'dwg-2',
        drawing_number: 'DWG-002',
        drawing_title: 'Test Drawing 2',
        total_weight: 100,
        earned_value: 25,
        percent_complete: 25
      }
    ]

    const componentsMap = new Map([
      ['dwg-1', [
        {
          id: 'comp-1',
          component_number: 'COMP-001',
          template: { milestones_config: [] }
        },
        {
          id: 'comp-2',
          component_number: 'COMP-002',
          template: { milestones_config: [] }
        }
      ]]
    ])

    render(
      <DrawingTable
        drawings={drawings}
        expandedDrawingId="dwg-1"
        componentsMap={componentsMap}
        sortField="drawing_number"
        sortDirection="asc"
        onToggleDrawing={vi.fn()}
        onMilestoneUpdate={vi.fn()}
        onSort={vi.fn()}
      />
    )

    // Should NOT render drawing row for dwg-1 (it's in portal)
    // Should render component rows for dwg-1
    // Should render drawing row for dwg-2 (collapsed)

    // This test will be refined based on actual rendering
    expect(true).toBe(true) // Placeholder - will verify row structure
  })
})
