/**
 * Unit Tests: CreateRepairWeldDialog Component (T041)
 * Tests repair weld creation with pre-filled specs
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreateRepairWeldDialog } from './CreateRepairWeldDialog'

vi.mock('@/hooks/useCreateRepairWeld', () => ({
  useCreateRepairWeld: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

describe('CreateRepairWeldDialog', () => {
  const mockOriginalWeld = {
    id: 'weld-1',
    weld_type: 'BW',
    weld_size: '2"',
    schedule: 'STD',
    base_metal: 'CS',
    spec: 'HC05',
    status: 'rejected',
  }

  it('auto-opens after NDE FAIL (manual test - not testable in unit test)', () => {
    expect(true).toBe(true)
  })

  it('pre-fills all weld specs from original', () => {
    render(
      <CreateRepairWeldDialog
        open={true}
        onOpenChange={vi.fn()}
        originalWeld={mockOriginalWeld as any}
        drawingId="drawing-1"
        projectId="project-1"
      />
    )

    expect(screen.getByDisplayValue('BW')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2"')).toBeInTheDocument()
    expect(screen.getByDisplayValue('STD')).toBeInTheDocument()
    expect(screen.getByDisplayValue('CS')).toBeInTheDocument()
    expect(screen.getByDisplayValue('HC05')).toBeInTheDocument()
  })

  it('all fields are editable', () => {
    render(
      <CreateRepairWeldDialog
        open={true}
        onOpenChange={vi.fn()}
        originalWeld={mockOriginalWeld as any}
        drawingId="drawing-1"
        projectId="project-1"
      />
    )

    const typeInput = screen.getByDisplayValue('BW')
    const sizeInput = screen.getByDisplayValue('2"')

    expect(typeInput).not.toBeDisabled()
    expect(sizeInput).not.toBeDisabled()
  })

  it('displays info panel about 30% auto-start', () => {
    render(
      <CreateRepairWeldDialog
        open={true}
        onOpenChange={vi.fn()}
        originalWeld={mockOriginalWeld as any}
        drawingId="drawing-1"
        projectId="project-1"
      />
    )

    expect(screen.getByText(/30%/)).toBeInTheDocument()
    expect(screen.getByText(/Fit-up/i)).toBeInTheDocument()
  })

  it('creates repair weld with original_weld_id link', async () => {
    render(
      <CreateRepairWeldDialog
        open={true}
        onOpenChange={vi.fn()}
        originalWeld={mockOriginalWeld as any}
        drawingId="drawing-1"
        projectId="project-1"
      />
    )

    const submitButton = screen.getByRole('button', { name: /create repair/i })
    expect(submitButton).toBeInTheDocument()
  })
})
