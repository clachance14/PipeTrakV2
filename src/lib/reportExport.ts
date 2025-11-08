/**
 * Report Export Utilities (Feature 019 - T035)
 * Functions for exporting reports to PDF, Excel, and CSV formats
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportData } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';

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
 * Exports report data to PDF format
 * @param reportData - The report data to export
 * @param projectName - Name of the project for the filename
 * @param companyLogo - Optional base64 encoded logo image
 */
export function exportToPDF(
  reportData: ReportData,
  projectName: string,
  companyLogo?: string
): void {
  // Create PDF document in landscape orientation for 8-column table
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
  doc.text('PipeTrak Weekly Progress Report', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(
    `Grouping: ${DIMENSION_LABELS[reportData.dimension]}`,
    pageWidth / 2,
    28,
    { align: 'center' }
  );

  // Prepare table data
  const dimensionLabel = DIMENSION_LABELS[reportData.dimension];
  const tableHead = [
    [dimensionLabel, 'Budget', 'Received', 'Installed', 'Punch', 'Tested', 'Restored', '% Complete'],
  ];

  const tableBody = [
    ...reportData.rows.map((row) => [
      row.name,
      row.budget,
      `${Math.round(row.pctReceived)}%`,
      `${Math.round(row.pctInstalled)}%`,
      `${Math.round(row.pctPunch)}%`,
      `${Math.round(row.pctTested)}%`,
      `${Math.round(row.pctRestored)}%`,
      `${Math.round(row.pctTotal)}%`,
    ]),
    // Add Grand Total row with 1 decimal place
    [
      reportData.grandTotal.name,
      reportData.grandTotal.budget,
      `${reportData.grandTotal.pctReceived.toFixed(1)}%`,
      `${reportData.grandTotal.pctInstalled.toFixed(1)}%`,
      `${reportData.grandTotal.pctPunch.toFixed(1)}%`,
      `${reportData.grandTotal.pctTested.toFixed(1)}%`,
      `${reportData.grandTotal.pctRestored.toFixed(1)}%`,
      `${reportData.grandTotal.pctTotal.toFixed(1)}%`,
    ],
  ];

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
      fontSize: 10,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 45 }, // Dimension name
      1: { halign: 'right', cellWidth: 18 }, // Budget
      2: { halign: 'right', cellWidth: 22 }, // Received
      3: { halign: 'right', cellWidth: 22 }, // Installed
      4: { halign: 'right', cellWidth: 22 }, // Punch
      5: { halign: 'right', cellWidth: 22 }, // Tested
      6: { halign: 'right', cellWidth: 22 }, // Restored
      7: { halign: 'right', cellWidth: 25 }, // % Complete
    },
    didParseCell: (data) => {
      // Make Grand Total row bold with slate background and white text (matching header)
      if (data.section === 'body' && data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [51, 65, 85]; // slate-700
        data.cell.styles.textColor = [255, 255, 255]; // white text
      }
    },
  });

  // Generate filename: PipeTrak_[Project]_[Dimension]_[Date].pdf
  const sanitizedProject = sanitizeFilename(projectName);
  const dateStr = formatDateForFilename(new Date());
  const filename = `PipeTrak_${sanitizedProject}_${reportData.dimension}_${dateStr}.pdf`;

  // Save the PDF
  doc.save(filename);
}

/**
 * Exports report data to Excel format (XLSX)
 * @param _reportData - The report data to export
 * @param _projectName - Name of the project for the filename
 */
export function exportToExcel(_reportData: ReportData, _projectName: string): void {
  // Placeholder for Phase 6 (User Story 3)
  throw new Error('Excel export not yet implemented');
}

/**
 * Exports report data to CSV format
 * @param _reportData - The report data to export
 * @param _projectName - Name of the project for the filename
 */
export function exportToCSV(_reportData: ReportData, _projectName: string): void {
  // Placeholder for Phase 6 (User Story 3)
  throw new Error('CSV export not yet implemented');
}
