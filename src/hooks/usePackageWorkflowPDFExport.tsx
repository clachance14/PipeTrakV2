/**
 * usePackageWorkflowPDFExport Hook
 *
 * Lazy-loading PDF export hook for package workflow reports.
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
 * function PackageDetailPage() {
 *   const { generatePDF, isGenerating, error } = usePackageWorkflowPDFExport();
 *
 *   const handleExport = async () => {
 *     try {
 *       await generatePDF(
 *         packageData,
 *         workflowStages,
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
import type { PackageWorkflowStage } from '@/types/workflow.types';
import type { PackageWorkflowPDFOptions } from '@/stores/usePackageWorkflowCustomizationStore';
import { applyStageFilters } from '@/utils/pdfFilters';

interface PackageData {
  name: string;
  description: string | null;
  test_type: string | null;
  target_date: string | null;
  requires_coating: boolean | null;
  requires_insulation: boolean | null;
}

interface UsePackageWorkflowPDFExportReturn {
  generatePDF: (
    packageData: PackageData,
    workflowStages: PackageWorkflowStage[],
    projectName: string,
    companyLogo?: string,
    options?: PackageWorkflowPDFOptions
  ) => Promise<Blob>;
  generatePDFPreview: (
    packageData: PackageData,
    workflowStages: PackageWorkflowStage[],
    projectName: string,
    companyLogo?: string,
    options?: PackageWorkflowPDFOptions
  ) => Promise<{ blob: Blob; url: string; filename: string }>;
  isGenerating: boolean;
  error: Error | null;
}

/**
 * usePackageWorkflowPDFExport Hook
 */
export function usePackageWorkflowPDFExport(): UsePackageWorkflowPDFExportReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generate PDF blob for preview or download
   * Internal helper function used by both generatePDF and generatePDFPreview
   *
   * @param packageData - Package data (name, description, test_type, etc.)
   * @param workflowStages - Array of workflow stages with completion status
   * @param projectName - Project name for filename and header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @param options - Optional PDF customization options
   * @returns Promise resolving to { blob, filename }
   * @throws Error if generation fails
   */
  const generatePDFBlob = async (
    packageData: PackageData,
    workflowStages: PackageWorkflowStage[],
    projectName: string,
    companyLogo?: string,
    options?: PackageWorkflowPDFOptions
  ): Promise<{ blob: Blob; filename: string }> => {
    // Lazy load @react-pdf/renderer (large library)
    const { pdf } = await import('@react-pdf/renderer');
    const { PackageWorkflowReportPDF } = await import(
      '@/components/pdf/reports/PackageWorkflowReportPDF'
    );

    // Apply stage filters based on options
    const filteredStages = options
      ? applyStageFilters(workflowStages, options)
      : workflowStages;

    // Generate current date for report
    const generatedDate = new Date().toISOString().split('T')[0]!;

    // Generate filename (use custom title if provided)
    const reportTitle = options?.customTitle || packageData.name;
    const sanitizedPackageName = reportTitle.replace(/[^a-z0-9]/gi, '_');
    const filename = `${sanitizedPackageName}_Workflow_Report_${generatedDate}.pdf`;

    // Determine if company logo should be included
    const shouldIncludeLogo = options?.includeCompanyLogo !== false;

    // Generate PDF blob
    const blob = await pdf(
      <PackageWorkflowReportPDF
        packageData={packageData}
        workflowStages={filteredStages}
        projectName={projectName}
        generatedDate={generatedDate}
        {...(shouldIncludeLogo && companyLogo ? { companyLogo } : {})}
        {...(options ? { options } : {})}
      />
    ).toBlob();

    return { blob, filename };
  };

  /**
   * Generate PDF preview (returns blob and object URL without downloading)
   *
   * @param packageData - Package data (name, description, test_type, etc.)
   * @param workflowStages - Array of workflow stages with completion status
   * @param projectName - Project name for filename and header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @param options - Optional PDF customization options
   * @returns Promise resolving to { blob, url, filename }
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDFPreview = async (
    packageData: PackageData,
    workflowStages: PackageWorkflowStage[],
    projectName: string,
    companyLogo?: string,
    options?: PackageWorkflowPDFOptions
  ): Promise<{ blob: Blob; url: string; filename: string }> => {
    // Prevent multiple simultaneous exports
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(
        packageData,
        workflowStages,
        projectName,
        companyLogo,
        options
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
   * Generate and download package workflow PDF report
   *
   * @param packageData - Package data (name, description, test_type, etc.)
   * @param workflowStages - Array of workflow stages with completion status
   * @param projectName - Project name for filename and header
   * @param companyLogo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
   * @param options - Optional PDF customization options
   * @returns Promise resolving to PDF Blob after download initiated
   * @throws Error if generation fails or if another export is in progress
   */
  const generatePDF = async (
    packageData: PackageData,
    workflowStages: PackageWorkflowStage[],
    projectName: string,
    companyLogo?: string,
    options?: PackageWorkflowPDFOptions
  ): Promise<Blob> => {
    // Prevent multiple simultaneous exports
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(
        packageData,
        workflowStages,
        projectName,
        companyLogo,
        options
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

  return {
    generatePDF,
    generatePDFPreview,
    isGenerating,
    error,
  };
}
