/**
 * Welder Summary Report Page
 * Displays tier-grouped weld summary by welder with dynamic filters
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useProject } from '@/contexts/ProjectContext';
import { useProjects } from '@/hooks/useProjects';
import { useWelderSummaryReport } from '@/hooks/useWelderSummaryReport';
import { useWelderSummaryPDFExport } from '@/hooks/useWelderSummaryPDFExport';
import { usePDFPreviewState } from '@/hooks/usePDFPreviewState';
import { WelderSummaryReportTable } from '@/components/reports/WelderSummaryReportTable';
import { PDFPreviewDialog } from '@/components/reports/PDFPreviewDialog';
import { DEFAULT_WELDER_SUMMARY_FILTERS } from '@/types/weldSummary';
import type { WelderSummaryFilters } from '@/types/weldSummary';

export function WelderSummaryReportPage() {
  const { selectedProjectId } = useProject();
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === selectedProjectId);
  const [filters] = useState<WelderSummaryFilters>(DEFAULT_WELDER_SUMMARY_FILTERS);

  // Fetch report data
  const { data: reportData, isLoading, error } = useWelderSummaryReport({
    params: {
      p_project_id: currentProject?.id || '',
      p_start_date: filters.startDate,
      p_end_date: filters.endDate,
      p_welder_ids: filters.welderIds.length > 0 ? filters.welderIds : null,
      p_area_ids: filters.areaIds.length > 0 ? filters.areaIds : null,
      p_system_ids: filters.systemIds.length > 0 ? filters.systemIds : null,
      p_package_ids: filters.packageIds.length > 0 ? filters.packageIds : null,
    },
    enabled: !!currentProject?.id,
  });

  // PDF export hook
  const { generatePDFPreview } = useWelderSummaryPDFExport();

  // PDF preview state
  const { previewState, openPreview, closePreview } = usePDFPreviewState();

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (format === 'pdf') {
      if (!reportData || !currentProject) {
        toast.error('No data available to export');
        return;
      }

      try {
        const { blob, url, filename } = await generatePDFPreview(
          reportData,
          currentProject.name
        );
        openPreview(blob, url, filename);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF';
        toast.error(errorMessage);
      }
    } else {
      // TODO: Implement Excel and CSV export
      toast.info(`Export as ${format} - Coming soon!`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
          <p className="text-sm text-slate-600">Loading weld summary...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600 mb-2">Error loading report</p>
          <p className="text-sm text-slate-600">{error.message}</p>
        </div>
      </div>
    );
  }

  // No project selected
  if (!currentProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 mb-2">No project selected</p>
          <p className="text-sm text-slate-600">Please select a project to view the weld summary report.</p>
        </div>
      </div>
    );
  }

  // No data
  if (!reportData || reportData.rows.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <p className="text-lg font-semibold text-slate-900 mb-2">No welds found</p>
          <p className="text-sm text-slate-600">
            No completed welds found for this project. Welds must have a completion date (date_welded) to appear in this report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewState.open}
        onClose={closePreview}
        previewUrl={previewState.url}
        blob={previewState.blob}
        filename={previewState.filename}
      />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Weld Summary Report</h1>
            <p className="text-sm text-slate-600 mt-1">
              Tier-grouped summary by welder
            </p>
          </div>
        </div>

        {/* Filters Section - TODO: Implement filter controls */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">
            <strong>Filters:</strong> All time, All welders
            <span className="text-slate-400 ml-2">(Filter controls coming soon)</span>
          </p>
        </div>

        {/* Report Table */}
        <WelderSummaryReportTable
          reportData={reportData}
          projectName={currentProject.name}
          onExport={handleExport}
        />

        {/* Stats Footer */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{reportData.rows.length}</p>
              <p className="text-sm text-slate-600">Welders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{reportData.totals.welds_total}</p>
              <p className="text-sm text-slate-600">Total Welds</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{reportData.totals.nde_total}</p>
              <p className="text-sm text-slate-600">X-Rays Performed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {reportData.totals.reject_rate.toFixed(2)}%
              </p>
              <p className="text-sm text-slate-600">Rejection Rate</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
