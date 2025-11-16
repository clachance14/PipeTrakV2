import { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const surfaceCardVariants = cva(
  'rounded-lg border border-border/70 bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: '',
        muted: 'bg-muted text-muted-foreground border-transparent',
        subtle: 'bg-card/80 backdrop-blur border-border/40',
        ghost: 'border-transparent bg-transparent shadow-none',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

interface SurfaceCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceCardVariants> {}

export function SurfaceCard({
  children,
  className,
  variant,
  padding,
  ...props
}: SurfaceCardProps) {
  return (
    <div className={cn(surfaceCardVariants({ variant, padding }), className)} {...props}>
      {children}
    </div>
  )
}
