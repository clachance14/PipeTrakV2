/**
 * useWelderSummaryPDFExport Hook
 *
 * Lazy-loading PDF export hook for welder summary reports.
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
 * function WelderSummaryReportPage() {
 *   const { generatePDF, isGenerating, error } = useWelderSummaryPDFExport();
 *
 *   const handleExport = async () => {
 *     try {
 *       await generatePDF(
 *         reportData,
 *         'Project Name',
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
 * @returns {UseWelderSummaryPDFExportReturn} Hook API with generatePDF function, loading state, and error state
 * @returns {Function} returns.generatePDF - Async function to generate and download PDF
 * @returns {boolean} returns.isGenerating - Whether PDF generation is in progress
 * @returns {Error | null} returns.error - Error object if generation failed, null otherwise
 */

import { useState } from 'react';
import { generateWelderSummaryPDFFilename } from '@/lib/pdfUtils';
import type { WelderSummaryReport } from '@/types/weldSummary';
import type { UseWelderSummaryPDFExportReturn } from '@/types/pdf-components';

/**
 * useWelderSummaryPDFExport Hook
 *
 * @returns {UseWelderSummaryPDFExportReturn} Hook return object
 */
export function useWelderSummaryPDFExport(): UseWelderSummaryPDFExportReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generate PDF blob for preview or download
   * Internal helper function used by both generatePDF and generatePDFPreview
   *
   * @param data - Welder summary report data (rows, totals, filters)
   * @param projectName - Project name for filename and header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, filename }
   * @throws Error if generation fails
   */
  const generatePDFBlob = async (
    data: WelderSummaryReport,
    projectName: string,
    companyLogo?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    // Lazy load @react-pdf/renderer (dynamic import for code splitting)
    const { pdf } = await import('@react-pdf/renderer');
    const { WelderSummaryReportPDF } = await import(
      '@/components/pdf/reports/WelderSummaryReportPDF'
    );

    // Generate timestamp for filename
    const generatedDate = new Date().toISOString().split('T')[0] ?? ''; // YYYY-MM-DD

    // Generate PDF blob from React component
    const blob = await pdf(
      <WelderSummaryReportPDF
        reportData={data}
        projectName={projectName}
        generatedDate={generatedDate}
        companyLogo={companyLogo ?? undefined}
      />
    ).toBlob();

    // Generate filename
    const filename = generateWelderSummaryPDFFilename(
      projectName,
      new Date()
    );

    return { blob, filename };
  };

  /**
   * Generate PDF preview (returns blob and object URL without downloading)
   *
   * @param data - Welder summary report data (rows, totals, filters)
   * @param projectName - Project name for filename and header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, url, filename }
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDFPreview = async (
    data: WelderSummaryReport,
    projectName: string,
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
   * Generate and download welder summary PDF report
   *
   * @param data - Welder summary report data (rows, totals, filters)
   * @param projectName - Project name for filename and header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to PDF Blob after download initiated
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDF = async (
    data: WelderSummaryReport,
    projectName: string,
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
        companyLogo
      );

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      try {
        link.click();
      } catch {
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

  return {
    generatePDF,
    generatePDFPreview,
    isGenerating,
    error,
  };
}
