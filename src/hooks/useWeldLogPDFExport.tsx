/**
 * useWeldLogPDFExport Hook
 *
 * Lazy-loading PDF export hook for weld log.
 * Manages PDF generation lifecycle with loading states and error handling.
 *
 * Key Features:
 * - Supports two PDF engines: 'react-pdf' (default) and 'pdfmake'
 * - Lazy loads PDF libraries only when needed
 * - Prevents multiple simultaneous exports
 * - Handles browser download triggering and permission errors
 * - Provides loading and error states for UI feedback
 * - Automatically cleans up object URLs
 *
 * @example
 * ```tsx
 * function WeldLogPage() {
 *   const { generatePDFPreview, isGenerating, error } = useWeldLogPDFExport();
 *   const { previewState, openPreview, closePreview } = usePDFPreviewState();
 *
 *   const handleExport = async () => {
 *     try {
 *       const { blob, url, filename } = await generatePDFPreview(
 *         filteredWelds,
 *         'Project Name',
 *         companyLogo, // optional
 *         'pdfmake'    // optional: use pdfmake engine
 *       );
 *       openPreview(blob, url, filename);
 *       toast.success('PDF preview ready');
 *     } catch (err) {
 *       toast.error('Failed to generate PDF');
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <Button onClick={handleExport} disabled={isGenerating}>
 *         {isGenerating ? 'Generating Preview...' : 'Preview & Export PDF'}
 *       </Button>
 *       <PDFPreviewDialog
 *         open={previewState.open}
 *         onClose={closePreview}
 *         previewUrl={previewState.url}
 *         blob={previewState.blob}
 *         filename={previewState.filename}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

import { useState } from 'react';
import { sanitizeFilename, formatDateForFilename } from '@/lib/pdfUtils';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';

/**
 * PDF rendering engine selection
 * - 'react-pdf': Uses @react-pdf/renderer (flexbox-based, legacy)
 * - 'pdfmake': Uses pdfmake (native tables, better alignment)
 */
export type PdfEngine = 'react-pdf' | 'pdfmake';

export interface UseWeldLogPDFExportReturn {
  generatePDF: (
    welds: EnrichedFieldWeld[],
    projectName: string,
    companyLogo?: string,
    engine?: PdfEngine
  ) => Promise<Blob>;
  generatePDFPreview: (
    welds: EnrichedFieldWeld[],
    projectName: string,
    companyLogo?: string,
    engine?: PdfEngine
  ) => Promise<{ blob: Blob; url: string; filename: string }>;
  isGenerating: boolean;
  error: Error | null;
}

/**
 * Generate filename for weld log PDF export
 * Pattern: [project-name]_weld_log_[YYYY-MM-DD].pdf
 */
function generateWeldLogPDFFilename(
  projectName: string,
  date: Date = new Date()
): string {
  const sanitizedProjectName = sanitizeFilename(projectName);
  const formattedDate = formatDateForFilename(date);
  return `${sanitizedProjectName}_weld_log_${formattedDate}.pdf`;
}

/**
 * useWeldLogPDFExport Hook
 */
export function useWeldLogPDFExport(): UseWeldLogPDFExportReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generate PDF blob for preview or download
   * Internal helper function used by both generatePDF and generatePDFPreview
   *
   * @param welds - Array of enriched field weld data
   * @param projectName - Name of the project for header
   * @param companyLogo - Optional base64-encoded logo
   * @param engine - PDF engine to use ('react-pdf' or 'pdfmake')
   */
  const generatePDFBlob = async (
    welds: EnrichedFieldWeld[],
    projectName: string,
    companyLogo?: string,
    engine: PdfEngine = 'react-pdf'
  ): Promise<{ blob: Blob; filename: string }> => {
    // Generate timestamp for filename
    const generatedDate = new Date().toISOString().split('T')[0] ?? ''; // YYYY-MM-DD

    let blob: Blob;

    if (engine === 'pdfmake') {
      // Lazy load pdfmake generator
      const { generateWeldLogPdfMake } = await import('@/lib/pdf/weldLogPdfMake');
      blob = await generateWeldLogPdfMake({
        welds,
        projectName,
        generatedDate,
        companyLogo,
      });
    } else {
      // Lazy load @react-pdf/renderer (default)
      const { pdf } = await import('@react-pdf/renderer');
      const { WeldLogReportPDF } = await import(
        '@/components/pdf/reports/WeldLogReportPDF'
      );

      // Generate PDF blob from React component
      blob = await pdf(
        <WeldLogReportPDF
          welds={welds}
          projectName={projectName}
          generatedDate={generatedDate}
          companyLogo={companyLogo}
        />
      ).toBlob();
    }

    // Generate filename
    const filename = generateWeldLogPDFFilename(projectName, new Date());

    return { blob, filename };
  };

  /**
   * Generate PDF preview (returns blob and object URL without downloading)
   *
   * @param welds - Array of enriched field weld data
   * @param projectName - Name of the project for header
   * @param companyLogo - Optional base64-encoded logo
   * @param engine - PDF engine to use (default: 'react-pdf')
   */
  const generatePDFPreview = async (
    welds: EnrichedFieldWeld[],
    projectName: string,
    companyLogo?: string,
    engine: PdfEngine = 'react-pdf'
  ): Promise<{ blob: Blob; url: string; filename: string }> => {
    // Prevent multiple simultaneous exports
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(
        welds,
        projectName,
        companyLogo,
        engine
      );

      // Create object URL for preview (caller is responsible for cleanup)
      const url = URL.createObjectURL(blob);

      return { blob, url, filename };
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate and download weld log PDF
   *
   * @param welds - Array of enriched field weld data
   * @param projectName - Name of the project for header
   * @param companyLogo - Optional base64-encoded logo
   * @param engine - PDF engine to use (default: 'react-pdf')
   */
  const generatePDF = async (
    welds: EnrichedFieldWeld[],
    projectName: string,
    companyLogo?: string,
    engine: PdfEngine = 'react-pdf'
  ): Promise<Blob> => {
    // Prevent multiple simultaneous exports
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(
        welds,
        projectName,
        companyLogo,
        engine
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
      const error =
        err instanceof Error
          ? err
          : new Error('Unknown error during PDF generation');
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
