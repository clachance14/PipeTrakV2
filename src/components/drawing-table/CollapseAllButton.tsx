import { ChevronsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface CollapseAllButtonProps {
  onClick: () => void
  disabled: boolean
}

/**
 * Collapse all drawings button
 *
 * Collapses all expanded drawings at once.
 * Shows ChevronsUp icon with "Collapse All" text.
 * Secondary variant button.
 */
export function CollapseAllButton({
  onClick,
  disabled,
}: CollapseAllButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-label="Collapse all drawings"
      className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
    >
      <ChevronsUp className="h-4 w-4 mr-2" />
      Collapse All
    </Button>
  )
}
