/**
 * CSV Validation Utility
 * Validates CSV content for import, checking:
 * - Required columns exist
 * - Data types are correct
 * - Component types are valid
 * - Required fields are not empty
 * - File size and row limits
 *
 * Returns validation result with errors array
 */

import Papa from 'papaparse';
import { z } from 'zod';

export interface ValidationError {
  row: number;
  column: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Required columns
const REQUIRED_COLUMNS = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'];

// Zod schema for CSV row validation
const csvRowSchema = z.object({
  DRAWING: z.string().min(1, 'Required field missing'),
  TYPE: z.enum(['Valve', 'Instrument', 'Support', 'Pipe', 'Fitting', 'Flange'], {
    message: 'Invalid component type. Expected: Valve, Instrument, Support, Pipe, Fitting, Flange'
  }),
  QTY: z.coerce.number().int().min(0, 'Quantity must be ≥0'),
  'CMDTY CODE': z.string().min(1, 'Required field missing'),
  SPEC: z.string().optional().default(''),
  DESCRIPTION: z.string().optional().default(''),
  SIZE: z.string().optional().default(''),
  Comments: z.string().optional().default(''),
});

// File size limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Row count limit: 10,000 rows
const MAX_ROW_COUNT = 10000;

export function validateCsv(csvContent: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Check file size
  const fileSize = new Blob([csvContent]).size;
  if (fileSize > MAX_FILE_SIZE) {
    errors.push({
      row: 0,
      column: '',
      reason: 'File too large. Maximum 5MB'
    });
    return { valid: false, errors };
  }

  // Parse CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  // Check for parsing errors
  if (parseResult.errors.length > 0) {
    parseResult.errors.forEach((error) => {
      errors.push({
        row: error.row || 0,
        column: '',
        reason: `CSV parsing error: ${error.message}`
      });
    });
    return { valid: false, errors };
  }

  const rows = parseResult.data as Record<string, string>[];

  // Check row count
  if (rows.length > MAX_ROW_COUNT) {
    errors.push({
      row: 0,
      column: '',
      reason: 'File too large. Maximum 10,000 rows'
    });
    return { valid: false, errors };
  }

  // Check required columns exist
  const headers = parseResult.meta.fields || [];
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    missingColumns.forEach(col => {
      errors.push({
        row: 0,
        column: col,
        reason: `Missing required column: ${col}`
      });
    });
    return { valid: false, errors };
  }

  // Validate each row
  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for header, +1 for 0-indexing

    const result = csvRowSchema.safeParse(row);

    if (!result.success) {
      // Zod errors are in the 'issues' property, not 'errors'
      result.error.issues.forEach((err) => {
        const column = err.path[0]?.toString() || '';
        errors.push({
          row: rowNumber,
          column,
          reason: err.message
        });
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
