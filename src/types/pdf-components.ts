/**
 * TypeScript Contracts for PDF Component Library
 * Feature: Advanced Report Generation with Component-Based PDF Library
 *
 * These interfaces define the contracts for all PDF components.
 * All types are strict mode compatible with explicit null handling.
 */

import type {
  FieldWeldReportData,
  FieldWeldDeltaReportData,
  FieldWeldGroupingDimension,
  ReportData,
  ManhourReportData,
  GroupingDimension,
  ReportViewMode,
} from '@/types/reports';
import type { WelderSummaryReport } from '@/types/weldSummary';

/**
 * ============================================================================
 * PDF Layout Components
 * ============================================================================
 */

/**
 * Props for BrandedHeader component
 * Renders company logo, report title, project info at top of each page
 */
export interface BrandedHeaderProps {
  /** Optional company logo (base64 encoded image or URL) */
  logo?: string;

  /** Report title (e.g., "PipeTrak Field Weld Progress Report") */
  title: string;

  /** Optional subtitle for additional context */
  subtitle?: string;

  /** Project name from ProjectContext */
  projectName: string;

  /** Report dimension label (e.g., "Area", "System", "Welder") */
  dimensionLabel: string;

  /** ISO date string for generation timestamp */
  generatedDate: string;
}

/**
 * Props for ReportFooter component
 * Renders page numbers and optional company info at bottom of each page
 */
export interface ReportFooterProps {
  /** Optional company information or disclaimers */
  companyInfo?: string;

  /** Whether to show page numbers (default: true) */
  showPageNumbers?: boolean;
}

/**
 * Props for PageLayout component
 * Wrapper component that combines header, content, and footer
 */
export interface PageLayoutProps {
  /** Page size (default: 'A4') */
  size?: 'A4' | 'LETTER' | 'LEGAL';

  /** Page orientation */
  orientation: 'portrait' | 'landscape';

  /** Whether to show header (default: true) */
  showHeader?: boolean;

  /** Whether to show footer (default: true) */
  showFooter?: boolean;

  /** Header component props */
  headerProps?: BrandedHeaderProps;

  /** Footer component props */
  footerProps?: ReportFooterProps;

  /** Content to render between header and footer */
  children: React.ReactNode;
}

/**
 * ============================================================================
 * PDF Table Components
 * ============================================================================
 */

/**
 * Column definition for PDF tables
 * Defines structure and formatting for a single table column
 */
export interface TableColumnDefinition {
  /** Unique key matching data field */
  key: string;

  /** Display label for column header */
  label: string;

  /** Column width as percentage (e.g., '40%', '20%') */
  width: string;

  /** Text alignment (default: 'left') */
  align?: 'left' | 'center' | 'right';

  /** Data format type for rendering (default: 'text') */
  format?: 'text' | 'number' | 'percentage' | 'decimal';
}

/**
 * Props for Table component
 * Renders a multi-column table with header, body rows, and optional grand total
 */
export interface TableProps {
  /** Column definitions */
  columns: TableColumnDefinition[];

  /** Data rows (generic object matching column keys) */
  data: Record<string, string | number | null>[];

  /** Optional grand total row */
  grandTotal?: Record<string, string | number | null>;

  /** Whether grand total has special styling (default: true) */
  highlightGrandTotal?: boolean;
}

/**
 * Props for TableHeader component
 * Renders the header row of a table with column labels
 */
export interface TableHeaderProps {
  /** Column definitions */
  columns: TableColumnDefinition[];
}

/**
 * Props for TableRow component
 * Renders a single data row in a table
 */
export interface TableRowProps {
  /** Column definitions for cell rendering */
  columns: TableColumnDefinition[];

  /** Row data (object with keys matching column keys) */
  data: Record<string, string | number | null>;

  /** Whether this row should have special styling (e.g., grand total) */
  highlighted?: boolean;
}

/**
 * ============================================================================
 * PDF Report Components
 * ============================================================================
 */

/**
 * Props for FieldWeldReportPDF component
 * Complete PDF document for field weld progress report
 */
export interface FieldWeldReportPDFProps {
  /** Report data from useFieldWeldProgressReport hook */
  reportData: FieldWeldReportData;

  /** Project name for header */
  projectName: string;

  /** Report dimension (area, system, test_package, welder) */
  dimension: FieldWeldGroupingDimension;

  /** Generation date as formatted string (e.g., "2025-01-21") */
  generatedDate: string;

  /** Optional company logo (base64 encoded) */
  companyLogo?: string;

  /** Optional delta data for inline +/- columns in PDF */
  deltaData?: FieldWeldDeltaReportData;

  /** Optional subtitle showing active sort/filter (e.g., "Sorted by: % Complete (desc)") */
  subtitle?: string;
}

/**
 * Props for ComponentProgressReportPDF component
 * Complete PDF document for component progress report
 */
export interface ComponentProgressReportPDFProps {
  /** Report data from useProgressReport hook */
  reportData: ReportData;

  /** Project name for header */
  projectName: string;

  /** Report dimension (area, system, test_package) */
  dimension: GroupingDimension;

  /** Generation date as formatted string (e.g., "2025-01-21") */
  generatedDate: string;

  /** Optional company logo (base64 encoded) */
  companyLogo?: string;

  /** Optional subtitle showing active sort/filter (e.g., "Sorted by: % Complete (desc)") */
  subtitle?: string;
}

/**
 * Props for WelderSummaryReportPDF component
 * Complete PDF document for welder summary report (tier-grouped BW/SW metrics)
 */
export interface WelderSummaryReportPDFProps {
  /** Report data from useWelderSummaryReport hook */
  reportData: WelderSummaryReport;

  /** Project name for header */
  projectName: string;

  /** Generation date as formatted string (e.g., "2025-01-21") */
  generatedDate: string;

  /** Optional company logo (base64 encoded) */
  companyLogo?: string;
}

/**
 * ============================================================================
 * PDF Export Hook
 * ============================================================================
 */

/**
 * Return type for useFieldWeldPDFExport hook
 * Manages PDF generation lifecycle
 */
export interface UseFieldWeldPDFExportReturn {
  /**
   * Function to trigger PDF generation and download
   * @param data - Report data from TanStack Query
   * @param projectName - Project name for header
   * @param dimension - Report dimension
   * @param companyLogo - Optional base64 encoded logo
   * @param deltaData - Optional delta data for inline +/- columns
   * @returns Promise resolving to PDF blob
   */
  generatePDF: (
    data: FieldWeldReportData,
    projectName: string,
    dimension: FieldWeldGroupingDimension,
    companyLogo?: string,
    deltaData?: FieldWeldDeltaReportData,
    subtitle?: string
  ) => Promise<Blob>;

  /**
   * Function to generate PDF preview (returns blob and URL without downloading)
   * @param data - Report data from TanStack Query
   * @param projectName - Project name for header
   * @param dimension - Report dimension
   * @param companyLogo - Optional base64 encoded logo
   * @param deltaData - Optional delta data for inline +/- columns
   * @param subtitle - Optional subtitle showing sort/filter info
   * @returns Promise resolving to { blob, url, filename }
   */
  generatePDFPreview: (
    data: FieldWeldReportData,
    projectName: string,
    dimension: FieldWeldGroupingDimension,
    companyLogo?: string,
    deltaData?: FieldWeldDeltaReportData,
    subtitle?: string
  ) => Promise<{ blob: Blob; url: string; filename: string }>;

  /** Loading state during PDF generation */
  isGenerating: boolean;

  /** Error state if generation fails */
  error: Error | null;
}

/**
 * Return type for useComponentProgressPDFExport hook
 * Manages PDF generation lifecycle for component progress and manhour reports
 */
export interface UseComponentProgressPDFExportReturn {
  /**
   * Function to trigger PDF generation and download (Count view)
   * @param data - Report data from TanStack Query
   * @param projectName - Project name for header
   * @param dimension - Report dimension
   * @param companyLogo - Optional base64 encoded logo
   * @returns Promise resolving to PDF blob
   */
  generatePDF: (
    data: ReportData,
    projectName: string,
    dimension: GroupingDimension,
    companyLogo?: string,
    subtitle?: string
  ) => Promise<Blob>;

  /**
   * Function to generate PDF preview for Count view (returns blob and URL without downloading)
   * @param data - Report data from TanStack Query
   * @param projectName - Project name for header
   * @param dimension - Report dimension
   * @param companyLogo - Optional base64 encoded logo
   * @param subtitle - Optional subtitle showing sort/filter info
   * @returns Promise resolving to { blob, url, filename }
   */
  generatePDFPreview: (
    data: ReportData,
    projectName: string,
    dimension: GroupingDimension,
    companyLogo?: string,
    subtitle?: string
  ) => Promise<{ blob: Blob; url: string; filename: string }>;

  /**
   * Function to generate PDF preview for Manhour views (returns blob and URL without downloading)
   * @param data - Manhour report data from TanStack Query
   * @param projectName - Project name for header
   * @param dimension - Report dimension
   * @param viewMode - View mode: 'manhour' or 'manhour_percent'
   * @param companyLogo - Optional base64 encoded logo
   * @param subtitle - Optional subtitle showing sort/filter info
   * @returns Promise resolving to { blob, url, filename }
   */
  generateManhourPDFPreview: (
    data: ManhourReportData,
    projectName: string,
    dimension: GroupingDimension,
    viewMode: ReportViewMode,
    companyLogo?: string,
    subtitle?: string
  ) => Promise<{ blob: Blob; url: string; filename: string }>;

  /** Loading state during PDF generation */
  isGenerating: boolean;

  /** Error state if generation fails */
  error: Error | null;
}

/**
 * Return type for useWelderSummaryPDFExport hook
 * Manages PDF generation lifecycle for welder summary reports
 */
export interface UseWelderSummaryPDFExportReturn {
  /**
   * Function to trigger PDF generation and download
   * @param data - Welder summary report data from TanStack Query
   * @param projectName - Project name for header
   * @param companyLogo - Optional base64 encoded logo
   * @returns Promise resolving to PDF blob
   */
  generatePDF: (
    data: WelderSummaryReport,
    projectName: string,
    companyLogo?: string
  ) => Promise<Blob>;

  /**
   * Function to generate PDF preview (returns blob and URL without downloading)
   * @param data - Welder summary report data from TanStack Query
   * @param projectName - Project name for header
   * @param companyLogo - Optional base64 encoded logo
   * @returns Promise resolving to { blob, url, filename }
   */
  generatePDFPreview: (
    data: WelderSummaryReport,
    projectName: string,
    companyLogo?: string
  ) => Promise<{ blob: Blob; url: string; filename: string }>;

  /** Loading state during PDF generation */
  isGenerating: boolean;

  /** Error state if generation fails */
  error: Error | null;
}

/**
 * ============================================================================
 * Utility Types
 * ============================================================================
 */

/**
 * PDF generation options for error handling and customization
 */
export interface PDFGenerationOptions {
  /** Whether to show detailed error messages (default: false) */
  verboseErrors?: boolean;

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Fallback project name if primary is missing */
  fallbackProjectName?: string;
}

/**
 * Result of PDF generation with metadata
 */
export interface PDFGenerationResult {
  /** Generated PDF blob */
  blob: Blob;

  /** File size in bytes */
  sizeBytes: number;

  /** Generation time in milliseconds */
  generationTimeMs: number;

  /** Generated filename */
  filename: string;
}

/**
 * ============================================================================
 * Validation & Error Types
 * ============================================================================
 */

/**
 * Validation error for PDF generation
 */
export class PDFValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'PDFValidationError';
  }
}

/**
 * Generation error for PDF creation
 */
export class PDFGenerationError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PDFGenerationError';
  }
}

/**
 * ============================================================================
 * Constants
 * ============================================================================
 */

/**
 * Standard column widths for field weld reports
 * Ensures consistent layout across all dimensions
 */
export const FIELD_WELD_COLUMN_WIDTHS = {
  name: '40%',
  numeric: '10%',
  welderExtra: '10%', // For welder-specific columns
} as const;

/**
 * Maximum file size for company logos (50KB)
 */
export const MAX_LOGO_SIZE_BYTES = 50 * 1024;

/**
 * Default PDF generation timeout (30 seconds)
 */
export const DEFAULT_PDF_TIMEOUT_MS = 30000;
