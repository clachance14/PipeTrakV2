/**
 * useComponentProgressPDFExport Hook
 *
 * Lazy-loading PDF export hook for component progress reports.
 * Manages PDF generation lifecycle with loading states and error handling.
 *
 * Key Features:
 * - Lazy loads @react-pdf/renderer (700KB-1.2MB) only when needed
 * - Prevents multiple simultaneous exports
 * - Handles browser download triggering and permission errors
 * - Provides loading and error states for UI feedback
 * - Automatically cleans up object URLs
 *
 * @example
 * ```tsx
 * function ReportsPage() {
 *   const { generatePDF, isGenerating, error } = useComponentProgressPDFExport();
 *
 *   const handleExport = async () => {
 *     try {
 *       await generatePDF(
 *         reportData,
 *         'Project Name',
 *         'area',
 *         companyLogo // optional
 *       );
 *       toast.success('PDF downloaded successfully');
 *     } catch (err) {
 *       toast.error('Failed to generate PDF');
 *     }
 *   };
 *
 *   return (
 *     <Button onClick={handleExport} disabled={isGenerating}>
 *       {isGenerating ? 'Generating...' : 'Export PDF'}
 *     </Button>
 *   );
 * }
 * ```
 *
 * @returns {UseComponentProgressPDFExportReturn} Hook API with generatePDF function, loading state, and error state
 * @returns {Function} returns.generatePDF - Async function to generate and download PDF
 * @returns {boolean} returns.isGenerating - Whether PDF generation is in progress
 * @returns {Error | null} returns.error - Error object if generation failed, null otherwise
 */

import { useState } from 'react';
import { generateComponentProgressPDFFilename, generateManhourProgressPDFFilename } from '@/lib/pdfUtils';
import type {
  ReportData,
  ManhourReportData,
  GroupingDimension,
  ReportViewMode,
} from '@/types/reports';
import type { UseComponentProgressPDFExportReturn } from '@/types/pdf-components';

/**
 * useComponentProgressPDFExport Hook
 *
 * @returns {UseComponentProgressPDFExportReturn} Hook return object
 */
export function useComponentProgressPDFExport(): UseComponentProgressPDFExportReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generate PDF blob for preview or download
   * Internal helper function used by both generatePDF and generatePDFPreview
   *
   * @param data - Component progress report data (rows and grand total)
   * @param projectName - Project name for filename and header
   * @param dimension - Report dimension: 'area' | 'system' | 'test_package'
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, filename }
   * @throws Error if generation fails
   */
  const generatePDFBlob = async (
    data: ReportData,
    projectName: string,
    dimension: GroupingDimension,
    companyLogo?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    // Lazy load @react-pdf/renderer (dynamic import for code splitting)
    const { pdf } = await import('@react-pdf/renderer');
    const { ComponentProgressReportPDF } = await import(
      '@/components/pdf/reports/ComponentProgressReportPDF'
    );

    // Generate timestamp for filename
    const generatedDate = new Date().toISOString().split('T')[0] ?? ''; // YYYY-MM-DD

    // Generate PDF blob from React component
    const blob = await pdf(
      <ComponentProgressReportPDF
        reportData={data}
        projectName={projectName}
        dimension={dimension}
        generatedDate={generatedDate}
        companyLogo={companyLogo ?? undefined}
      />
    ).toBlob();

    // Generate filename
    const filename = generateComponentProgressPDFFilename(
      projectName,
      dimension,
      new Date()
    );

    return { blob, filename };
  };

  /**
   * Generate PDF preview (returns blob and object URL without downloading)
   *
   * @param data - Component progress report data (rows and grand total)
   * @param projectName - Project name for filename and header
   * @param dimension - Report dimension: 'area' | 'system' | 'test_package'
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, url, filename }
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDFPreview = async (
    data: ReportData,
    projectName: string,
    dimension: GroupingDimension,
    companyLogo?: string
  ): Promise<{ blob: Blob; url: string; filename: string }> => {
    // Prevent multiple simultaneous exports
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(
        data,
        projectName,
        dimension,
        companyLogo
      );

      // Create object URL for preview (caller is responsible for cleanup)
      const url = URL.createObjectURL(blob);

      return { blob, url, filename };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate and download component progress PDF report
   *
   * @param data - Component progress report data (rows and grand total)
   * @param projectName - Project name for filename and header
   * @param dimension - Report dimension: 'area' | 'system' | 'test_package'
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to PDF Blob after download initiated
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDF = async (
    data: ReportData,
    projectName: string,
    dimension: GroupingDimension,
    companyLogo?: string
  ): Promise<Blob> => {
    // Prevent multiple simultaneous exports
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(
        data,
        projectName,
        dimension,
        companyLogo
      );

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      try {
        link.click();
      } catch (downloadError) {
        // Cleanup on error
        URL.revokeObjectURL(url);
        throw new Error(
          'Failed to download PDF. Please check your browser settings and allow downloads for this site.'
        );
      }

      // Cleanup object URL
      URL.revokeObjectURL(url);

      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate manhour PDF blob for preview or download
   * Internal helper function used by both generateManhourPDF and generateManhourPDFPreview
   *
   * @param data - Manhour progress report data (rows and grand total)
   * @param projectName - Project name for filename and header
   * @param dimension - Report dimension: 'area' | 'system' | 'test_package'
   * @param viewMode - View mode: 'manhour' or 'manhour_percent'
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, filename }
   * @throws Error if generation fails
   */
  const generateManhourPDFBlob = async (
    data: ManhourReportData,
    projectName: string,
    dimension: GroupingDimension,
    viewMode: ReportViewMode,
    companyLogo?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    // Lazy load @react-pdf/renderer (dynamic import for code splitting)
    const { pdf } = await import('@react-pdf/renderer');
    const { ManhourProgressReportPDF } = await import(
      '@/components/pdf/reports/ManhourProgressReportPDF'
    );

    // Generate timestamp for filename
    const generatedDate = new Date().toISOString().split('T')[0] ?? ''; // YYYY-MM-DD

    // Generate PDF blob from React component
    const blob = await pdf(
      <ManhourProgressReportPDF
        reportData={data}
        projectName={projectName}
        dimension={dimension}
        viewMode={viewMode}
        generatedDate={generatedDate}
        companyLogo={companyLogo ?? undefined}
      />
    ).toBlob();

    // Generate filename
    const filename = generateManhourProgressPDFFilename(
      projectName,
      dimension,
      viewMode,
      new Date()
    );

    return { blob, filename };
  };

  /**
   * Generate manhour PDF preview (returns blob and object URL without downloading)
   *
   * @param data - Manhour progress report data (rows and grand total)
   * @param projectName - Project name for filename and header
   * @param dimension - Report dimension: 'area' | 'system' | 'test_package'
   * @param viewMode - View mode: 'manhour' or 'manhour_percent'
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, url, filename }
   * @throws Error if generation fails or if another export is in progress
   */
  const generateManhourPDFPreview = async (
    data: ManhourReportData,
    projectName: string,
    dimension: GroupingDimension,
    viewMode: ReportViewMode,
    companyLogo?: string
  ): Promise<{ blob: Blob; url: string; filename: string }> => {
    // Prevent multiple simultaneous exports
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generateManhourPDFBlob(
        data,
        projectName,
        dimension,
        viewMode,
        companyLogo
      );

      // Create object URL for preview (caller is responsible for cleanup)
      const url = URL.createObjectURL(blob);

      return { blob, url, filename };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePDF,
    generatePDFPreview,
    generateManhourPDFPreview,
    isGenerating,
    error,
  };
}
