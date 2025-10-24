/**
 * Row Validator for Field Weld Import (Feature 014)
 * Validates individual CSV rows against business rules
 */

import type { ParsedRow } from './parser.ts'

export interface ValidationError {
  row: number
  column?: string
  message: string
}

const VALID_WELD_TYPES = ['BW', 'SW', 'FW', 'TW']
const VALID_NDE_RESULTS = ['PASS', 'FAIL', 'PENDING', '']

/**
 * Validate a single CSV row
 * @param row - Parsed CSV row
 * @param rowNumber - Row number in CSV (1-indexed)
 * @returns Array of validation errors (empty if valid)
 */
export function validateRow(row: ParsedRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required field: Weld ID Number
  if (!row['Weld ID Number']) {
    errors.push({
      row: rowNumber,
      column: 'Weld ID Number',
      message: 'Required field missing: Weld ID Number',
    })
  }

  // Required field: Drawing / Isometric Number
  if (!row['Drawing / Isometric Number']) {
    errors.push({
      row: rowNumber,
      column: 'Drawing / Isometric Number',
      message: 'Required field missing: Drawing / Isometric Number',
    })
  }

  // Required field: Weld Type (must be valid enum)
  const weldType = row['Weld Type']?.toUpperCase().trim()
  if (!weldType) {
    errors.push({
      row: rowNumber,
      column: 'Weld Type',
      message: 'Required field missing: Weld Type',
    })
  } else if (!VALID_WELD_TYPES.includes(weldType)) {
    errors.push({
      row: rowNumber,
      column: 'Weld Type',
      message: `Invalid weld type: ${weldType}. Must be one of: ${VALID_WELD_TYPES.join(', ')}`,
    })
  }

  // Optional: Validate NDE Result if present
  const ndeResult = row['NDE Result']?.toUpperCase().trim()
  if (ndeResult && !VALID_NDE_RESULTS.includes(ndeResult)) {
    errors.push({
      row: rowNumber,
      column: 'NDE Result',
      message: `Invalid NDE result: ${ndeResult}. Must be one of: ${VALID_NDE_RESULTS.filter(r => r).join(', ')}`,
    })
  }

  // Optional: Validate Date Welded format if present
  const dateWelded = row['Date Welded']
  if (dateWelded) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(dateWelded)) {
      errors.push({
        row: rowNumber,
        column: 'Date Welded',
        message: `Invalid date format: ${dateWelded}. Expected YYYY-MM-DD`,
      })
    }
  }

  return errors
}

/**
 * Check for duplicate weld IDs across all rows
 * @param rows - All parsed CSV rows
 * @returns Array of validation errors for duplicates
 */
export function validateUniqueWeldIds(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = []
  const weldIdMap = new Map<string, number[]>()

  rows.forEach((row, index) => {
    const weldId = row['Weld ID Number']?.trim()
    if (weldId) {
      const rowNumber = index + 2 // +2 for header row and 1-indexed
      const existing = weldIdMap.get(weldId) || []
      existing.push(rowNumber)
      weldIdMap.set(weldId, existing)
    }
  })

  // Report duplicates
  weldIdMap.forEach((rowNumbers, weldId) => {
    if (rowNumbers.length > 1) {
      rowNumbers.forEach((rowNumber) => {
        errors.push({
          row: rowNumber,
          column: 'Weld ID Number',
          message: `Duplicate weld ID: ${weldId} (also appears in rows: ${rowNumbers.filter(r => r !== rowNumber).join(', ')})`,
        })
      })
    }
  })

  return errors
}

/**
 * Normalize drawing number to match database trigger format
 * UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))
 * @param drawingNumber - Raw drawing number from CSV
 * @returns Normalized drawing number
 */
export function normalizeDrawingNumber(drawingNumber: string): string {
  return drawingNumber
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .toUpperCase()
}
