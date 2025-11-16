import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  align?: 'start' | 'center'
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  align = 'start',
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border/60 pb-4 sm:pb-6 md:flex-row md:items-center md:justify-between',
        align === 'center' && 'md:text-center md:items-center md:justify-center',
        className
      )}
      {...props}
    >
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{title}</div>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap gap-2 md:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}
