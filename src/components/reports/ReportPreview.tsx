/**
 * ReportPreview Component (Feature 019 - T024)
 * Displays generated report data with metadata (generation time, dimension)
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ReportTable } from './ReportTable';
import { PDFPreviewDialog } from './PDFPreviewDialog';
import { useComponentProgressPDFExport } from '@/hooks/useComponentProgressPDFExport';
import type { ReportData } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';

interface ReportPreviewProps {
  data: ReportData;
  projectName: string;
}

export function ReportPreview({ data, projectName }: ReportPreviewProps) {
  const { generatePDFPreview, isGenerating } = useComponentProgressPDFExport();

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

  const formattedDate = data.generatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  /**
   * Enhanced PDF export handler (preview first, then download from dialog)
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
          <div className="flex items-start justify-between">
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

        {/* Report Table */}
        <ReportTable data={data} />

        {/* Report Footer */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>
            This report shows progress percentages calculated using earned value methodology.
            Percentages reflect partial completion where applicable.
          </p>
        </div>
      </div>
    </>
  );
}
