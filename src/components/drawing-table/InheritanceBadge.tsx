/**
 * Component: InheritanceBadge
 * Feature: 011-the-drawing-component
 *
 * Displays a gray "(inherited)" badge with tooltip showing the source drawing.
 * Used when a component's metadata value matches its drawing's value.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InheritanceBadgeProps {
  /** Drawing number for tooltip (e.g., "P-001") */
  drawingNumber: string;
  /** Optional CSS classes */
  className?: string;
}

export function InheritanceBadge({ drawingNumber, className = '' }: InheritanceBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ${className}`}
          >
            (inherited)
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>From drawing {drawingNumber}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
