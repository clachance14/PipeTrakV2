/**
 * weldLogPdfMake.ts
 *
 * Weld Log PDF generator using pdfmake.
 * Provides native table support with reliable column widths,
 * repeating headers, and proper page breaks.
 *
 * Features:
 * - Letter landscape format (10 columns)
 * - Repeating table headers on every page
 * - Alternating row colors
 * - Company logo and project info in header
 * - Page numbers in footer
 * - Lazy loading of pdfmake library
 *
 * @example
 * ```tsx
 * const blob = await generateWeldLogPdfMake({
 *   welds: enrichedWelds,
 *   projectName: 'Pipeline Project 2025',
 *   generatedDate: '2025-01-15',
 *   companyLogo: 'data:image/png;base64,...',
 * });
 * ```
 */

import type { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';

/**
 * Options for generating the weld log PDF
 */
export interface WeldLogPdfOptions {
  welds: EnrichedFieldWeld[];
  projectName: string;
  generatedDate: string;
  companyLogo?: string; // base64 data URL
}

/**
 * Column headers for the weld log table
 */
export const COLUMN_HEADERS = [
  'Weld ID',
  'Drawing',
  'Welder',
  'Date Welded',
  'Type',
  'Size',
  'NDE Result',
  'Area',
  'System',
  'Test Package',
] as const;

/**
 * Column widths as percentages
 * Order matches COLUMN_HEADERS
 * Sum: 9+10+13+11+6+5+9+12+10+10 = 95% (leaving 5% for padding)
 */
export const COLUMN_WIDTHS = [
  '9%',   // Weld ID
  '10%',  // Drawing
  '13%',  // Welder (reduced from 14%)
  '11%',  // Date Welded (increased from 10% to prevent wrapping)
  '6%',   // Type
  '5%',   // Size
  '9%',   // NDE Result
  '12%',  // Area
  '10%',  // System
  '10%',  // Test Package
] as const;

/**
 * Colors used in the PDF
 */
const COLORS = {
  headerBackground: '#374151', // Dark blue-gray
  headerText: '#FFFFFF',
  rowText: '#374151',
  rowEven: '#FFFFFF',
  rowOdd: '#F9FAFB',
  borderColor: '#E5E7EB',
  titleColor: '#1e3a5f',
} as const;

/**
 * Transform a single weld to an array of string values for table row
 *
 * @param weld - EnrichedFieldWeld object
 * @returns Array of 10 string values in column order
 */
export function transformWeldToRow(weld: EnrichedFieldWeld): string[] {
  return [
    weld.identityDisplay,
    weld.drawing.drawing_no_norm,
    weld.welder ? `${weld.welder.stencil} - ${weld.welder.name}` : 'Not Assigned',
    weld.date_welded ? new Date(weld.date_welded).toLocaleDateString() : '-',
    weld.weld_type,
    weld.weld_size || '-',
    weld.nde_result || '-',
    weld.area?.name || '-',
    weld.system?.name || '-',
    weld.test_package?.name || '-',
  ];
}

/**
 * Build the pdfmake document definition
 *
 * @param options - PDF generation options
 * @returns pdfmake TDocumentDefinitions object
 */
export function buildDocDefinition(options: WeldLogPdfOptions): TDocumentDefinitions {
  const { welds, projectName, generatedDate, companyLogo } = options;

  // Build table body: header row + data rows
  const tableBody = [
    // Header row
    COLUMN_HEADERS.map((header) => ({
      text: header,
      style: 'tableHeader',
    })),
    // Data rows
    ...welds.map((weld) => transformWeldToRow(weld)),
  ];

  // Define styles
  const styles: StyleDictionary = {
    tableHeader: {
      bold: true,
      fontSize: 9,
      color: COLORS.headerText,
    },
    tableCell: {
      fontSize: 8,
      color: COLORS.rowText,
    },
  };

  // Build content array
  const content: Content[] = [
    // Title - centered, minimal top margin
    {
      text: 'PipeTrak Weld Log',
      fontSize: 18,
      color: COLORS.titleColor,
      alignment: 'center' as const,
      margin: [0, -10, 0, 10], // Negative top margin moves it up
    },
    // Table
    {
      table: {
        headerRows: 1,
        widths: [...COLUMN_WIDTHS],
        body: tableBody,
      },
      layout: {
        fillColor: (rowIndex: number) => {
          if (rowIndex === 0) return COLORS.headerBackground;
          return rowIndex % 2 === 0 ? COLORS.rowOdd : COLORS.rowEven;
        },
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => COLORS.borderColor,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    },
  ];

  // Build document definition
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageOrientation: 'landscape',
    pageMargins: [40, 90, 40, 40], // [left, top, right, bottom] - extra top for header

    // Header function - called for each page
    header: (_currentPage: number, _pageCount: number) => {
      const headerColumns: Content[] = [];

      // Left side: Logo or placeholder
      if (companyLogo) {
        headerColumns.push({
          image: companyLogo,
          width: 60,
          margin: [40, 20, 0, 0],
        });
      } else {
        // Empty placeholder to maintain layout - use canvas for fixed width
        headerColumns.push({
          canvas: [],
          width: 60,
          margin: [40, 20, 0, 0],
        } as Content);
      }

      // Right side: Project info
      headerColumns.push({
        stack: [
          { text: projectName, bold: true, alignment: 'right' as const },
          { text: `Dimension: ${welds.length} Welds`, alignment: 'right' as const },
          { text: `Generated: ${generatedDate}`, alignment: 'right' as const },
        ],
        margin: [0, 20, 40, 0],
        fontSize: 9,
      });

      return {
        columns: headerColumns,
      };
    },

    // Footer function - called for each page
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: 'right' as const,
      margin: [0, 0, 40, 20],
      fontSize: 8,
    }),

    content,
    styles,
  };

  return docDefinition;
}

/**
 * Generate weld log PDF using pdfmake
 *
 * Lazy-loads pdfmake library on first call to avoid bundle bloat.
 * Uses pdfmake 0.1.72 which doesn't have the Promise polyfill freeze issue.
 *
 * @see https://github.com/bpampuch/pdfmake/issues/2610 - Freeze issue fixed in 0.1.72
 * @param options - PDF generation options
 * @returns Promise resolving to PDF Blob
 */
export async function generateWeldLogPdfMake(options: WeldLogPdfOptions): Promise<Blob> {
  console.log('[pdfmake] Starting PDF generation with v0.1.72...');

  // Lazy load pdfmake and fonts (dynamic import for code splitting)
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

  console.log('[pdfmake] Modules loaded');

  // Get the pdfmake instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake = pdfMakeModule.default || pdfMakeModule;

  // Set up fonts - v0.1.72 uses pdfFonts.pdfMake.vfs structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfFonts = pdfFontsModule as any;
  if (pdfFonts.pdfMake?.vfs) {
    console.log('[pdfmake] Using pdfFonts.pdfMake.vfs');
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts.default?.pdfMake?.vfs) {
    console.log('[pdfmake] Using pdfFonts.default.pdfMake.vfs');
    pdfMake.vfs = pdfFonts.default.pdfMake.vfs;
  } else {
    console.log('[pdfmake] Font structure:', Object.keys(pdfFonts).slice(0, 5));
    console.log('[pdfmake] Default structure:', pdfFonts.default ? Object.keys(pdfFonts.default).slice(0, 5) : 'N/A');
  }

  // Build document definition
  console.log('[pdfmake] Building document definition...');
  const docDefinition = buildDocDefinition(options);

  // Generate PDF and return as Blob
  console.log('[pdfmake] Creating PDF...');
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      console.log('[pdfmake] Calling getBlob...');

      // Add a timeout to detect hangs
      const timeout = setTimeout(() => {
        console.error('[pdfmake] TIMEOUT after 30s');
        reject(new Error('PDF generation timed out after 30s'));
      }, 30000);

      // v0.1.72 should work with getBlob
      pdfDoc.getBlob((blob: Blob) => {
        clearTimeout(timeout);
        console.log('[pdfmake] getBlob callback received, size:', blob?.size);
        resolve(blob);
      });
    } catch (error) {
      console.error('[pdfmake] Error:', error);
      reject(error);
    }
  });
}
