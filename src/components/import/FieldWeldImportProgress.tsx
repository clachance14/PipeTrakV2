/**
 * FieldWeldImportProgress Component (Feature 014 - T047)
 * Progress overlay during CSV import with real-time updates
 */

import { Loader2 } from 'lucide-react'

interface FieldWeldImportProgressProps {
  fileName: string
  fileSize: number
  currentRow?: number
  totalRows?: number
  successCount?: number
  errorCount?: number
}

export function FieldWeldImportProgress({
  fileName,
  fileSize,
  currentRow,
  totalRows,
  successCount = 0,
  errorCount = 0,
}: FieldWeldImportProgressProps) {
  const progress = totalRows && currentRow ? (currentRow / totalRows) * 100 : 0
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Importing Field Welds
            </h3>
            <p className="text-sm text-slate-600">
              {fileName} ({fileSizeMB} MB)
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-sm text-slate-700">
            <span>Processing rows...</span>
            <span>
              {currentRow?.toLocaleString() || 0} /{' '}
              {totalRows?.toLocaleString() || 0}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-center text-xs text-slate-500">
            {progress.toFixed(0)}%
          </div>
        </div>

        {/* Counts */}
        {(successCount > 0 || errorCount > 0) && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-green-600">✅</span>
              <span className="text-slate-700">
                {successCount.toLocaleString()} imported
              </span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-red-600">⚠️</span>
                <span className="text-slate-700">
                  {errorCount.toLocaleString()} errors
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
