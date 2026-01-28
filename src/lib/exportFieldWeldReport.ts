/**
 * Field Weld Report Export Utilities (Weekly Field Weld Reports Feature)
 * Functions for exporting field weld reports to PDF, Excel, and CSV formats
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type {
  FieldWeldReportData,
  FieldWeldProgressRow,
  FieldWeldGrandTotalRow,
  FieldWeldGroupingDimension,
} from '@/types/reports';
import {
  FIELD_WELD_DIMENSION_LABELS,
} from '@/types/reports';
import { hasNonZeroRepairRate } from '@/lib/pdfUtils';

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
 * Formats a percentage value for display (handles null)
 */
function formatPercentage(value: number | null, decimals: number = 1): string {
  if (value === null) return '-';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a decimal value for display (handles null)
 */
function formatDecimal(value: number | null, decimals: number = 1): string {
  if (value === null) return '-';
  return value.toFixed(decimals);
}

/**
 * Gets column headers based on dimension (includes welder-specific columns if dimension is 'welder')
 * Note: fitupCount removed per user request
 * @param dimension - Grouping dimension
 * @param includeRepairRate - Whether to include repair rate column (default: true)
 */
function getColumnHeaders(dimension: FieldWeldGroupingDimension, includeRepairRate: boolean = true): string[] {
  const dimensionLabel = FIELD_WELD_DIMENSION_LABELS[dimension];
  const baseHeaders = [
    dimensionLabel,
    'Total Welds',
    'Weld Complete',
    ...(dimension !== 'welder' ? ['Remaining'] : []),
    'Accepted',
    'NDE Pass Rate',
    ...(includeRepairRate ? ['Repair Rate'] : []),
    '% Complete',
  ];

  if (dimension === 'welder') {
    return [
      ...baseHeaders,
      'First Pass Rate',
      'Avg Days to Accept',
    ];
  }

  return baseHeaders;
}

/**
 * Formats a row for export (converts to display values)
 * Note: fitupCount removed per user request
 * @param row - Row data to format
 * @param dimension - Grouping dimension
 * @param decimals - Number of decimal places for percentages
 * @param includeRepairRate - Whether to include repair rate (default: true)
 */
function formatRowForExport(
  row: FieldWeldProgressRow | FieldWeldGrandTotalRow,
  dimension: FieldWeldGroupingDimension,
  decimals: number = 1,
  includeRepairRate: boolean = true
): (string | number)[] {
  const baseData = [
    row.name,
    row.totalWelds,
    row.weldCompleteCount,
    ...(dimension !== 'welder' ? [row.remainingCount] : []),
    row.acceptedCount,
    formatPercentage(row.ndePassRate, decimals),
    ...(includeRepairRate ? [formatPercentage(row.repairRate, decimals)] : []),
    formatPercentage(row.pctTotal, decimals),
  ];

  if (dimension === 'welder') {
    return [
      ...baseData,
      formatPercentage(row.firstPassAcceptanceRate ?? null, decimals),
      formatDecimal(row.avgDaysToAcceptance ?? null, decimals),
    ];
  }

  return baseData;
}

/**
 * Exports field weld report data to PDF format
 * @param reportData - The field weld report data to export
 * @param projectName - Name of the project for the filename
 * @param companyLogo - Optional base64 encoded logo image
 */
export function exportFieldWeldReportToPDF(
  reportData: FieldWeldReportData,
  projectName: string,
  companyLogo?: string
): void {
  // Check if we should include repair rate column
  const includeRepairRate = hasNonZeroRepairRate(reportData);

  // Create PDF document in landscape orientation for multi-column table
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add company header
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add logo if provided
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', 10, 10, 30, 15);
    } catch (error) {
      console.warn('Failed to add logo to PDF:', error);
    }
  }

  // Add header text
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PipeTrak Field Weld Progress Report', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(
    `Grouping: ${FIELD_WELD_DIMENSION_LABELS[reportData.dimension]}`,
    pageWidth / 2,
    28,
    { align: 'center' }
  );

  // Prepare table data
  const tableHead = [getColumnHeaders(reportData.dimension, includeRepairRate)];

  const tableBody = [
    ...reportData.rows.map((row) => formatRowForExport(row, reportData.dimension, 1, includeRepairRate)),
    // Add Grand Total row with bold formatting
    formatRowForExport(reportData.grandTotal, reportData.dimension, 1, includeRepairRate),
  ];

  // Define column widths based on dimension and whether repair rate is included
  // Non-welder: Name, Total Welds, Weld Complete, Remaining, Accepted, NDE Pass Rate, [Repair Rate], % Complete
  // Welder: Name, Total Welds, Weld Complete, Accepted, NDE Pass Rate, [Repair Rate], % Complete, First Pass Rate, Avg Days
  const isWelderDimension = reportData.dimension === 'welder';
  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center'; cellWidth: number }> = {
    0: { halign: 'left', cellWidth: isWelderDimension ? 35 : 40 }, // Name
    1: { halign: 'right', cellWidth: 22 }, // Total Welds
    2: { halign: 'right', cellWidth: 24 }, // Weld Complete
  };

  let colIndex = 3;
  if (!isWelderDimension) {
    columnStyles[colIndex] = { halign: 'right', cellWidth: 22 }; // Remaining
    colIndex++;
  }
  columnStyles[colIndex] = { halign: 'right', cellWidth: 22 }; // Accepted
  colIndex++;
  columnStyles[colIndex] = { halign: 'right', cellWidth: 26 }; // NDE Pass Rate
  colIndex++;
  if (includeRepairRate) {
    columnStyles[colIndex] = { halign: 'right', cellWidth: 22 }; // Repair Rate
    colIndex++;
  }
  columnStyles[colIndex] = { halign: 'right', cellWidth: 24 }; // % Complete
  colIndex++;

  if (isWelderDimension) {
    columnStyles[colIndex] = { halign: 'right', cellWidth: 24 }; // First Pass Rate
    colIndex++;
    columnStyles[colIndex] = { halign: 'right', cellWidth: 28 }; // Avg Days to Accept
  }

  // Generate table with autoTable
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 35,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85], // slate-700 for better contrast
      textColor: [255, 255, 255], // white text
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: isWelderDimension ? 9 : 10, // Smaller font for more columns
    },
    columnStyles,
    didParseCell: (data) => {
      // Make Grand Total row bold with slate background and white text (matching header)
      if (data.section === 'body' && data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [51, 65, 85]; // slate-700
        data.cell.styles.textColor = [255, 255, 255]; // white text
      }
    },
  });

  // Generate filename: field-weld-report-[dimension]-[date].pdf
  const sanitizedProject = sanitizeFilename(projectName);
  const dateStr = formatDateForFilename(new Date());
  const filename = `${sanitizedProject}_field_weld_${reportData.dimension}_${dateStr}.pdf`;

  // Save the PDF
  doc.save(filename);
}

/**
 * Exports field weld report data to Excel format (XLSX)
 * @param reportData - The field weld report data to export
 * @param projectName - Name of the project for the filename
 */
export function exportFieldWeldReportToExcel(
  reportData: FieldWeldReportData,
  projectName: string
): void {
  // Check if we should include repair rate column
  const includeRepairRate = hasNonZeroRepairRate(reportData);

  // Prepare worksheet data
  const headers = getColumnHeaders(reportData.dimension, includeRepairRate);

  // Create data rows (convert percentages to numbers for Excel formatting)
  // Columns: Name, Total Welds, Weld Complete, [Remaining], Accepted, NDE Pass Rate, [Repair Rate], % Complete
  const isWelderDimension = reportData.dimension === 'welder';
  const rows = reportData.rows.map((row) => {
    const baseRow: Record<string, string | number | null> = {
      [headers[0] as string]: row.name,
      [headers[1] as string]: row.totalWelds,
      [headers[2] as string]: row.weldCompleteCount,
    };

    let headerIndex = 3;
    if (!isWelderDimension) {
      baseRow[headers[headerIndex] as string] = row.remainingCount;
      headerIndex++;
    }
    baseRow[headers[headerIndex] as string] = row.acceptedCount;
    headerIndex++;
    baseRow[headers[headerIndex] as string] = row.ndePassRate !== null ? row.ndePassRate / 100 : null;
    headerIndex++;
    if (includeRepairRate) {
      baseRow[headers[headerIndex] as string] = row.repairRate / 100;
      headerIndex++;
    }
    baseRow[headers[headerIndex] as string] = row.pctTotal / 100;
    headerIndex++;

    if (isWelderDimension) {
      baseRow[headers[headerIndex] as string] = row.firstPassAcceptanceRate !== undefined && row.firstPassAcceptanceRate !== null
        ? row.firstPassAcceptanceRate / 100
        : null;
      headerIndex++;
      baseRow[headers[headerIndex] as string] = row.avgDaysToAcceptance ?? null;
    }

    return baseRow;
  });

  // Add grand total row
  const grandTotalRow: Record<string, string | number | null> = {
    [headers[0] as string]: reportData.grandTotal.name,
    [headers[1] as string]: reportData.grandTotal.totalWelds,
    [headers[2] as string]: reportData.grandTotal.weldCompleteCount,
  };

  let gtHeaderIndex = 3;
  if (!isWelderDimension) {
    grandTotalRow[headers[gtHeaderIndex] as string] = reportData.grandTotal.remainingCount;
    gtHeaderIndex++;
  }
  grandTotalRow[headers[gtHeaderIndex] as string] = reportData.grandTotal.acceptedCount;
  gtHeaderIndex++;
  grandTotalRow[headers[gtHeaderIndex] as string] = reportData.grandTotal.ndePassRate !== null ? reportData.grandTotal.ndePassRate / 100 : null;
  gtHeaderIndex++;
  if (includeRepairRate) {
    grandTotalRow[headers[gtHeaderIndex] as string] = reportData.grandTotal.repairRate / 100;
    gtHeaderIndex++;
  }
  grandTotalRow[headers[gtHeaderIndex] as string] = reportData.grandTotal.pctTotal / 100;
  gtHeaderIndex++;

  if (isWelderDimension) {
    grandTotalRow[headers[gtHeaderIndex] as string] = reportData.grandTotal.firstPassAcceptanceRate !== undefined
      && reportData.grandTotal.firstPassAcceptanceRate !== null
      ? reportData.grandTotal.firstPassAcceptanceRate / 100
      : null;
    gtHeaderIndex++;
    grandTotalRow[headers[gtHeaderIndex] as string] = reportData.grandTotal.avgDaysToAcceptance ?? null;
  }

  const allRows = [...rows, grandTotalRow];

  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(allRows);

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

  // 2. Format count columns as integers (Weld Complete, [Remaining], Accepted)
  // Non-welder: Name(0), Total Welds(1), Weld Complete(2), Remaining(3), Accepted(4)
  // Welder: Name(0), Total Welds(1), Weld Complete(2), Accepted(3)
  const countColumns = isWelderDimension ? [2, 3] : [2, 3, 4];
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (const col of countColumns) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].z = '0'; // Integer format
    }
  }

  // 3. Format percentage columns
  // Non-welder: NDE Pass Rate(5), [Repair Rate(6)], % Complete(6 or 7)
  // Welder: NDE Pass Rate(4), [Repair Rate(5)], % Complete(5 or 6), First Pass Rate(6 or 7)
  const ndePassRateCol = isWelderDimension ? 4 : 5;
  const percentageColumns = [ndePassRateCol]; // NDE Pass Rate
  let pctColIndex = ndePassRateCol + 1;
  if (includeRepairRate) {
    percentageColumns.push(pctColIndex); // Repair Rate
    pctColIndex++;
  }
  percentageColumns.push(pctColIndex); // % Complete
  pctColIndex++;

  if (isWelderDimension) {
    percentageColumns.push(pctColIndex); // First Pass Rate
  }

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (const col of percentageColumns) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;

      ws[cellAddress].z = '0.0%'; // Percentage format with 1 decimal
    }

    // Format decimal column (Avg Days to Accept) if welder dimension
    if (isWelderDimension) {
      const decimalCol = includeRepairRate ? 8 : 7;
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: decimalCol });
      if (ws[cellAddress]) {
        ws[cellAddress].z = '0.0'; // Decimal format with 1 place
      }
    }
  }

  // 4. Grand Total row: Bold, top border
  const grandTotalRowIndex = range.e.r;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: grandTotalRowIndex, c: col });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: { bold: true },
      border: {
        top: { style: 'medium', color: { rgb: '000000' } },
      },
    };
  }

  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Name
    { wch: 12 }, // Total Welds
    { wch: 15 }, // Weld Complete
  ];

  if (!isWelderDimension) {
    columnWidths.push({ wch: 12 }); // Remaining
  }
  columnWidths.push({ wch: 12 }); // Accepted
  columnWidths.push({ wch: 15 }); // NDE Pass Rate

  if (includeRepairRate) {
    columnWidths.push({ wch: 12 }); // Repair Rate
  }
  columnWidths.push({ wch: 13 }); // % Complete

  if (isWelderDimension) {
    columnWidths.push({ wch: 15 }); // First Pass Rate
    columnWidths.push({ wch: 18 }); // Avg Days to Accept
  }

  ws['!cols'] = columnWidths;

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Field Weld Progress');

  // Generate filename: field-weld-report-[dimension]-[date].xlsx
  const sanitizedProject = sanitizeFilename(projectName);
  const dateStr = formatDateForFilename(new Date());
  const filename = `${sanitizedProject}_field_weld_${reportData.dimension}_${dateStr}.xlsx`;

  // Save the Excel file
  XLSX.writeFile(wb, filename);
}

/**
 * Exports field weld report data to CSV format
 * @param reportData - The field weld report data to export
 * @param projectName - Name of the project for the filename
 */
export function exportFieldWeldReportToCSV(
  reportData: FieldWeldReportData,
  projectName: string
): void {
  // Check if we should include repair rate column
  const includeRepairRate = hasNonZeroRepairRate(reportData);

  // Prepare CSV data
  const headers = getColumnHeaders(reportData.dimension, includeRepairRate);

  // Create data rows
  // Columns: Name, Total Welds, Weld Complete, Accepted, NDE Pass Rate, [Repair Rate], % Complete
  const rows = reportData.rows.map((row) => {
    const baseRow = [
      row.name,
      row.totalWelds.toString(),
      row.weldCompleteCount.toString(),
      row.acceptedCount.toString(),
      row.ndePassRate !== null ? row.ndePassRate.toFixed(1) : '',
      ...(includeRepairRate ? [(row.repairRate).toFixed(1)] : []),
      (row.pctTotal).toFixed(1),
    ];

    if (reportData.dimension === 'welder') {
      return [
        ...baseRow,
        row.firstPassAcceptanceRate !== undefined && row.firstPassAcceptanceRate !== null
          ? row.firstPassAcceptanceRate.toFixed(1)
          : '',
        row.avgDaysToAcceptance !== undefined && row.avgDaysToAcceptance !== null
          ? row.avgDaysToAcceptance.toFixed(1)
          : '',
      ];
    }

    return baseRow;
  });

  // Add grand total row
  const grandTotalRow = [
    reportData.grandTotal.name,
    reportData.grandTotal.totalWelds.toString(),
    reportData.grandTotal.weldCompleteCount.toString(),
    reportData.grandTotal.acceptedCount.toString(),
    reportData.grandTotal.ndePassRate !== null ? reportData.grandTotal.ndePassRate.toFixed(1) : '',
    ...(includeRepairRate ? [reportData.grandTotal.repairRate.toFixed(1)] : []),
    reportData.grandTotal.pctTotal.toFixed(1),
  ];

  if (reportData.dimension === 'welder') {
    grandTotalRow.push(
      reportData.grandTotal.firstPassAcceptanceRate !== undefined
        && reportData.grandTotal.firstPassAcceptanceRate !== null
        ? reportData.grandTotal.firstPassAcceptanceRate.toFixed(1)
        : ''
    );
    grandTotalRow.push(
      reportData.grandTotal.avgDaysToAcceptance !== undefined
        && reportData.grandTotal.avgDaysToAcceptance !== null
        ? reportData.grandTotal.avgDaysToAcceptance.toFixed(1)
        : ''
    );
  }

  const allRows = [headers, ...rows, grandTotalRow];

  // Convert to CSV string
  const csvContent = allRows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes in cell values
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Generate filename: field-weld-report-[dimension]-[date].csv
  const sanitizedProject = sanitizeFilename(projectName);
  const dateStr = formatDateForFilename(new Date());
  const filename = `${sanitizedProject}_field_weld_${reportData.dimension}_${dateStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export dispatcher - exports field weld report in the specified format
 * @param reportData - The field weld report data to export
 * @param format - Export format ('pdf', 'excel', or 'csv')
 * @param projectName - Name of the project for the filename
 * @param companyLogo - Optional base64 encoded logo image (PDF only)
 */
export function exportFieldWeldReport(
  reportData: FieldWeldReportData,
  format: 'pdf' | 'excel' | 'csv',
  projectName: string,
  companyLogo?: string
): void {
  switch (format) {
    case 'pdf':
      exportFieldWeldReportToPDF(reportData, projectName, companyLogo);
      break;
    case 'excel':
      exportFieldWeldReportToExcel(reportData, projectName);
      break;
    case 'csv':
      exportFieldWeldReportToCSV(reportData, projectName);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
