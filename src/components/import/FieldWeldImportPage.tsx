/**
 * FieldWeldImportPage Component (Feature 014 - T046, Feature 029 - Excel Support)
 * Matches Material Takeoff import format
 * Supports Excel (.xlsx, .xls) and CSV imports
 */

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useImportFieldWelds } from '@/hooks/useImportFieldWelds'
import { FieldWeldImportProgress } from './FieldWeldImportProgress'
import { FieldWeldErrorReport } from './FieldWeldErrorReport'
import { excelToCsv, isExcelFile } from '@/lib/excel/excel-to-csv'
import { generateFieldWeldTemplate } from '@/lib/excel/generate-template'

interface FieldWeldImportPageProps {
  projectId: string
}

export function FieldWeldImportPage({ projectId }: FieldWeldImportPageProps) {
  const [showProgress, setShowProgress] = useState(false)
  const [showErrorReport, setShowErrorReport] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [conversionProgress, setConversionProgress] = useState<number>(0)
  const [isConverting, setIsConverting] = useState(false)
  const [importResult, setImportResult] = useState<{
    fileName: string
    totalRows: number
    successCount: number
    errorCount: number
    errors: Array<{ row: number; column?: string; message: string }>
  } | null>(null)

  const importMutation = useImportFieldWelds()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    onDrop: async (acceptedFiles) => {
      const originalFile = acceptedFiles[0]
      if (!originalFile) return

      setCurrentFile(originalFile)
      setShowProgress(true)
      setImportResult(null) // Clear previous results
      setConversionProgress(0)

      try {
        // Convert Excel to CSV if needed
        let csvFile: File = originalFile

        if (isExcelFile(originalFile)) {
          setIsConverting(true)

          const csvString = await excelToCsv(originalFile, {
            applyFieldWeldMapping: true,
            progressInterval: 1000,
            onProgress: (current, total) => {
              setConversionProgress(Math.round((current / total) * 100))
            },
          })

          // Create CSV file from converted data
          csvFile = new File([csvString], originalFile.name.replace(/\.xlsx?$/i, '.csv'), {
            type: 'text/csv',
          })

          setIsConverting(false)
        }

        const result = await importMutation.mutateAsync({
          project_id: projectId,
          csv_file: csvFile,
        })

        // Calculate total rows
        const totalRows = result.success_count + result.error_count

        // Store result
        setImportResult({
          fileName: originalFile.name,
          totalRows,
          successCount: result.success_count,
          errorCount: result.error_count,
          errors: result.errors,
        })

        // Show error report if there are errors
        if (result.error_count > 0) {
          setShowErrorReport(true)
        }
      } catch (error) {
        // Error already handled by hook's onError
        setImportResult({
          fileName: originalFile.name,
          totalRows: 0,
          successCount: 0,
          errorCount: 1,
          errors: [{ row: 0, message: error instanceof Error ? error.message : 'Import failed' }],
        })
      } finally {
        setShowProgress(false)
        setCurrentFile(null)
        setIsConverting(false)
        setConversionProgress(0)
      }
    },
  })

  const downloadExcelTemplate = () => {
    generateFieldWeldTemplate()
  }

  const downloadCsvTemplate = () => {
    const sampleCsv = `Weld ID Number,Drawing / Isometric Number,Weld Type,SPEC,Weld Size,Schedule,Base Metal,X-RAY %,Welder Stencil,Date Welded,Type of NDE Performed,NDE Result,Comments
1,P-26B07,BW,HC05,1",XS,CS,5%,K-07,2024-01-15,RT,PASS,
2,P-93909,SW,HC05,3",STD,CS,5%,R-05,2024-01-16,UT,PASS,
3,P-14501,FW,EN-14,2",XS,SS,10%,J-12,2024-01-17,PT,PENDING,`

    const blob = new Blob([sampleCsv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'field-welds-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Title and Description */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Field Weld Import</h2>
        <p className="text-gray-600">
          Upload an Excel or CSV file to import field welds with welder assignments and NDE results
        </p>
      </div>

      {/* Template Downloads */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={downloadExcelTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          Download Excel Template
        </button>
        <button
          onClick={downloadCsvTemplate}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          Prefer CSV? Download CSV Template
        </button>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {isConverting ? (
          <div>
            <p className="text-lg mb-2 text-blue-600">Converting Excel...</p>
            <p className="text-sm text-gray-500">{conversionProgress}%</p>
          </div>
        ) : isDragActive ? (
          <p className="text-lg text-blue-600">Drop file here</p>
        ) : (
          <div>
            <p className="text-lg mb-2">Drag Excel file or click to upload</p>
            <p className="text-sm text-gray-500 mb-1">Also supports CSV files</p>
            <p className="text-xs text-gray-400">
              Accepts: .xlsx, .xls, .csv • Maximum size: 5MB
            </p>
          </div>
        )}
      </div>

      {/* Import Results */}
      {importResult && !showProgress && (
        <div className="mt-6">
          {importResult.errorCount === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Import Successful
              </h3>
              <p className="text-green-700">
                Successfully imported {importResult.successCount} field welds.
              </p>
            </div>
          ) : importResult.successCount > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                Import Complete with Errors
              </h3>
              <p className="text-amber-700 mb-4">
                Imported {importResult.successCount} welds successfully.{' '}
                {importResult.errorCount} row{importResult.errorCount !== 1 ? 's' : ''} failed.
              </p>
              <button
                onClick={() => setShowErrorReport(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                View Error Report
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Import Failed
              </h3>
              <p className="text-red-700 mb-4">
                Found {importResult.errorCount} error{importResult.errorCount !== 1 ? 's' : ''} in your CSV file.
              </p>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4">
                  <div className="max-h-96 overflow-y-auto border border-red-300 rounded">
                    <table className="min-w-full divide-y divide-red-200">
                      <thead className="bg-red-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Row</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Column</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-900 uppercase tracking-wider">Error</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-red-200">
                        {importResult.errors.map((error, index) => (
                          <tr key={index} className="hover:bg-red-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{error.row}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{error.column || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setShowErrorReport(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Download Error Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress Overlay */}
      {showProgress && currentFile && (
        <FieldWeldImportProgress
          fileName={currentFile.name}
          fileSize={currentFile.size}
        />
      )}

      {/* Error Report Modal */}
      {importResult && (
        <FieldWeldErrorReport
          open={showErrorReport}
          onClose={() => setShowErrorReport(false)}
          fileName={importResult.fileName}
          totalRows={importResult.totalRows}
          successCount={importResult.successCount}
          errorCount={importResult.errorCount}
          errors={importResult.errors}
        />
      )}
    </div>
  )
}
