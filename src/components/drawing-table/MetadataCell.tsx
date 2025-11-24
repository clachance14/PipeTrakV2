import { AlertTriangle, PlusCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Metadata value type matching database schema
 */
type MetadataValue = {
  id: string
  name: string
} | null | undefined

/**
 * Props for MetadataCell component
 */
export interface MetadataCellProps {
  /** Current value from component */
  value: MetadataValue

  /** Parent drawing's value for comparison */
  drawingValue: MetadataValue

  /** Field name for tooltip messages */
  fieldName: 'Area' | 'System' | 'Test Package'

  /** Component ID for potential click handling */
  componentId: string

  /** Mobile layout flag */
  isMobile?: boolean

  /** Optional click handler - receives value ID when clicked */
  onClick?: (id: string) => void
}

/**
 * State of metadata relative to drawing
 */
type MetadataState = 'inherited' | 'override' | 'assigned'

/**
 * Determine metadata state by comparing component and drawing values
 */
const getMetadataState = (
  value: MetadataValue,
  drawingValue: MetadataValue
): MetadataState => {
  // Both null/undefined = inherited
  if (!value && !drawingValue) return 'inherited'

  // Component has value, drawing doesn't = assigned
  if (value && !drawingValue) return 'assigned'

  // Both have values but IDs differ = override
  if (value && drawingValue && value.id !== drawingValue.id) return 'override'

  // Values match = inherited
  return 'inherited'
}

/**
 * MetadataCell displays component metadata with visual indicators
 * when values differ from or extend the parent drawing's metadata.
 *
 * States:
 * - Inherited: Value matches drawing (no special styling)
 * - Override: Value differs from drawing (amber background + warning icon)
 * - Assigned: Component has value, drawing doesn't (blue background + plus icon)
 *
 * Accessibility:
 * - Keyboard focusable with tabIndex={0}
 * - Tooltip on hover/focus
 * - ARIA labels for screen readers
 * - WCAG 2.1 AA compliant color contrast
 */
export const MetadataCell = ({
  value,
  drawingValue,
  fieldName,
  componentId: _componentId,
  isMobile: _isMobile = false,
  onClick,
}: MetadataCellProps) => {
  const state = getMetadataState(value, drawingValue)

  // Helper to make text clickable
  const makeClickable = (text: string, id: string) => {
    if (!onClick) {
      return text
    }

    const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation()
      if ('key' in e && e.key !== 'Enter' && e.key !== ' ') {
        return
      }
      if ('key' in e && e.key === ' ') {
        e.preventDefault()
      }
      onClick(id)
    }

    return (
      <span
        className="text-blue-600 hover:underline cursor-pointer"
        onClick={handleClick}
        onKeyDown={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`Navigate to ${fieldName}: ${text}`}
      >
        {text}
      </span>
    )
  }

  // No value: show dash (keep consistent padding for alignment)
  if (!value) {
    return <span className="inline-block px-2 py-1 text-gray-400">—</span>
  }

  // Inherited: plain text (no special styling, but keep consistent padding for alignment)
  if (state === 'inherited') {
    return (
      <span className="inline-block px-2 py-1">
        {makeClickable(value.name, value.id)}
      </span>
    )
  }

  // Override: inline warning icon without background
  if (state === 'override') {
    const tooltipContent = `${fieldName}: ${value.name} (overrides drawing's ${drawingValue?.name})`

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="status"
              aria-label={tooltipContent}
              className="inline-flex items-center gap-1 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 rounded"
              tabIndex={0}
            >
              <AlertTriangle
                className="h-3 w-3 flex-shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <span className="truncate text-slate-700">
                {makeClickable(value.name, value.id)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Assigned: inline plus icon without background
  if (state === 'assigned') {
    const tooltipContent = `${fieldName}: ${value.name} (assigned to component)`

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="status"
              aria-label={tooltipContent}
              className="inline-flex items-center gap-1 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
              tabIndex={0}
            >
              <PlusCircle
                className="h-3 w-3 flex-shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <span className="truncate text-slate-700">
                {makeClickable(value.name, value.id)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Should never reach here, but return plain text as fallback
  return <span>{value.name}</span>
}
