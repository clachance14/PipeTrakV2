import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MetadataCell } from './MetadataCell'

describe('MetadataCell', () => {
  describe('Inherited state', () => {
    it('shows plain text when values match', () => {
      const value = { id: '1', name: 'A1' }
      render(
        <MetadataCell
          value={value}
          drawingValue={value}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      expect(screen.getByText('A1')).toBeInTheDocument()
      // No amber or blue background
      expect(screen.getByText('A1').closest('div')).not.toHaveClass('bg-amber-50')
      expect(screen.getByText('A1').closest('div')).not.toHaveClass('bg-blue-50')
    })

    it('shows plain text when both values are null', () => {
      render(
        <MetadataCell
          value={null}
          drawingValue={null}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      expect(screen.getByText('—')).toBeInTheDocument()
      expect(screen.getByText('—')).toHaveClass('text-gray-400')
    })

    it('shows dash when component value is null but drawing has value', () => {
      render(
        <MetadataCell
          value={null}
          drawingValue={{ id: '1', name: 'A1' }}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('does not show icon when inherited', () => {
      const value = { id: '1', name: 'A1' }
      render(
        <MetadataCell
          value={value}
          drawingValue={value}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      // No SVG icons present
      const container = screen.getByText('A1').closest('div')
      expect(container?.querySelector('svg')).not.toBeInTheDocument()
    })
  })

  describe('Override state', () => {
    it('shows amber background when values differ', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('A2').closest('div')
      expect(cell).toHaveClass('bg-amber-50')
    })

    it('shows warning triangle icon for override', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      // Icon should be present
      const cell = screen.getByText('A2').closest('div')
      const icon = cell?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('text-amber-600')
    })

    it('displays component value as text', () => {
      const componentValue = { id: '2', name: 'Area B' }
      const drawingValue = { id: '1', name: 'Area A' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      expect(screen.getByText('Area B')).toBeInTheDocument()
      expect(screen.queryByText('Area A')).not.toBeInTheDocument()
    })

    it('shows tooltip with override details on hover', async () => {
      const user = userEvent.setup()
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('A2')
      await user.hover(cell)

      // Tooltip should appear with override details
      const tooltip = await screen.findByRole('tooltip')
      expect(tooltip).toHaveTextContent("Area: A2 (overrides drawing's A1)")
    })

    it('shows tooltip on keyboard focus', async () => {
      const user = userEvent.setup()
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      // Tab to focus the cell
      await user.tab()

      // Tooltip should appear on focus
      const tooltip = await screen.findByRole('tooltip')
      expect(tooltip).toBeInTheDocument()
    })

    it('has correct ARIA label for screen readers', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      const cell = screen.getByRole('status')
      expect(cell).toHaveAttribute(
        'aria-label',
        "Area: A2 (overrides drawing's A1)"
      )
    })

    it('icon is aria-hidden', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      const icon = screen.getByText('A2').closest('div')?.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Assigned state', () => {
    it('shows blue background when component has value but drawing does not', () => {
      const componentValue = { id: '1', name: 'S1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={null}
          fieldName="System"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('S1').closest('div')
      expect(cell).toHaveClass('bg-blue-50')
    })

    it('shows plus circle icon for assigned value', () => {
      const componentValue = { id: '1', name: 'S1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={null}
          fieldName="System"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('S1').closest('div')
      const icon = cell?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('text-blue-600')
    })

    it('shows tooltip with assignment details', async () => {
      const user = userEvent.setup()
      const componentValue = { id: '1', name: 'S1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={null}
          fieldName="System"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('S1')
      await user.hover(cell)

      const tooltip = await screen.findByRole('tooltip')
      expect(tooltip).toHaveTextContent('System: S1 (assigned to component)')
    })
  })

  describe('Accessibility', () => {
    it('is keyboard focusable when override', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('A2').closest('div')
      expect(cell).toHaveAttribute('tabIndex', '0')
    })

    it('is keyboard focusable when assigned', () => {
      const componentValue = { id: '1', name: 'S1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={null}
          fieldName="System"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('S1').closest('div')
      expect(cell).toHaveAttribute('tabIndex', '0')
    })

    it('has visible focus indicator', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      const cell = screen.getByText('A2').closest('div')
      // Check for focus-visible classes
      expect(cell?.className).toMatch(/focus-visible/)
    })

    it('closes tooltip on Escape key', async () => {
      const user = userEvent.setup()
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      // Hover to show tooltip
      await user.hover(screen.getByText('A2'))
      expect(await screen.findByRole('tooltip')).toBeInTheDocument()

      // Press Escape
      await user.keyboard('{Escape}')

      // Tooltip should be gone
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('Mobile behavior', () => {
    it('renders in mobile mode with isMobile prop', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
          isMobile={true}
        />
      )

      // Component should render (exact mobile behavior TBD in implementation)
      expect(screen.getByText('A2')).toBeInTheDocument()
    })

    it('has adequate padding for touch targets', () => {
      const componentValue = { id: '2', name: 'A2' }
      const drawingValue = { id: '1', name: 'A1' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Area"
          componentId="comp-1"
          isMobile={true}
        />
      )

      // Verify cell has padding classes that create adequate touch target
      const cell = screen.getByText('A2').closest('div')
      expect(cell?.className).toMatch(/px-2 py-1/)
    })
  })

  describe('Clickable behavior', () => {
    it('calls onClick when test package value is clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      const value = { id: 'pkg-1', name: 'HT-01' }

      render(
        <MetadataCell
          value={value}
          drawingValue={value}
          fieldName="Test Package"
          componentId="comp-1"
          onClick={handleClick}
        />
      )

      const text = screen.getByText('HT-01')
      await user.click(text)

      expect(handleClick).toHaveBeenCalledWith('pkg-1')
    })

    it('does not make text clickable when onClick is not provided', () => {
      const value = { id: 'pkg-1', name: 'HT-01' }

      render(
        <MetadataCell
          value={value}
          drawingValue={value}
          fieldName="Test Package"
          componentId="comp-1"
        />
      )

      const text = screen.getByText('HT-01')
      expect(text).not.toHaveClass('cursor-pointer')
      expect(text.tagName).toBe('SPAN')
    })

    it('does not make dash clickable when value is null', () => {
      const handleClick = vi.fn()

      render(
        <MetadataCell
          value={null}
          drawingValue={null}
          fieldName="Test Package"
          componentId="comp-1"
          onClick={handleClick}
        />
      )

      const dash = screen.getByText('—')
      expect(dash).not.toHaveClass('cursor-pointer')
    })

    it('applies hover styles to clickable text', () => {
      const handleClick = vi.fn()
      const value = { id: 'pkg-1', name: 'HT-01' }

      render(
        <MetadataCell
          value={value}
          drawingValue={value}
          fieldName="Test Package"
          componentId="comp-1"
          onClick={handleClick}
        />
      )

      const text = screen.getByText('HT-01')
      expect(text).toHaveClass('text-blue-600')
      expect(text).toHaveClass('hover:underline')
      expect(text).toHaveClass('cursor-pointer')
    })

    it('calls onClick on Enter key press', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      const value = { id: 'pkg-1', name: 'HT-01' }

      render(
        <MetadataCell
          value={value}
          drawingValue={value}
          fieldName="Test Package"
          componentId="comp-1"
          onClick={handleClick}
        />
      )

      const text = screen.getByText('HT-01')
      text.focus()
      await user.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalledWith('pkg-1')
    })

    it('calls onClick on Space key press', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      const value = { id: 'pkg-1', name: 'HT-01' }

      render(
        <MetadataCell
          value={value}
          drawingValue={value}
          fieldName="Test Package"
          componentId="comp-1"
          onClick={handleClick}
        />
      )

      const text = screen.getByText('HT-01')
      text.focus()
      await user.keyboard(' ')

      expect(handleClick).toHaveBeenCalledWith('pkg-1')
    })

    it('makes override state clickable when onClick provided', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      const componentValue = { id: 'pkg-2', name: 'PN-01' }
      const drawingValue = { id: 'pkg-1', name: 'HT-01' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={drawingValue}
          fieldName="Test Package"
          componentId="comp-1"
          onClick={handleClick}
        />
      )

      const text = screen.getByText('PN-01')
      await user.click(text)

      expect(handleClick).toHaveBeenCalledWith('pkg-2')
    })

    it('makes assigned state clickable when onClick provided', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      const componentValue = { id: 'pkg-1', name: 'HT-01' }

      render(
        <MetadataCell
          value={componentValue}
          drawingValue={null}
          fieldName="Test Package"
          componentId="comp-1"
          onClick={handleClick}
        />
      )

      const text = screen.getByText('HT-01')
      await user.click(text)

      expect(handleClick).toHaveBeenCalledWith('pkg-1')
    })
  })

  describe('Edge cases', () => {
    it('handles undefined values same as null', () => {
      render(
        <MetadataCell
          value={undefined as any}
          drawingValue={undefined as any}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('truncates long metadata names with ellipsis', () => {
      const longValue = {
        id: '1',
        name: 'Very Long Test Package Name That Should Be Truncated'
      }

      render(
        <MetadataCell
          value={longValue}
          drawingValue={null}
          fieldName="Test Package"
          componentId="comp-1"
        />
      )

      // Check the span element (not container div) for truncate class
      const textElement = screen.getByText(longValue.name)
      expect(textElement.className).toMatch(/truncate/)
    })

    it('handles rapid state changes without flickering', async () => {
      const { rerender } = render(
        <MetadataCell
          value={{ id: '1', name: 'A1' }}
          drawingValue={{ id: '1', name: 'A1' }}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      // Change to override
      rerender(
        <MetadataCell
          value={{ id: '2', name: 'A2' }}
          drawingValue={{ id: '1', name: 'A1' }}
          fieldName="Area"
          componentId="comp-1"
        />
      )

      // Should immediately show override styling
      const cell = screen.getByText('A2').closest('div')
      expect(cell).toHaveClass('bg-amber-50')
    })
  })
})
