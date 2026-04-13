/**
 * ComponentEditTab Component Tests
 *
 * Feature: 035 - AI Drawing Import
 * Task: T009 - ComponentEditTab
 *
 * Tests for the edit tab that allows privileged users to reclassify,
 * edit identity/attributes, and delete components.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ComponentEditTab } from './ComponentEditTab'
import type { ComponentEditTabProps, ComponentEditChanges } from './ComponentEditTab'

// Helper to build default props
function makeProps(
  overrides: Partial<ComponentEditTabProps> = {}
): ComponentEditTabProps {
  return {
    component: {
      id: 'comp-1',
      component_type: 'valve',
      identity_key: { commodity_code: 'VBALU', size: '2', drawing_norm: 'DWG-001', seq: 1 },
      attributes: { description: 'Ball valve', item_number: 'ITM-100' },
      percent_complete: 0,
    },
    siblingCount: 1,
    hasProgress: false,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onCancel: vi.fn(),
    isSaving: false,
    ...overrides,
  }
}

describe('ComponentEditTab', () => {
  describe('Classification section', () => {
    it('renders classification dropdown with current type selected', async () => {
      const user = userEvent.setup()
      render(<ComponentEditTab {...makeProps()} />)

      expect(screen.getByText('Classification')).toBeInTheDocument()

      // The Select trigger should show the current type label
      const combobox = screen.getByRole('combobox')
      expect(combobox).toBeInTheDocument()

      // Open the dropdown to verify current value
      await user.click(combobox)

      // All type options should be available
      expect(screen.getAllByText('Valve').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Spool').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Field Weld').length).toBeGreaterThan(0)
    })

    it('shows "Locked — has progress" badge and disables select when hasProgress=true', () => {
      render(<ComponentEditTab {...makeProps({ hasProgress: true })} />)

      expect(screen.getByText(/locked/i)).toBeInTheDocument()
      expect(screen.getByText(/has progress/i)).toBeInTheDocument()

      const combobox = screen.getByRole('combobox')
      expect(combobox).toBeDisabled()
    })

    it('shows "Editable" badge and enables select when hasProgress=false', () => {
      render(<ComponentEditTab {...makeProps({ hasProgress: false })} />)

      expect(screen.getByText('Editable')).toBeInTheDocument()

      const combobox = screen.getByRole('combobox')
      expect(combobox).not.toBeDisabled()
    })
  })

  describe('Identity section', () => {
    it('renders commodity_code and size for valve type', () => {
      render(<ComponentEditTab {...makeProps()} />)

      expect(screen.getByText('Identity')).toBeInTheDocument()
      expect(screen.getByLabelText(/commodity code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/size/i)).toBeInTheDocument()

      expect(screen.getByLabelText(/commodity code/i)).toHaveValue('VBALU')
      expect(screen.getByLabelText(/size/i)).toHaveValue('2')
    })

    it('renders spool_id for spool type', () => {
      render(
        <ComponentEditTab
          {...makeProps({
            component: {
              id: 'comp-2',
              component_type: 'spool',
              identity_key: { spool_id: 'SP-001' },
              attributes: null,
              percent_complete: 0,
            },
          })}
        />
      )

      expect(screen.getByLabelText(/spool id/i)).toHaveValue('SP-001')
    })

    it('renders weld_number for field_weld type', () => {
      render(
        <ComponentEditTab
          {...makeProps({
            component: {
              id: 'comp-3',
              component_type: 'field_weld',
              identity_key: { weld_number: 'FW-42' },
              attributes: null,
              percent_complete: 0,
            },
          })}
        />
      )

      expect(screen.getByLabelText(/weld number/i)).toHaveValue('FW-42')
    })
  })

  describe('Attributes section', () => {
    it('renders description and item_number inputs', () => {
      render(<ComponentEditTab {...makeProps()} />)

      expect(screen.getByText('Attributes')).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toHaveValue('Ball valve')
      expect(screen.getByLabelText(/item number/i)).toHaveValue('ITM-100')
    })

    it('renders quantity for exploded (non-aggregate, non-unique-id) types', () => {
      render(
        <ComponentEditTab
          {...makeProps({
            component: {
              id: 'comp-4',
              component_type: 'valve',
              identity_key: { commodity_code: 'VBALU', size: '2', drawing_norm: 'DWG-001', seq: 1 },
              attributes: { description: 'Ball valve', item_number: 'ITM-100', quantity: 5 },
              percent_complete: 0,
            },
          })}
        />
      )

      expect(screen.getByLabelText(/quantity/i)).toHaveValue(5)
    })

    it('renders total linear feet for aggregate types (pipe)', () => {
      render(
        <ComponentEditTab
          {...makeProps({
            component: {
              id: 'comp-5',
              component_type: 'pipe',
              identity_key: { pipe_id: 'DWG-001-2-CS-AGG' },
              attributes: { total_linear_feet: 150 },
              percent_complete: 0,
            },
          })}
        />
      )

      expect(screen.getByLabelText(/total linear feet/i)).toHaveValue(150)
    })
  })

  describe('Sibling count', () => {
    it('shows sibling count message when > 1', () => {
      render(<ComponentEditTab {...makeProps({ siblingCount: 4 })} />)

      expect(screen.getByText(/editing 4 components/i)).toBeInTheDocument()
    })

    it('does not show sibling count message when <= 1', () => {
      render(<ComponentEditTab {...makeProps({ siblingCount: 1 })} />)

      expect(screen.queryByText(/editing.*components/i)).not.toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('delete button calls onDelete', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      render(<ComponentEditTab {...makeProps({ onDelete })} />)

      await user.click(screen.getByRole('button', { name: /delete component/i }))
      expect(onDelete).toHaveBeenCalledOnce()
    })

    it('cancel button calls onCancel', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<ComponentEditTab {...makeProps({ onCancel })} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('save button disabled when no changes made', () => {
      render(<ComponentEditTab {...makeProps()} />)

      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })

    it('save button disabled when isSaving=true', () => {
      render(<ComponentEditTab {...makeProps({ isSaving: true })} />)

      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })

    it('save button calls onSave with identity changes', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(<ComponentEditTab {...makeProps({ onSave })} />)

      const commodityInput = screen.getByLabelText(/commodity code/i)
      await user.clear(commodityInput)
      await user.type(commodityInput, 'VCHK')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).not.toBeDisabled()
      await user.click(saveButton)

      expect(onSave).toHaveBeenCalledOnce()
      const changes: ComponentEditChanges = onSave.mock.calls[0][0]
      expect(changes.identityChanges).toEqual({ commodity_code: 'VCHK' })
      expect(changes.newType).toBeUndefined()
    })

    it('save button calls onSave with attribute changes', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(<ComponentEditTab {...makeProps({ onSave })} />)

      const descInput = screen.getByLabelText(/description/i)
      await user.clear(descInput)
      await user.type(descInput, 'Check valve')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      expect(onSave).toHaveBeenCalledOnce()
      const changes: ComponentEditChanges = onSave.mock.calls[0][0]
      expect(changes.attributeChanges).toEqual({ description: 'Check valve' })
      expect(changes.identityChanges).toEqual({})
    })

    it('save button calls onSave with newType when classification changed', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(<ComponentEditTab {...makeProps({ onSave })} />)

      // Open the classification dropdown
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // Select "Fitting"
      const fittingOptions = screen.getAllByText('Fitting')
      await user.click(fittingOptions[fittingOptions.length - 1])

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      expect(onSave).toHaveBeenCalledOnce()
      const changes: ComponentEditChanges = onSave.mock.calls[0][0]
      expect(changes.newType).toBe('fitting')
    })
  })
})
