/**
 * OrganizationLogoBadge Component
 * Feature: Company Logo Support
 *
 * Displays organization logo in header as a small badge.
 * Shows placeholder icon (Building2) if no logo is uploaded.
 */

import { useOrganization } from '@/hooks/useOrganization'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrganizationLogoBadgeProps {
  /** Size of the badge: sm (24px), md (32px), lg (40px) */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export function OrganizationLogoBadge({
  size = 'md',
  className,
}: OrganizationLogoBadgeProps) {
  const { useCurrentOrganization } = useOrganization()
  const { data: orgData, isLoading } = useCurrentOrganization()

  const logoUrl = orgData?.organization.logo_url

  // Loading state: animated placeholder
  if (isLoading) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-md bg-slate-600 animate-pulse',
          className
        )}
        aria-label="Loading organization logo"
      />
    )
  }

  // No logo: show Building2 icon placeholder
  if (!logoUrl) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-md bg-slate-600 flex items-center justify-center',
          className
        )}
        aria-label="No organization logo"
      >
        <Building2 className={cn(iconSizeClasses[size], 'text-slate-400')} />
      </div>
    )
  }

  // Logo exists: show image
  return (
    <img
      src={logoUrl}
      alt="Organization logo"
      className={cn(
        sizeClasses[size],
        'rounded-md object-contain bg-white border border-slate-600',
        className
      )}
    />
  )
}
