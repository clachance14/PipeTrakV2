/**
 * ReportBuilderPage (Feature 019 - T025, T076)
 * Page for creating new progress reports with dimension selection
 * Supports loading from saved configurations
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { useProjects } from '@/hooks/useProjects';
import { useProgressReport } from '@/hooks/useProgressReport';
import { useReportConfigs } from '@/hooks/useReportConfigs';
import { DimensionSelector } from '@/components/reports/DimensionSelector';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { GroupingDimension } from '@/types/reports';

export function ReportBuilderPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProject();
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === selectedProjectId);
  const [searchParams] = useSearchParams();
  const [selectedDimension, setSelectedDimension] = useState<GroupingDimension>('area');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loadedConfigName, setLoadedConfigName] = useState<string | null>(null);

  // Load saved configs
  const { data: reportConfigs } = useReportConfigs(selectedProjectId || '');

  // Check if loading from a saved config
  const configId = searchParams.get('configId');

  // Load config parameters when configId changes
  useEffect(() => {
    if (configId && reportConfigs) {
      const config = reportConfigs.find((c) => c.id === configId);
      if (config) {
        setSelectedDimension(config.groupingDimension);
        setLoadedConfigName(config.name);
        toast.success(`Loaded configuration: ${config.name}`);
      } else {
        toast.error('Configuration not found');
      }
    }
  }, [configId, reportConfigs]);

  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useProgressReport(selectedProjectId || '', selectedDimension);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setHasGenerated(false);
    refetch().finally(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    });
  };

  if (!currentProject) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>Please select a project to generate reports.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {loadedConfigName ? `Edit: ${loadedConfigName}` : 'Generate Progress Report'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {loadedConfigName
              ? 'Modify the configuration and generate a new report'
              : 'Select a grouping dimension and generate a weekly progress report'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/reports')}>
          Back to Reports
        </Button>
      </div>

      {/* Configuration Section */}
      <div className="border rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold">Report Configuration</h2>

        <DimensionSelector
          value={selectedDimension}
          onChange={(dimension) => {
            setSelectedDimension(dimension);
            setHasGenerated(false); // Reset when dimension changes
          }}
          disabled={isGenerating}
        />

        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating || isLoading}
          size="default"
          className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800"
        >
          {isGenerating || isLoading ? 'Generating Report...' : 'Generate Report'}
        </Button>
      </div>

      {/* Report Preview Section */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Generating report...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-destructive rounded-lg p-6 bg-destructive/10">
          <p className="text-destructive font-medium">Error generating report:</p>
          <p className="text-sm text-destructive mt-2">{error.message}</p>
        </div>
      )}

      {hasGenerated && reportData && !isLoading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Report Preview</h2>
            <div className="flex gap-2">
              {/* Export buttons will be added in Phase 4 (User Story 2) */}
              <Button variant="outline" disabled>
                Export PDF (Coming Soon)
              </Button>
            </div>
          </div>
          <ReportPreview data={reportData} projectName={currentProject?.name || 'Unknown Project'} />
        </div>
      )}

      {!hasGenerated && !isLoading && !error && (
        <div className="text-center text-muted-foreground py-12 border rounded-lg">
          <p>Click "Generate Report" to view progress data.</p>
        </div>
      )}
      </div>
    </Layout>
  );
}
