/**
 * PackageCompletionReportPage
 * Feature 030: Test Package Workflow - Completion report view
 *
 * Dedicated page showing package components grouped by drawing
 * with weld log and NDE data for completion reporting.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { usePackageDetails } from '@/hooks/usePackages';
import { usePackageCompletionReport } from '@/hooks/usePackageCompletionReport';
import { usePackageCompletionPDFExport } from '@/hooks/usePackageCompletionPDFExport';
import { usePDFPreviewState } from '@/hooks/usePDFPreviewState';
import { PackageCompletionReport } from '@/components/packages/completion-report/PackageCompletionReport';
import { PackageSummaryTables } from '@/components/packages/completion-report/PackageSummaryTables';
import { PDFPreviewDialog } from '@/components/reports/PDFPreviewDialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

export function PackageCompletionReportPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();

  // Fetch package metadata for header
  const { data: packageDetails, isLoading: packageLoading } = usePackageDetails(packageId);

  // Fetch completion report data
  const {
    data: reportData,
    isLoading: reportLoading,
    isError,
    error,
  } = usePackageCompletionReport(packageId, selectedProjectId || '');

  // PDF export hook
  const { generatePDFPreview, isGenerating } = usePackageCompletionPDFExport();

  // PDF preview state
  const { previewState, openPreview, closePreview } = usePDFPreviewState();

  const isLoading = packageLoading || reportLoading;

  // Handle PDF export (opens preview dialog)
  const handleExportPDF = async () => {
    if (!reportData || !packageDetails) {
      toast.error('Cannot export: report data not loaded');
      return;
    }

    try {
      const { blob, url, filename } = await generatePDFPreview(
        reportData,
        packageDetails.name || 'Unknown Project'
      );
      openPreview(blob, url, filename);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  if (!packageId || !selectedProjectId) {
    return (
      <Layout>
        <EmptyState
          icon={ClipboardList}
          title="Package not found"
          description="The requested package could not be loaded."
        />
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <EmptyState
          icon={ClipboardList}
          title="Error loading completion report"
          description={error?.message || 'An error occurred while loading the completion report.'}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* Action Bar - Outside Paper */}
        <div className="flex items-center justify-between bg-slate-50 -mx-4 -mt-6 px-4 py-4 border-b border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/packages/${packageId}/components`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Package
          </Button>

          {/* Export PDF Button (Desktop Only) */}
          <div className="hidden lg:flex gap-2">
            <Button
              onClick={handleExportPDF}
              disabled={isGenerating || !reportData}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Preview & Export PDF'}
            </Button>
          </div>
        </div>

        {/* Paper Container - 8.5 x 11 aspect ratio */}
        <div className="mx-auto bg-white shadow-lg border border-slate-200 relative" style={{ maxWidth: '816px', width: '100%' }}>
          {/* Page Break Indicators - US Letter: 11 inches = 1056px at 96 DPI */}
          {/* Page 1 break */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 pointer-events-none z-10"
            style={{ top: '1056px' }}
          >
            <span className="absolute -top-3 right-4 bg-blue-400 text-white text-xs font-medium px-2 py-0.5 rounded shadow-sm">
              Page 1 / Page 2
            </span>
          </div>

          {/* Page 2 break */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 pointer-events-none z-10"
            style={{ top: '2112px' }}
          >
            <span className="absolute -top-3 right-4 bg-blue-400 text-white text-xs font-medium px-2 py-0.5 rounded shadow-sm">
              Page 2 / Page 3
            </span>
          </div>

          {/* Page 3 break */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 pointer-events-none z-10"
            style={{ top: '3168px' }}
          >
            <span className="absolute -top-3 right-4 bg-blue-400 text-white text-xs font-medium px-2 py-0.5 rounded shadow-sm">
              Page 3 / Page 4
            </span>
          </div>

          {/* Page 4 break */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 pointer-events-none z-10"
            style={{ top: '4224px' }}
          >
            <span className="absolute -top-3 right-4 bg-blue-400 text-white text-xs font-medium px-2 py-0.5 rounded shadow-sm">
              Page 4 / Page 5
            </span>
          </div>

          {/* Paper Content with padding similar to print margins */}
          <div className="p-12 space-y-6 relative">
            {/* Document Header */}
            <div className="border-b border-slate-300 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Package Completion Report
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {packageDetails?.name || 'Loading...'}
                  </p>
                </div>
                {reportData && (
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded text-sm font-bold ${
                      reportData.is_draft
                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                        : 'bg-green-100 text-green-800 border-2 border-green-400'
                    }`}
                  >
                    {reportData.is_draft ? 'DRAFT' : 'FINAL'}
                  </span>
                )}
              </div>
            </div>

            {/* Package Metadata */}
            {packageDetails && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Test Type
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {packageDetails.test_type || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Target Date
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {packageDetails.target_date
                        ? new Date(packageDetails.target_date).toLocaleDateString('en-US', {
                            timeZone: 'UTC',
                          })
                        : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Description
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {packageDetails.description || 'No description'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-center">
                  <ClipboardList className="mx-auto h-12 w-12 animate-pulse text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    Loading completion report...
                  </p>
                </div>
              </div>
            )}

            {/* Summary Tables */}
            {!isLoading && reportData && (
              <PackageSummaryTables
                componentSummary={reportData.component_summary}
                supportSummary={reportData.support_summary}
              />
            )}

            {/* Completion Report */}
            {!isLoading && reportData && (
              <PackageCompletionReport drawingGroups={reportData.drawing_groups} />
            )}
          </div>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewState.open}
        onClose={closePreview}
        previewUrl={previewState.url}
        blob={previewState.blob}
        filename={previewState.filename}
      />
    </Layout>
  );
}
