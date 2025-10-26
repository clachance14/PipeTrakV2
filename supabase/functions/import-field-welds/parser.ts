/**
 * CSV Parser for Field Weld Import (Feature 014)
 * Uses PapaParse to parse CSV files with proper handling of quoted fields, BOM markers
 */

import Papa from 'papaparse'

export interface ParsedRow {
  'Weld ID Number': string
  'Drawing / Isometric Number': string
  'SPEC': string
  'Weld Size': string
  'Schedule': string
  'Weld Type': string
  'Base Metal': string
  'X-RAY %': string
  'Welder Stencil': string
  'Date Welded': string
  'Type of NDE Performed': string
  'NDE Result': string
  'Comments': string
  [key: string]: string // Allow additional columns
}

export interface ParseResult {
  data: ParsedRow[]
  errors: Array<{
    row: number
    message: string
  }>
}

/**
 * Parse CSV file content
 * @param csvContent - Raw CSV file content
 * @returns Parsed rows and any parsing errors
 */
export function parseCsv(csvContent: string): ParseResult {
  const errors: Array<{ row: number; message: string }> = []

  // Parse CSV with PapaParse
  const parseResult = Papa.parse<ParsedRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(), // Normalize headers
    transform: (value: string) => value.trim(), // Trim all values
  })

  // Collect parsing errors
  if (parseResult.errors.length > 0) {
    parseResult.errors.forEach((error) => {
      errors.push({
        row: error.row ?? 0,
        message: `Parse error: ${error.message}`,
      })
    })
  }

  return {
    data: parseResult.data,
    errors,
  }
}

/**
 * Validate required CSV columns
 * @param headers - Array of column headers from CSV
 * @returns Validation errors if any required columns are missing
 */
export function validateHeaders(headers: string[]): string[] {
  const requiredColumns = [
    'Weld ID Number',
    'Drawing / Isometric Number',
    'Weld Type',
  ]

  const errors: string[] = []
  const normalizedHeaders = headers.map((h) => h.trim())

  requiredColumns.forEach((required) => {
    if (!normalizedHeaders.includes(required)) {
      errors.push(`Missing required column: ${required}`)
    }
  })

  return errors
}
