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
}: MetadataCellProps) => {
  const state = getMetadataState(value, drawingValue)

  // No value: show dash (keep consistent padding for alignment)
  if (!value) {
    return <span className="inline-block px-2 py-1 text-gray-400">—</span>
  }

  // Inherited: plain text (no special styling, but keep consistent padding for alignment)
  if (state === 'inherited') {
    return <span className="inline-block px-2 py-1">{value.name}</span>
  }

  // Override: amber background + warning icon
  if (state === 'override') {
    const tooltipContent = `${fieldName}: ${value.name} (overrides drawing's ${drawingValue?.name})`

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="status"
              aria-label={tooltipContent}
              className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              tabIndex={0}
            >
              <AlertTriangle
                className="h-3.5 w-3.5 flex-shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <span className="truncate">{value.name}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Assigned: blue background + plus icon
  if (state === 'assigned') {
    const tooltipContent = `${fieldName}: ${value.name} (assigned to component)`

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="status"
              aria-label={tooltipContent}
              className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              tabIndex={0}
            >
              <PlusCircle
                className="h-3.5 w-3.5 flex-shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <span className="truncate">{value.name}</span>
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
