/**
 * Excel to CSV Converter
 * Converts Excel files (.xlsx, .xls) to CSV with smart column mapping
 * Supports progress tracking for large files
 */

import * as XLSX from 'xlsx'
import {
  mapFieldWeldColumns,
  reorderRow,
  FIELD_WELD_REQUIRED_HEADERS,
  getMappingStats,
  type MappingResult,
} from './weld-column-mapper'

export interface ConversionOptions {
  /**
   * Progress callback for large files
   * @param current - Current row being processed
   * @param total - Total rows to process
   */
  onProgress?: (current: number, total: number) => void

  /**
   * Whether to apply Field Weld column mapping
   * If true, columns will be reordered and filtered to match system expectations
   * If false, raw CSV output (for Material Takeoff which has its own mapper)
   */
  applyFieldWeldMapping?: boolean

  /**
   * Threshold for progress callbacks (default: 1000 rows)
   * Progress will be reported every N rows
   */
  progressInterval?: number
}

export interface ConversionResult {
  csv: string
  rowCount: number
  columnMapping?: MappingResult
  stats?: string
}

/**
 * Convert Excel file to CSV string
 * @param file - Excel file (.xlsx or .xls)
 * @param options - Conversion options
 * @returns CSV string with headers
 * @throws Error if file cannot be parsed or required columns are missing
 */
export async function excelToCsv(
  file: File,
  options: ConversionOptions = {}
): Promise<string> {
  const { onProgress, applyFieldWeldMapping = false, progressInterval = 1000 } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)

        // Read workbook
        const workbook = XLSX.read(data, { type: 'array' })

        if (workbook.SheetNames.length === 0) {
          reject(new Error('Excel file contains no sheets'))
          return
        }

        // Read first sheet only
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          reject(new Error('Excel file contains no sheet names'))
          return
        }
        const firstSheet = workbook.Sheets[firstSheetName]
        if (!firstSheet) {
          reject(new Error('Excel file contains no data in first sheet'))
          return
        }

        // Convert to array of arrays
        const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
          header: 1,
          defval: '',
          raw: false, // Convert all values to strings
          blankrows: false, // Skip empty rows
        })

        if (rows.length === 0) {
          reject(new Error('Excel file contains no data'))
          return
        }

        // Extract headers (first row)
        const headers = rows[0] as string[]
        const dataRows = rows.slice(1)

        if (dataRows.length === 0) {
          reject(new Error('Excel file contains only headers, no data rows'))
          return
        }

        let csvLines: string[]
        let mappingResult: MappingResult | undefined

        if (applyFieldWeldMapping) {
          // Apply Field Weld column mapping
          mappingResult = mapFieldWeldColumns(headers)

          // Check for missing required columns
          if (mappingResult.missingRequired.length > 0) {
            reject(
              new Error(
                `Missing required columns: ${mappingResult.missingRequired.join(', ')}`
              )
            )
            return
          }

          // Use expected headers as CSV header row
          csvLines = [FIELD_WELD_REQUIRED_HEADERS.join(',')]

          // Reorder and filter each data row
          for (let i = 0; i < dataRows.length; i++) {
            const sourceRow = dataRows[i] as unknown[]
            const reorderedRow = reorderRow(sourceRow, mappingResult.mappings)

            // Escape CSV values (handle quotes and commas)
            const escapedRow = reorderedRow.map(escapeCSVValue)
            csvLines.push(escapedRow.join(','))

            // Report progress
            if (onProgress && (i + 1) % progressInterval === 0) {
              onProgress(i + 1, dataRows.length)
            }
          }

          // Final progress update
          if (onProgress) {
            onProgress(dataRows.length, dataRows.length)
          }
        } else {
          // No mapping - direct CSV conversion (for Material Takeoff)
          const csv = XLSX.utils.sheet_to_csv(firstSheet, {
            strip: true, // Remove trailing spaces
            blankrows: false, // Skip empty rows
            FS: ',', // Field separator: comma
            RS: '\n', // Row separator: newline
          })

          csvLines = csv.split('\n').filter((line) => line.trim())

          // Report progress for large files
          if (onProgress) {
            const totalRows = csvLines.length - 1 // Exclude header
            onProgress(totalRows, totalRows)
          }
        }

        const csv = csvLines.join('\n')

        resolve(csv)
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`))
        } else {
          reject(new Error('Failed to parse Excel file: Unknown error'))
        }
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Convert Excel file to CSV with detailed result information
 * @param file - Excel file
 * @param options - Conversion options
 * @returns Conversion result with CSV, stats, and mapping info
 */
export async function excelToCsvWithStats(
  file: File,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        if (workbook.SheetNames.length === 0) {
          reject(new Error('Excel file contains no sheets'))
          return
        }

        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          reject(new Error('Excel file contains no sheet names'))
          return
        }
        const firstSheet = workbook.Sheets[firstSheetName]
        if (!firstSheet) {
          reject(new Error('Excel file contains no data in first sheet'))
          return
        }

        const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
          header: 1,
          defval: '',
          raw: false,
          blankrows: false,
        })

        if (rows.length === 0) {
          reject(new Error('Excel file contains no data'))
          return
        }

        const headers = rows[0] as string[]
        const dataRows = rows.slice(1)

        let columnMapping: MappingResult | undefined
        let stats: string | undefined

        if (options.applyFieldWeldMapping) {
          columnMapping = mapFieldWeldColumns(headers)

          if (columnMapping.missingRequired.length > 0) {
            reject(
              new Error(
                `Missing required columns: ${columnMapping.missingRequired.join(', ')}`
              )
            )
            return
          }

          stats = getMappingStats(columnMapping)
        }

        // Convert using main function
        excelToCsv(file, options)
          .then((csv) => {
            resolve({
              csv,
              rowCount: dataRows.length,
              columnMapping,
              stats,
            })
          })
          .catch(reject)
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`))
        } else {
          reject(new Error('Failed to parse Excel file: Unknown error'))
        }
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Escape CSV value (handle quotes, commas, newlines)
 * According to RFC 4180
 */
function escapeCSVValue(value: string): string {
  if (!value) return ''

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

/**
 * Helper to check if file is Excel format
 */
export function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.xlsx') || name.endsWith('.xls')
}

/**
 * Get estimated conversion time for a file
 * Based on file size
 * @param file - Excel file
 * @returns Estimated seconds to convert
 */
export function estimateConversionTime(file: File): number {
  const sizeInMB = file.size / (1024 * 1024)

  // Rough estimate: ~1 second per MB
  // Adjust based on actual performance testing
  return Math.ceil(sizeInMB * 1.5)
}
