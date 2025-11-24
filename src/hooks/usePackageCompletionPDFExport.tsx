/**
 * usePackageCompletionPDFExport Hook
 * Feature 030: Test Package Workflow - PDF export for completion reports
 *
 * Lazy-loading PDF export hook for package completion/turnover reports.
 * Manages PDF generation lifecycle with loading states and error handling.
 *
 * Key Features:
 * - Lazy loads @react-pdf/renderer (700KB-1.2MB) only when needed
 * - Prevents multiple simultaneous exports
 * - Handles browser download triggering and permission errors
 * - Provides loading and error states for UI feedback
 * - Automatically cleans up object URLs
 * - Formats for 8.5 x 11 inch (US Letter) paper
 *
 * @example
 * ```tsx
 * function PackageCompletionReportPage() {
 *   const { generatePDF, isGenerating, error } = usePackageCompletionPDFExport();
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
 */

import { useState } from 'react';
import type { PackageCompletionReport } from '@/types/packageReport';

interface UsePackageCompletionPDFExportReturn {
  generatePDF: (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ) => Promise<Blob>;
  generatePDFPreview: (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ) => Promise<{ blob: Blob; url: string; filename: string }>;
  isGenerating: boolean;
  error: Error | null;
}

/**
 * usePackageCompletionPDFExport Hook
 *
 * @returns {UsePackageCompletionPDFExportReturn} Hook return object
 */
export function usePackageCompletionPDFExport(): UsePackageCompletionPDFExportReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generate PDF filename for package completion report
   *
   * @param packageName - Package name
   * @param date - Generation date
   * @returns Formatted filename
   */
  const generateFilename = (packageName: string, date: Date): string => {
    const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedName = packageName.replace(/[^a-zA-Z0-9-]/g, '_');
    return `Package_Completion_Report_${sanitizedName}_${timestamp}.pdf`;
  };

  /**
   * Generate PDF blob for preview or download
   * Internal helper function used by both generatePDF and generatePDFPreview
   *
   * @param data - Package completion report data
   * @param projectName - Project name for header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, filename }
   * @throws Error if generation fails
   */
  const generatePDFBlob = async (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    // Lazy load @react-pdf/renderer (dynamic import for code splitting)
    const { pdf } = await import('@react-pdf/renderer');
    const { PackageCompletionReportPDF } = await import(
      '@/components/pdf/reports/PackageCompletionReportPDF'
    );

    // Generate timestamp for filename
    const generatedDate = new Date().toISOString().split('T')[0] ?? ''; // YYYY-MM-DD

    // Generate PDF blob from React component
    const blob = await pdf(
      <PackageCompletionReportPDF
        reportData={data}
        projectName={projectName}
        generatedDate={generatedDate}
        companyLogo={companyLogo}
      />
    ).toBlob();

    // Generate filename
    const filename = generateFilename(data.package_name, new Date());

    return { blob, filename };
  };

  /**
   * Generate PDF preview (returns blob and object URL without downloading)
   *
   * @param data - Package completion report data
   * @param projectName - Project name for header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to { blob, url, filename }
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDFPreview = async (
    data: PackageCompletionReport,
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
      const { blob, filename } = await generatePDFBlob(data, projectName, companyLogo);

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
   * Generate and download package completion PDF report
   *
   * @param data - Package completion report data
   * @param projectName - Project name for header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @returns Promise resolving to PDF Blob after download initiated
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDF = async (
    data: PackageCompletionReport,
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
      const { blob, filename } = await generatePDFBlob(data, projectName, companyLogo);

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

  return {
    generatePDF,
    generatePDFPreview,
    isGenerating,
    error,
  };
}
