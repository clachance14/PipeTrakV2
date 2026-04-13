/**
 * AddComponentModal Component Tests
 *
 * Feature: 035 - AI Drawing Import
 * Task: T011 - AddComponentModal
 *
 * Tests for the modal dialog that allows users to manually add
 * components with type-adaptive form fields.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AddComponentModal } from './AddComponentModal'
import type { AddComponentModalProps, CreateManualComponentData } from './AddComponentModal'
import { COMPONENT_TYPE_LABELS } from '@/types/drawing-table.types'

// Helper to build default props
function makeProps(
  overrides: Partial<AddComponentModalProps> = {}
): AddComponentModalProps {
  return {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    ...overrides,
  }
}

describe('AddComponentModal', () => {
  describe('Type dropdown', () => {
    it('renders type dropdown with all component types', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps()} />)

      // Dialog title
      expect(screen.getByText('Add Component')).toBeInTheDocument()

      // Open the type dropdown
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // All types should be listed
      for (const label of Object.values(COMPONENT_TYPE_LABELS)) {
        expect(screen.getByRole('option', { name: label })).toBeInTheDocument()
      }
    })
  })

  describe('Type-specific form fields', () => {
    it('shows commodity_code, size, quantity fields after selecting Valve', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps()} />)

      // Select Valve type
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Valve' }))

      // Should show commodity code, size, quantity
      expect(screen.getByLabelText(/commodity code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()

      // Should NOT show pipe/spool/weld fields
      expect(screen.queryByLabelText(/total linear feet/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/spool id/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/weld number/i)).not.toBeInTheDocument()
    })

    it('shows commodity_code, size, total_linear_feet fields after selecting Pipe', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps()} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Pipe' }))

      // Should show commodity code, size, total linear feet
      expect(screen.getByLabelText(/commodity code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/total linear feet/i)).toBeInTheDocument()

      // Should NOT show quantity, spool, weld fields
      expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/spool id/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/weld number/i)).not.toBeInTheDocument()
    })

    it('shows spool_id field after selecting Spool', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps()} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Spool' }))

      expect(screen.getByLabelText(/spool id/i)).toBeInTheDocument()

      // Should NOT show other type-specific fields
      expect(screen.queryByLabelText(/commodity code/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/size/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/weld number/i)).not.toBeInTheDocument()
    })

    it('shows weld_number field after selecting Field Weld', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps()} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Field Weld' }))

      expect(screen.getByLabelText(/weld number/i)).toBeInTheDocument()

      // Should NOT show other type-specific fields
      expect(screen.queryByLabelText(/commodity code/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/size/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/spool id/i)).not.toBeInTheDocument()
    })
  })

  describe('Validation and submit button', () => {
    it('submit button disabled when no type selected', () => {
      render(<AddComponentModal {...makeProps()} />)

      const submitButton = screen.getByRole('button', { name: /create component/i })
      expect(submitButton).toBeDisabled()
    })

    it('submit button disabled until required fields are filled for Valve', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps()} />)

      // Select Valve
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Valve' }))

      const submitButton = screen.getByRole('button', { name: /create component/i })

      // Still disabled — required fields empty
      expect(submitButton).toBeDisabled()

      // Fill commodity code
      await user.type(screen.getByLabelText(/commodity code/i), 'VBALU')
      expect(submitButton).toBeDisabled()

      // Fill size
      await user.type(screen.getByLabelText(/size/i), '2')

      // Quantity defaults to 1, so now all required fields are filled
      expect(submitButton).not.toBeDisabled()
    })

    it('submit button disabled when isSubmitting is true', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps({ isSubmitting: true })} />)

      // Select a type and fill fields
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Spool' }))
      await user.type(screen.getByLabelText(/spool id/i), 'SP-001')

      const submitButton = screen.getByRole('button', { name: /create component/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Submit calls onSubmit with correct payload', () => {
    it('submits Valve data correctly', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<AddComponentModal {...makeProps({ onSubmit })} />)

      // Select Valve
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Valve' }))

      // Fill required fields
      await user.type(screen.getByLabelText(/commodity code/i), 'VBALU')
      await user.type(screen.getByLabelText(/size/i), '2')

      // Fill optional description
      await user.type(screen.getByLabelText(/description/i), 'Ball valve')

      // Change quantity from default 1 to 3
      const qtyInput = screen.getByLabelText(/quantity/i)
      await user.clear(qtyInput)
      await user.type(qtyInput, '3')

      // Submit
      await user.click(screen.getByRole('button', { name: /create component/i }))

      expect(onSubmit).toHaveBeenCalledOnce()
      const data: CreateManualComponentData = onSubmit.mock.calls[0][0]
      expect(data.component_type).toBe('valve')
      expect(data.commodity_code).toBe('VBALU')
      expect(data.size).toBe('2')
      expect(data.quantity).toBe(3)
      expect(data.description).toBe('Ball valve')
      expect(data.total_linear_feet).toBeUndefined()
      expect(data.spool_id).toBeUndefined()
      expect(data.weld_number).toBeUndefined()
    })

    it('submits Pipe data with total_linear_feet', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<AddComponentModal {...makeProps({ onSubmit })} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Pipe' }))

      await user.type(screen.getByLabelText(/commodity code/i), 'CS')
      await user.type(screen.getByLabelText(/size/i), '4')
      await user.type(screen.getByLabelText(/total linear feet/i), '150')

      await user.click(screen.getByRole('button', { name: /create component/i }))

      expect(onSubmit).toHaveBeenCalledOnce()
      const data: CreateManualComponentData = onSubmit.mock.calls[0][0]
      expect(data.component_type).toBe('pipe')
      expect(data.commodity_code).toBe('CS')
      expect(data.size).toBe('4')
      expect(data.total_linear_feet).toBe(150)
      expect(data.quantity).toBeUndefined()
    })

    it('submits Spool data with spool_id', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<AddComponentModal {...makeProps({ onSubmit })} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Spool' }))

      await user.type(screen.getByLabelText(/spool id/i), 'SP-001')

      await user.click(screen.getByRole('button', { name: /create component/i }))

      expect(onSubmit).toHaveBeenCalledOnce()
      const data: CreateManualComponentData = onSubmit.mock.calls[0][0]
      expect(data.component_type).toBe('spool')
      expect(data.spool_id).toBe('SP-001')
    })

    it('submits Field Weld data with weld_number', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<AddComponentModal {...makeProps({ onSubmit })} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Field Weld' }))

      await user.type(screen.getByLabelText(/weld number/i), 'FW-42')

      await user.click(screen.getByRole('button', { name: /create component/i }))

      expect(onSubmit).toHaveBeenCalledOnce()
      const data: CreateManualComponentData = onSubmit.mock.calls[0][0]
      expect(data.component_type).toBe('field_weld')
      expect(data.weld_number).toBe('FW-42')
    })
  })

  describe('Cancel', () => {
    it('cancel button calls onClose', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<AddComponentModal {...makeProps({ onClose })} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('Form reset', () => {
    it('description field is shown for all types', async () => {
      const user = userEvent.setup()
      render(<AddComponentModal {...makeProps()} />)

      // No type selected - description should not be shown yet (only shown after type selection)
      // Select a type
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Valve' }))
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()

      // Change to a different type
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Spool' }))
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()

      // Change to Field Weld
      await user.click(combobox)
      await user.click(screen.getByRole('option', { name: 'Field Weld' }))
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })
})
