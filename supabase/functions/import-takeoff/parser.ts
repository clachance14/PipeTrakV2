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

  // Parse CSV with PapaParse
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
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
    return { success: false, errors };
  }

  const rows = parseResult.data as Record<string, string>[];

  return {
    success: true,
    rows: rows as unknown as CsvRow[]
  };
}
