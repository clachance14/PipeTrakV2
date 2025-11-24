/**
 * Weld Log Export Utilities
 * Functions for exporting weld log data to Excel format
 */

import * as XLSX from 'xlsx';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';

/**
 * Formats a project name for use in filename by replacing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

/**
 * Formats a date as YYYY-MM-DD for filenames
 */
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string to locale date (e.g., "12/5/2024")
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '-';
  }
}

/**
 * Formats welder info (stencil - name)
 */
function formatWelder(welder: { stencil: string; name: string } | null): string {
  if (!welder) return 'Not Assigned';
  return `${welder.stencil} - ${welder.name}`;
}

/**
 * Exports weld log data to Excel format (XLSX)
 * @param welds - The weld log data to export
 * @param projectName - Name of the project for the filename
 */
export function exportWeldLogToExcel(
  welds: EnrichedFieldWeld[],
  projectName: string
): void {
  // Create data rows (column headers defined inline)
  const rows = welds.map((weld) => ({
    'Weld ID': weld.identityDisplay,
    'Drawing': weld.drawing.drawing_no_norm,
    'Welder': formatWelder(weld.welder),
    'Date Welded': formatDate(weld.date_welded),
    'Type': weld.weld_type,
    'Size': weld.weld_size || '-',
    'NDE Result': weld.nde_result || '-',
    'Progress %': weld.component.percent_complete / 100, // Convert to decimal for percentage format
    'Status': weld.status,
    'Area': weld.area?.name || '-',
    'System': weld.system?.name || '-',
    'Test Package': weld.test_package?.name || '-',
  }));

  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(rows);

  // Get worksheet range
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Apply formatting
  // 1. Header row: Bold, background color
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: '334155' } }, // slate-700
      alignment: { horizontal: 'center' },
    };
  }

  // 2. Format Progress % column (column 7, zero-indexed) as percentage
  const progressColIndex = 7;
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: progressColIndex });
    if (ws[cellAddress]) {
      ws[cellAddress].z = '0.0%'; // Percentage format with 1 decimal
    }
  }

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Weld ID
    { wch: 20 }, // Drawing
    { wch: 25 }, // Welder
    { wch: 15 }, // Date Welded
    { wch: 10 }, // Type
    { wch: 12 }, // Size
    { wch: 15 }, // NDE Result
    { wch: 12 }, // Progress %
    { wch: 12 }, // Status
    { wch: 20 }, // Area
    { wch: 20 }, // System
    { wch: 20 }, // Test Package
  ];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Weld Log');

  // Generate filename: {projectName}_weld_log_{YYYY-MM-DD}.xlsx
  const sanitizedProject = sanitizeFilename(projectName);
  const dateStr = formatDateForFilename(new Date());
  const filename = `${sanitizedProject}_weld_log_${dateStr}.xlsx`;

  // Save the Excel file
  XLSX.writeFile(wb, filename);
}
