export interface DrawingTableSkeletonProps {
  rowCount?: number
}

/**
 * Loading skeleton for drawing table
 *
 * Shows animated grey bars matching DrawingRow layout.
 * Default: 10 rows, each 64px height.
 */
export function DrawingTableSkeleton({ rowCount = 10 }: DrawingTableSkeletonProps) {
  return (
    <div role="status" aria-label="Loading drawings" className="space-y-2">
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          className="h-16 bg-slate-200 rounded animate-pulse flex items-center gap-4 px-4"
        >
          {/* Icon placeholder */}
          <div className="w-5 h-5 bg-slate-300 rounded" />

          {/* Drawing number placeholder */}
          <div className="w-24 h-4 bg-slate-300 rounded" />

          {/* Title placeholder */}
          <div className="flex-1 h-4 bg-slate-300 rounded" />

          {/* Progress placeholder */}
          <div className="w-28 h-4 bg-slate-300 rounded" />

          {/* Count placeholder */}
          <div className="w-20 h-4 bg-slate-300 rounded" />
        </div>
      ))}
    </div>
  )
}
