/**
 * ReportsPage (Feature 019 + Field Weld Reports + Feature 032 Manhour Earned Value)
 * Tabbed interface for Component Progress and Field Weld progress reports
 * Supports toggle between Count view and Manhour view for Component Progress
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { useProjects } from '@/hooks/useProjects';
import { useProgressReport } from '@/hooks/useProgressReport';
import { useManhourProgressReport } from '@/hooks/useManhourProgressReport';
import { useManhourBudget } from '@/hooks/useManhourBudget';
import { useFieldWeldProgressReport } from '@/hooks/useFieldWeldProgressReport';
import { useWelderSummaryReport } from '@/hooks/useWelderSummaryReport';
import { DimensionSelector } from '@/components/reports/DimensionSelector';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { FieldWeldReportTable } from '@/components/reports/FieldWeldReportTable';
import { WelderSummaryReportTable } from '@/components/reports/WelderSummaryReportTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupingDimension, FieldWeldGroupingDimension, ExportFormat } from '@/types/reports';
import { exportFieldWeldReport } from '@/lib/exportFieldWeldReport';

export function ReportsPage() {
  const { selectedProjectId } = useProject();
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === selectedProjectId);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab and dimension from URL, with defaults
  const activeTab = searchParams.get('tab') || 'component-progress';
  const urlDimension = searchParams.get('dimension');

  const [componentDimension, setComponentDimension] = useState<GroupingDimension>(
    (urlDimension as GroupingDimension) || 'area'
  );
  const [fieldWeldDimension, setFieldWeldDimension] = useState<FieldWeldGroupingDimension>(
    (urlDimension as FieldWeldGroupingDimension) || 'area'
  );

  // Fetch component progress report
  const {
    data: componentReportData,
    isLoading: isLoadingComponent,
    error: componentError,
  } = useProgressReport(selectedProjectId || '', componentDimension);

  // Fetch manhour progress report (for manhour view toggle)
  const {
    data: manhourReportData,
    isLoading: isLoadingManhour,
  } = useManhourProgressReport(selectedProjectId || '', componentDimension);

  // Fetch manhour budget to check if manhour view should be enabled
  const { data: manhourBudget } = useManhourBudget(selectedProjectId || '');
  const hasManhourBudget = !!manhourBudget;

  // Fetch field weld progress report (for area, system, test_package, overall dimensions)
  const {
    data: fieldWeldReportData,
    isLoading: isLoadingFieldWeld,
    error: fieldWeldError,
  } = useFieldWeldProgressReport(selectedProjectId || '', fieldWeldDimension);

  // Fetch welder summary report (tier-grouped format for welder dimension)
  const {
    data: welderSummaryData,
    isLoading: isLoadingWelderSummary,
    error: welderSummaryError,
  } = useWelderSummaryReport({
    params: {
      p_project_id: selectedProjectId || '',
      p_start_date: null,
      p_end_date: null,
      p_welder_ids: null,
      p_area_ids: null,
      p_system_ids: null,
      p_package_ids: null,
    },
    enabled: !!selectedProjectId && fieldWeldDimension === 'welder',
  });

  // Update URL when tab or dimension changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);

    if (activeTab === 'component-progress') {
      params.set('dimension', componentDimension);
    } else if (activeTab === 'field-welds') {
      params.set('dimension', fieldWeldDimension);
    }

    setSearchParams(params, { replace: true });
  }, [activeTab, componentDimension, fieldWeldDimension, setSearchParams]);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams();
    params.set('tab', tab);

    if (tab === 'component-progress') {
      params.set('dimension', componentDimension);
    } else if (tab === 'field-welds') {
      params.set('dimension', fieldWeldDimension);
    }

    setSearchParams(params, { replace: true });
  };

  const handleComponentDimensionChange = (dimension: GroupingDimension) => {
    setComponentDimension(dimension);
  };

  const handleFieldWeldDimensionChange = (dimension: FieldWeldGroupingDimension) => {
    setFieldWeldDimension(dimension);
  };

  // Export handlers
  const handleFieldWeldExport = (format: ExportFormat) => {
    if (!fieldWeldReportData) {
      toast.error('No report data available to export');
      return;
    }

    try {
      exportFieldWeldReport(
        fieldWeldReportData,
        format,
        currentProject?.name || 'Unknown Project'
      );
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
              Please select a project to access reports.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Reports</h1>
          <p className="text-gray-600">
            View component and field weld progress reports for {currentProject?.name || 'your project'}
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="bg-white rounded-lg shadow">
          <TabsList className="grid w-full grid-cols-2 rounded-t-lg">
            <TabsTrigger value="component-progress">
              Component Progress
            </TabsTrigger>
            <TabsTrigger value="field-welds">
              Field Welds
            </TabsTrigger>
          </TabsList>

          {/* Component Progress Tab */}
          <TabsContent value="component-progress" className="p-6 m-0 space-y-6">
            <div className="space-y-4">
              <DimensionSelector
                value={componentDimension}
                onChange={handleComponentDimensionChange}
                disabled={isLoadingComponent}
              />

              {(isLoadingComponent || isLoadingManhour) && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading component progress report...</p>
                  </div>
                </div>
              )}

              {componentError && (
                <div className="border border-destructive rounded-lg p-6 bg-destructive/10">
                  <p className="text-destructive font-medium">Error loading component progress report:</p>
                  <p className="text-sm text-destructive mt-2">{componentError.message}</p>
                </div>
              )}

              {componentReportData && !isLoadingComponent && !isLoadingManhour && !componentError && (
                <>
                  {componentReportData.rows.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Components Found</h3>
                      <p className="text-sm text-muted-foreground">
                        No components exist in this project yet. Import components to see progress data.
                      </p>
                    </div>
                  ) : (
                    <ReportPreview
                      data={componentReportData}
                      manhourData={manhourReportData}
                      projectName={currentProject?.name || 'Unknown Project'}
                      hasManhourBudget={hasManhourBudget}
                    />
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Field Welds Tab */}
          <TabsContent value="field-welds" className="p-6 m-0 space-y-6">
            <div className="space-y-4">
              <DimensionSelector
                variant="field-weld"
                value={fieldWeldDimension}
                onChange={handleFieldWeldDimensionChange}
                disabled={fieldWeldDimension === 'welder' ? isLoadingWelderSummary : isLoadingFieldWeld}
              />

              {/* Conditional rendering based on dimension */}
              {fieldWeldDimension === 'welder' ? (
                <>
                  {/* Welder Summary Report (tier-grouped format) */}
                  {isLoadingWelderSummary && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground">Loading welder summary report...</p>
                      </div>
                    </div>
                  )}

                  {welderSummaryError && (
                    <div className="border border-destructive rounded-lg p-6 bg-destructive/10">
                      <p className="text-destructive font-medium">Error loading welder summary report:</p>
                      <p className="text-sm text-destructive mt-2">{welderSummaryError.message}</p>
                    </div>
                  )}

                  {welderSummaryData && !isLoadingWelderSummary && !welderSummaryError && (
                    <>
                      {welderSummaryData.rows.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg">
                          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Welds Found</h3>
                          <p className="text-sm text-muted-foreground">
                            No completed welds found for this project. Welds must have a completion date (date_welded) to appear in this report.
                          </p>
                        </div>
                      ) : (
                        <WelderSummaryReportTable
                          reportData={welderSummaryData}
                          projectName={currentProject?.name || 'Unknown Project'}
                        />
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Standard Field Weld Report (area, system, test_package, overall) */}
                  {isLoadingFieldWeld && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground">Loading field weld progress report...</p>
                      </div>
                    </div>
                  )}

                  {fieldWeldError && (
                    <div className="border border-destructive rounded-lg p-6 bg-destructive/10">
                      <p className="text-destructive font-medium">Error loading field weld progress report:</p>
                      <p className="text-sm text-destructive mt-2">{fieldWeldError.message}</p>
                    </div>
                  )}

                  {fieldWeldReportData && !isLoadingFieldWeld && !fieldWeldError && (
                    <>
                      {fieldWeldReportData.rows.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg">
                          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Field Welds Found</h3>
                          <p className="text-sm text-muted-foreground">
                            No field welds exist in this project yet. Import field welds to see progress data.
                          </p>
                        </div>
                      ) : (
                        <FieldWeldReportTable
                          reportData={fieldWeldReportData}
                          projectName={currentProject?.name || 'Unknown Project'}
                          onExport={handleFieldWeldExport}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
