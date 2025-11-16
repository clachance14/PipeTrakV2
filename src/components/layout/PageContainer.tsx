import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the container should stretch edge-to-edge instead of centering to max width.
   */
  fullWidth?: boolean
  /**
   * Enables flex behavior for pages that manage their own vertical height (e.g., large tables).
   */
  fixedHeight?: boolean
}

export function PageContainer({
  children,
  className,
  fullWidth = false,
  fixedHeight = false,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full px-4 py-6 sm:px-6 lg:px-8',
        fullWidth ? 'max-w-none' : 'max-w-7xl mx-auto',
        fixedHeight && 'flex flex-1 flex-col min-h-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
