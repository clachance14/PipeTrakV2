import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DataToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Optional right-aligned meta information (e.g., "Showing 24 of 120 records").
   */
  meta?: ReactNode
  /**
   * Action buttons rendered below the filter controls on small screens and inline on larger screens.
   */
  actions?: ReactNode
  /**
   * Makes the toolbar sticky at the top of its scroll container.
   */
  sticky?: boolean
}

export function DataToolbar({
  children,
  className,
  meta,
  actions,
  sticky = false,
  ...props
}: DataToolbarProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/70 bg-card/95 px-4 py-4 shadow-sm sm:px-6',
        'flex flex-col gap-4',
        sticky && 'sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-card/80',
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            {children}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2">
              {actions}
            </div>
          )}
        </div>
        {meta && (
          <div className="text-sm text-muted-foreground lg:text-right">
            {meta}
          </div>
        )}
      </div>
    </div>
  )
}
