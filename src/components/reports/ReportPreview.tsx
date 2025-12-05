/**
 * ReportPreview Component (Feature 019 - T024, Feature 032)
 * Displays generated report data with metadata (generation time, dimension)
 * Supports toggle between Count view and Manhour view
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ReportTable } from './ReportTable';
import { ManhourReportTable } from './ManhourReportTable';
import { ReportViewModeToggle } from './ReportViewModeToggle';
import { PDFPreviewDialog } from './PDFPreviewDialog';
import { useComponentProgressPDFExport } from '@/hooks/useComponentProgressPDFExport';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import type { ReportData, ManhourReportData, ReportViewMode } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';

interface ReportPreviewProps {
  data: ReportData;
  manhourData?: ManhourReportData;
  projectName: string;
  hasManhourBudget: boolean;
}

export function ReportPreview({
  data,
  manhourData,
  projectName,
  hasManhourBudget,
}: ReportPreviewProps) {
  const { generatePDFPreview, isGenerating } = useComponentProgressPDFExport();
  const { viewMode, setViewMode } = useReportPreferencesStore();

  // PDF Preview state
  const [previewState, setPreviewState] = useState<{
    open: boolean;
    url: string | null;
    filename: string | null;
    blob: Blob | null;
  }>({
    open: false,
    url: null,
    filename: null,
    blob: null,
  });

  // Use count data for date display (both should have similar generatedAt)
  const formattedDate = data.generatedAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Effective view mode (fall back to count if manhour data unavailable)
  const effectiveViewMode: ReportViewMode =
    viewMode === 'manhour' && manhourData && hasManhourBudget ? 'manhour' : 'count';

  /**
   * Enhanced PDF export handler (preview first, then download from dialog)
   * Currently only supports count view
   */
  const handleEnhancedPDFExport = async () => {
    try {
      const { blob, url, filename } = await generatePDFPreview(
        data,
        projectName,
        data.dimension,
        undefined // Optional company logo
      );

      setPreviewState({
        open: true,
        url,
        filename,
        blob,
      });
    } catch (err) {
      console.error('Enhanced PDF export error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  /**
   * Close preview dialog and cleanup object URL
   */
  const handleClosePreview = () => {
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }
    setPreviewState({
      open: false,
      url: null,
      filename: null,
      blob: null,
    });
  };

  /**
   * Cleanup effect - revoke object URL if component unmounts with open preview
   */
  useEffect(() => {
    return () => {
      if (previewState.url) {
        URL.revokeObjectURL(previewState.url);
      }
    };
  }, [previewState.url]);

  return (
    <>
      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewState.open}
        onClose={handleClosePreview}
        previewUrl={previewState.url}
        blob={previewState.blob}
        filename={previewState.filename}
      />

      <div className="space-y-6">
        {/* Report Header */}
        <div className="border-b pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Pipe Tracker - by {DIMENSION_LABELS[data.dimension]}
              </h1>
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Project:</span> {projectName}
                </p>
                <p>
                  <span className="font-medium">Generated:</span> {formattedDate}
                </p>
                <p>
                  <span className="font-medium">Grouping:</span> {DIMENSION_LABELS[data.dimension]}
                </p>
              </div>
            </div>

            {/* Controls: View Mode Toggle + Export Button */}
            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle */}
              <ReportViewModeToggle
                value={effectiveViewMode}
                onChange={setViewMode}
                hasBudget={hasManhourBudget}
              />

              {/* Export Button (Desktop only: ≥1024px) */}
              <div className="hidden lg:flex">
                <button
                  onClick={handleEnhancedPDFExport}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Preview and export report to PDF"
                >
                  {isGenerating ? 'Generating Preview...' : 'Preview & Export PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Table - Conditional based on view mode */}
        {effectiveViewMode === 'manhour' && manhourData ? (
          <ManhourReportTable data={manhourData} />
        ) : (
          <ReportTable data={data} />
        )}

        {/* Report Footer */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>
            {effectiveViewMode === 'manhour'
              ? 'This report shows manhour earned value calculated from component progress and project-specific milestone weights.'
              : 'This report shows progress percentages calculated using earned value methodology. Percentages reflect partial completion where applicable.'}
          </p>
        </div>
      </div>
    </>
  );
}
