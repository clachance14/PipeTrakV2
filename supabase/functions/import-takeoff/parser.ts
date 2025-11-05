/**
 * CSV Parser for Import Takeoff
 * Parses CSV content using PapaParse in Deno environment
 */

import Papa from 'papaparse';

export interface CsvRow {
  DRAWING: string;
  TYPE: string;
  QTY: number;
  'CMDTY CODE': string;
  SPEC?: string;
  DESCRIPTION?: string;
  SIZE?: string;
  Comments?: string;
}

export interface ParseResult {
  success: boolean;
  rows?: CsvRow[];
  errors?: Array<{
    row: number;
    column: string;
    reason: string;
  }>;
}

export function parseCsv(csvContent: string): ParseResult {
  const errors: Array<{ row: number; column: string; reason: string }> = [];

  // Parse CSV with PapaParse - configured for maximum flexibility
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy', // Skip completely empty lines but preserve multi-line quoted fields
    transformHeader: (h: string) => h.trim(),
    newline: '', // Auto-detect line endings (CRLF, LF, CR)
    quoteChar: '"',
    escapeChar: '"',
    comments: false,
    trimHeaders: true,
    dynamicTyping: false, // Keep all values as strings
  });

  // Papa Parse errors are logged but NEVER block import
  // Papa Parse is very good at recovering from malformed CSV - trust it
  if (parseResult.errors.length > 0) {
    console.log('Papa Parse handled these issues automatically:', parseResult.errors);

    // Only fail on truly catastrophic errors (extremely rare)
    const criticalErrors = parseResult.errors.filter(
      (err: any) => err.type === 'Quotes' && err.code === 'UndetectableDelimiter'
    );

    if (criticalErrors.length > 0) {
      errors.push({
        row: 0,
        column: '',
        reason: 'Unable to parse CSV file. Please ensure the file uses standard CSV format.'
      });
      return { success: false, errors };
    }
    // Otherwise continue - Papa Parse recovered from the issues
  }

  // Filter out empty rows that Papa Parse may have created
  // (Can happen with multi-line quoted fields or trailing commas)
  const rawRows = parseResult.data as Record<string, string>[];
  const rows = rawRows.filter(row => {
    // Keep row if it has at least one non-empty value
    return Object.values(row).some(val => val && val.trim() !== '');
  });

  return {
    success: true,
    rows: rows as unknown as CsvRow[]
  };
}
