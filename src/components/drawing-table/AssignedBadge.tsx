/**
 * Component: AssignedBadge
 * Feature: 011-the-drawing-component
 *
 * Displays a blue "(assigned)" badge with tooltip "Manually assigned".
 * Used when a component's metadata value differs from its drawing's value
 * or when the drawing has no value but the component does.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AssignedBadgeProps {
  /** Optional CSS classes */
  className?: string;
}

export function AssignedBadge({ className = '' }: AssignedBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 ${className}`}
          >
            (assigned)
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Manually assigned</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
