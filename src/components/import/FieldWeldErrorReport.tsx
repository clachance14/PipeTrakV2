/**
 * FieldWeldErrorReport Component (Feature 014 - T048)
 * Results modal showing import summary with downloadable error report
 */

import { X, Download, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ImportError {
  row: number
  column?: string
  message: string
}

interface FieldWeldErrorReportProps {
  open: boolean
  onClose: () => void
  fileName: string
  totalRows: number
  successCount: number
  errorCount: number
  errors: ImportError[]
}

export function FieldWeldErrorReport({
  open,
  onClose,
  fileName,
  totalRows,
  successCount,
  errorCount,
  errors,
}: FieldWeldErrorReportProps) {
  const handleDownloadErrorReport = () => {
    // Generate CSV with error details
    const headers = ['Row', 'Error']
    const rows = errors.map((err) => [
      err.row.toString(),
      err.column ? `${err.column}: ${err.message}` : err.message,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName.replace('.csv', '')}-errors.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const hasErrors = errorCount > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Import Complete with Errors
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Import Complete
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium text-slate-700">
              File: {fileName}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-600">Total Rows</div>
                <div className="text-lg font-semibold text-slate-900">
                  {totalRows.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Successfully Imported
                </div>
                <div className="text-lg font-semibold text-green-700">
                  {successCount.toLocaleString()} welds
                </div>
              </div>
              {hasErrors && (
                <div>
                  <div className="flex items-center gap-1 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Errors
                  </div>
                  <div className="text-lg font-semibold text-red-700">
                    {errorCount.toLocaleString()} rows
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Table */}
          {hasErrors && (
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                Error Details
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                        Row
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {errors.map((error, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {error.row}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {error.column && (
                            <span className="font-medium">{error.column}: </span>
                          )}
                          {error.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3">
            {hasErrors && (
              <Button
                variant="outline"
                onClick={handleDownloadErrorReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Error Report
              </Button>
            )}
            <Button onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
