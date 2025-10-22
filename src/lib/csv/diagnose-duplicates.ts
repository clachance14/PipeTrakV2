/**
 * CSV Diagnostic Tool
 * Analyzes CSV files to find duplicate identity keys and other issues
 * Helps users debug their CSV before attempting upload
 */

import Papa from 'papaparse';
import { normalizeDrawing } from './normalize-drawing';
import { generateIdentityKey } from './generate-identity-key';

export interface DuplicateGroup {
  identityKey: string;
  rows: Array<{
    rowNumber: number;
    rawDrawing: string;
    drawing: string;
    type: string;
    qty: number;
    cmdtyCode: string;
    spec: string;
    description: string;
  }>;
}

export interface DiagnosticResult {
  totalRows: number;
  totalComponents: number;
  duplicateGroups: DuplicateGroup[];
  hasDuplicates: boolean;
  summary: string;
}

/**
 * Diagnose a CSV file for duplicate identity keys
 */
export function diagnoseCsvDuplicates(csvContent: string): DiagnosticResult {
  // Parse CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parseResult.errors.length > 0) {
    const firstError = parseResult.errors[0];
    throw new Error(`CSV parsing failed: ${firstError?.message || 'Unknown error'}`);
  }

  const rows = parseResult.data as any[];
  const identityKeyMap = new Map<string, DuplicateGroup['rows']>();
  let totalComponents = 0;

  // Process each row
  rows.forEach((row, index) => {
    const qty = Number(row.QTY);
    if (isNaN(qty) || qty === 0) return;

    const cmdtyCode = row['CMDTY CODE'];
    const type = row.TYPE;
    const rawDrawing = row.DRAWING;
    const size = row.SIZE || '';
    const drawingNorm = normalizeDrawing(rawDrawing);
    const rowNumber = index + 2; // +1 for header, +1 for 0-index

    // Generate identity keys for this row
    for (let i = 1; i <= qty; i++) {
      const identityKey = generateIdentityKey(drawingNorm, size, cmdtyCode, i, qty, type);
      totalComponents++;

      const rowInfo = {
        rowNumber,
        rawDrawing,
        drawing: drawingNorm,
        type,
        qty,
        cmdtyCode,
        spec: row.SPEC || '',
        description: row.DESCRIPTION || '',
      };

      const existingRows = identityKeyMap.get(identityKey);
      if (!existingRows) {
        identityKeyMap.set(identityKey, [rowInfo]);
      } else {
        existingRows.push(rowInfo);
      }
    }
  });

  // Find duplicates (identity keys with more than one occurrence)
  const duplicateGroups: DuplicateGroup[] = [];

  identityKeyMap.forEach((occurrences, identityKey) => {
    if (occurrences.length > 1) {
      duplicateGroups.push({
        identityKey,
        rows: occurrences,
      });
    }
  });

  // Generate summary
  const hasDuplicates = duplicateGroups.length > 0;
  let summary = `Analyzed ${rows.length} rows → ${totalComponents} components.\n`;

  if (hasDuplicates) {
    summary += `\n⚠️ Found ${duplicateGroups.length} duplicate identity key(s):\n\n`;
    duplicateGroups.forEach((group) => {
      const rowNumbers = group.rows.map((r) => r.rowNumber).join(', ');
      summary += `- "${group.identityKey}" appears in rows: ${rowNumbers}\n`;
      group.rows.forEach((r) => {
        summary += `  Row ${r.rowNumber}: "${r.rawDrawing}" (normalized: "${r.drawing}") - ${r.type} - QTY ${r.qty} - ${r.cmdtyCode}\n`;
      });
      summary += '\n';
    });
  } else {
    summary += '✓ No duplicate identity keys found!';
  }

  return {
    totalRows: rows.length,
    totalComponents,
    duplicateGroups,
    hasDuplicates,
    summary,
  };
}

/**
 * Generate a detailed diagnostic report as CSV
 */
export function generateDiagnosticCsv(result: DiagnosticResult): string {
  if (!result.hasDuplicates) {
    return 'No duplicates found';
  }

  const header = 'Identity Key,Row Number,Raw Drawing,Normalized Drawing,Type,QTY,CMDTY CODE,SPEC,DESCRIPTION\n';
  const rows: string[] = [];

  result.duplicateGroups.forEach((group) => {
    group.rows.forEach((r) => {
      rows.push(
        `"${group.identityKey}",${r.rowNumber},"${r.rawDrawing}","${r.drawing}","${r.type}",${r.qty},"${r.cmdtyCode}","${r.spec}","${r.description}"`
      );
    });
    rows.push(''); // Blank line between groups
  });

  return header + rows.join('\n');
}
