import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface DrawingTableErrorProps {
  error: Error
  onRetry: () => void
}

/**
 * Error state for drawing table
 *
 * Shows when drawings fail to load.
 * Displays AlertCircle icon (red), error message, and retry button.
 */
export function DrawingTableError({ error, onRetry }: DrawingTableErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Failed to load drawings
      </h3>
      <p className="text-sm text-slate-600 mb-6">{error.message}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  )
}
