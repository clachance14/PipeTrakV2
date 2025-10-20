/**
 * CSV Validator for Import Takeoff
 * Validates CSV rows for required columns, data types, and business rules
 */

import { CsvRow } from './parser.ts';

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

// Valid component types
const VALID_TYPES = ['Valve', 'Instrument', 'Support', 'Pipe', 'Fitting', 'Flange'];

// File size limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Row count limit: 10,000 rows
const MAX_ROW_COUNT = 10000;

export function validateCsvContent(csvContent: string, rows: CsvRow[], headers: string[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Check file size
  const fileSize = new TextEncoder().encode(csvContent).length;
  if (fileSize > MAX_FILE_SIZE) {
    errors.push({
      row: 0,
      column: '',
      reason: 'File too large. Maximum 5MB'
    });
    return { valid: false, errors };
  }

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

    // Validate DRAWING is not empty
    if (!row.DRAWING || row.DRAWING.trim() === '') {
      errors.push({
        row: rowNumber,
        column: 'DRAWING',
        reason: 'Required field missing'
      });
    }

    // Validate TYPE is in allowed list
    if (!VALID_TYPES.includes(row.TYPE)) {
      errors.push({
        row: rowNumber,
        column: 'TYPE',
        reason: `Invalid component type. Expected: ${VALID_TYPES.join(', ')}`
      });
    }

    // Validate QTY is numeric and non-negative
    const qty = Number(row.QTY);
    if (isNaN(qty) || !Number.isInteger(qty)) {
      errors.push({
        row: rowNumber,
        column: 'QTY',
        reason: 'Invalid data type (expected number)'
      });
    } else if (qty < 0) {
      errors.push({
        row: rowNumber,
        column: 'QTY',
        reason: 'Quantity must be ≥0'
      });
    }

    // Validate CMDTY CODE is not empty
    if (!row['CMDTY CODE'] || row['CMDTY CODE'].trim() === '') {
      errors.push({
        row: rowNumber,
        column: 'CMDTY CODE',
        reason: 'Required field missing'
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalize drawing number (MUST match database function and transaction.ts)
 * Database does: UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))
 */
function normalizeDrawing(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Normalize size for identity key (same as transaction.ts)
 */
function normalizeSize(raw: string | undefined): string {
  if (!raw || raw.trim() === '') {
    return 'NOSIZE';
  }

  return raw
    .trim()
    .replace(/["'\s]/g, '')    // Remove quotes and spaces
    .replace(/\//g, 'X')       // Replace / with X for URL safety (1/2 → 1X2)
    .toUpperCase();
}

/**
 * Check for duplicate identity keys within the CSV
 * Identity keys are drawing-scoped to allow same CMDTY CODE on different drawings
 */
export function checkDuplicateIdentityKeys(rows: CsvRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const identityKeyMap = new Map<string, { rowNumber: number; rawDrawing: string }>();
  const duplicates = new Map<string, Array<{ rowNumber: number; rawDrawing: string }>>();

  rows.forEach((row, index) => {
    const qty = Number(row.QTY);
    if (isNaN(qty) || qty === 0) return; // Skip invalid or zero quantity rows

    const cmdtyCode = row['CMDTY CODE'];
    const type = row.TYPE;
    const drawingNorm = normalizeDrawing(row.DRAWING);
    const sizeNorm = normalizeSize(row.SIZE);
    const rowNumber = index + 2; // +1 for header, +1 for 0-index

    // Generate identity keys for this row (drawing-scoped, size-aware)
    for (let i = 1; i <= qty; i++) {
      const identityKey = type === 'Instrument'
        ? `${drawingNorm}-${sizeNorm}-${cmdtyCode}`
        : `${drawingNorm}-${sizeNorm}-${cmdtyCode}-${String(i).padStart(3, '0')}`;

      const existing = identityKeyMap.get(identityKey);

      if (existing) {
        // Found a duplicate!
        if (!duplicates.has(identityKey)) {
          // First time seeing this duplicate - record the first occurrence
          duplicates.set(identityKey, [existing]);
        }
        // Add this occurrence
        duplicates.get(identityKey)!.push({
          rowNumber,
          rawDrawing: row.DRAWING
        });
      } else {
        // First occurrence - track it
        identityKeyMap.set(identityKey, {
          rowNumber,
          rawDrawing: row.DRAWING
        });
      }
    }
  });

  // Generate error messages for duplicates showing ALL conflicting rows
  duplicates.forEach((occurrences, key) => {
    const allRows = occurrences.map(o => `${o.rowNumber} ("${o.rawDrawing}")`).join(', ');
    const lastOccurrence = occurrences[occurrences.length - 1];

    errors.push({
      row: lastOccurrence.rowNumber,
      column: 'CMDTY CODE',
      reason: `Duplicate identity key "${key}" found in rows: ${allRows}`
    });
  });

  return errors;
}
