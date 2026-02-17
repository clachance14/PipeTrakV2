/**
 * ReportPreview Component (Feature 019 - T024, Feature 032, Feature 033)
 * Displays generated report data with metadata (generation time, dimension)
 * Supports toggle between Count view and Manhour view
 * Supports date range filtering for delta reports (Feature 033)
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ReportTable } from './ReportTable';
import { ManhourReportTable } from './ManhourReportTable';
import { ManhourPercentReportTable } from './ManhourPercentReportTable';
import { ManhourBudgetReportTable } from './ManhourBudgetReportTable';
import { DeltaReportTable } from './DeltaReportTable';
import { DateRangeFilter } from './DateRangeFilter';
import { NoActivityFound } from './NoActivityFound';
import { ReportViewModeToggle } from './ReportViewModeToggle';
import { PDFPreviewDialog } from './PDFPreviewDialog';
import { useComponentProgressPDFExport } from '@/hooks/useComponentProgressPDFExport';
import { useProgressDeltaReport } from '@/hooks/useProgressDeltaReport';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { useOrganizationLogo } from '@/hooks/useOrganizationLogo';
import { sortComponentReportRows, sortManhourReportRows, sortManhourBudgetReportRows } from '@/lib/report-sorting';
import { buildPDFSubtitle } from '@/lib/pdfUtils';
import type { ReportData, ManhourReportData, ReportViewMode } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';
import type { ComponentReportSortColumn, ManhourReportSortColumn, ManhourBudgetReportSortColumn } from '@/stores/useReportPreferencesStore';

/** Maps sort column keys to human-readable labels for PDF subtitle */
const COMPONENT_SORT_LABELS: Record<ComponentReportSortColumn, string> = {
  name: 'Name',
  budget: 'Budget',
  pctReceived: 'Received',
  pctInstalled: 'Installed',
  pctPunch: 'Punch',
  pctTested: 'Tested',
  pctRestored: 'Restored',
  pctTotal: '% Complete',
};

const MANHOUR_SORT_LABELS: Record<ManhourReportSortColumn, string> = {
  name: 'Name',
  mhBudget: 'MH Budget',
  receiveMhEarned: 'Receive',
  installMhEarned: 'Install',
  punchMhEarned: 'Punch',
  testMhEarned: 'Test',
  restoreMhEarned: 'Restore',
  totalMhEarned: 'Total Earned',
  mhPctComplete: '% Complete',
};

const BUDGET_SORT_LABELS: Record<ManhourBudgetReportSortColumn, string> = {
  name: 'Name',
  mhBudget: 'MH Budget',
  receiveMhBudget: 'Receive',
  installMhBudget: 'Install',
  punchMhBudget: 'Punch',
  testMhBudget: 'Test',
  restoreMhBudget: 'Restore',
};

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
  const { generatePDFPreview, generateManhourPDFPreview, generateBudgetPDFPreview, isGenerating } = useComponentProgressPDFExport();
  const { viewMode, setViewMode, dateRange, componentReport, manhourReport, manhourBudgetReport } = useReportPreferencesStore();
  const { data: companyLogo } = useOrganizationLogo();

  // Determine if delta mode is active (any date filter other than all_time)
  const isDeltaMode = dateRange.preset !== 'all_time';

  // Fetch delta data when in delta mode
  const {
    data: deltaData,
    isLoading: isDeltaLoading,
    error: deltaError,
  } = useProgressDeltaReport(data.projectId, data.dimension, dateRange);

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
  const effectiveViewMode: ReportViewMode = (() => {
    if ((viewMode === 'manhour' || viewMode === 'manhour_percent' || viewMode === 'manhour_budget') && manhourData && hasManhourBudget) {
      return viewMode;
    }
    return 'count';
  })();

  /**
   * Enhanced PDF export handler (preview first, then download from dialog)
   * Supports count, manhour, manhour_percent, and manhour_budget views
   */
  const handleEnhancedPDFExport = async () => {
    try {
      let result: { blob: Blob; url: string; filename: string };

      if (effectiveViewMode === 'count') {
        // Count view: pre-sort rows to match current table view
        const sortedData: ReportData = {
          ...data,
          rows: sortComponentReportRows(data.rows, componentReport.sortColumn, componentReport.sortDirection),
        };
        const subtitle = buildPDFSubtitle(
          COMPONENT_SORT_LABELS[componentReport.sortColumn],
          componentReport.sortDirection,
          dateRange
        );
        result = await generatePDFPreview(
          sortedData,
          projectName,
          data.dimension,
          companyLogo ?? undefined,
          subtitle
        );
      } else if (effectiveViewMode === 'manhour_budget' && manhourData) {
        // Budget view: pre-sort rows to match current table view
        const sortedBudgetData: ManhourReportData = {
          ...manhourData,
          rows: sortManhourBudgetReportRows(manhourData.rows, manhourBudgetReport.sortColumn, manhourBudgetReport.sortDirection),
        };
        const subtitle = buildPDFSubtitle(
          BUDGET_SORT_LABELS[manhourBudgetReport.sortColumn],
          manhourBudgetReport.sortDirection,
          dateRange
        );
        result = await generateBudgetPDFPreview(
          sortedBudgetData,
          projectName,
          manhourData.dimension,
          companyLogo ?? undefined,
          subtitle
        );
      } else if (manhourData) {
        // Manhour views: pre-sort rows to match current table view
        const sortedManhourData: ManhourReportData = {
          ...manhourData,
          rows: sortManhourReportRows(manhourData.rows, manhourReport.sortColumn, manhourReport.sortDirection),
        };
        const subtitle = buildPDFSubtitle(
          MANHOUR_SORT_LABELS[manhourReport.sortColumn],
          manhourReport.sortDirection,
          dateRange
        );
        result = await generateManhourPDFPreview(
          sortedManhourData,
          projectName,
          manhourData.dimension,
          effectiveViewMode,
          companyLogo ?? undefined,
          subtitle
        );
      } else {
        throw new Error('Manhour data not available');
      }

      setPreviewState({
        open: true,
        url: result.url,
        filename: result.filename,
        blob: result.blob,
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

            {/* Controls: Date Range Filter + View Mode Toggle + Export Button */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Filter */}
              <DateRangeFilter />

              {/* View Mode Toggle - only show when not in delta mode */}
              {!isDeltaMode && (
                <ReportViewModeToggle
                  value={effectiveViewMode}
                  onChange={setViewMode}
                  hasBudget={hasManhourBudget}
                />
              )}

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

        {/* Report Table - Conditional based on view mode and delta mode */}
        {isDeltaMode ? (
          // Delta mode: Show delta report or loading/error/empty states
          isDeltaLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : deltaError ? (
            <div className="text-center py-12 text-red-600">
              Failed to load delta report. Please try again.
            </div>
          ) : deltaData && deltaData.rows.length > 0 ? (
            <DeltaReportTable data={deltaData} />
          ) : (
            <NoActivityFound dateRange={dateRange} />
          )
        ) : // Standard mode: Show regular report tables
        effectiveViewMode === 'manhour_budget' && manhourData ? (
          <ManhourBudgetReportTable data={manhourData} />
        ) : effectiveViewMode === 'manhour_percent' && manhourData ? (
          <ManhourPercentReportTable data={manhourData} />
        ) : effectiveViewMode === 'manhour' && manhourData ? (
          <ManhourReportTable data={manhourData} />
        ) : (
          <ReportTable data={data} />
        )}

        {/* Report Footer */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>
            {isDeltaMode
              ? 'This report shows progress change (delta) for the selected time period. Positive values indicate progress gained, negative values indicate rollbacks.'
              : effectiveViewMode === 'manhour_budget'
                ? 'This report shows manhour budget distribution per milestone (Receive, Install, Punch, Test, Restore). Use for P6 planning and budget allocation.'
                : effectiveViewMode === 'manhour_percent'
                  ? 'This report shows completion percentage per milestone, calculated as (earned MH / budget MH) for each milestone.'
                  : effectiveViewMode === 'manhour'
                    ? 'This report shows manhour earned value calculated from component progress and project-specific milestone weights.'
                    : 'This report shows progress percentages calculated using earned value methodology. Percentages reflect partial completion where applicable.'}
          </p>
        </div>
      </div>
    </>
  );
}
