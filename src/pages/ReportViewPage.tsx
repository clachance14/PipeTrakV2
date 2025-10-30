/**
 * ReportViewPage (Feature 019 - T026, T074)
 * Page for viewing a generated report with save configuration functionality
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { useProjects } from '@/hooks/useProjects';
import { useProgressReport } from '@/hooks/useProgressReport';
import { useCreateReportConfig } from '@/hooks/useReportConfigs';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { exportToPDF } from '@/lib/reportExport';
import { toast } from 'sonner';
import type { GroupingDimension } from '@/types/reports';

export function ReportViewPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProject();
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === selectedProjectId);
  const [searchParams] = useSearchParams();

  // Get dimension from URL query params (default to 'area')
  const dimension = (searchParams.get('dimension') as GroupingDimension) || 'area';

  const {
    data: reportData,
    isLoading,
    error,
  } = useProgressReport(selectedProjectId || '', dimension);

  // Save configuration dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const createConfig = useCreateReportConfig();

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      toast.error('Please enter a configuration name');
      return;
    }

    if (!selectedProjectId) {
      toast.error('No project selected');
      return;
    }

    try {
      await createConfig.mutateAsync({
        projectId: selectedProjectId,
        name: configName.trim(),
        description: configDescription.trim() || undefined,
        groupingDimension: dimension,
        hierarchicalGrouping: false,
        componentTypeFilter: null,
      });

      toast.success('Report configuration saved successfully');
      setShowSaveDialog(false);
      setConfigName('');
      setConfigDescription('');
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('A configuration with this name already exists');
      } else {
        toast.error('Failed to save configuration');
      }
      console.error('Save config error:', error);
    }
  };

  if (!currentProject) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>Please select a project to view reports.</p>
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
          <h1 className="text-3xl font-bold">View Progress Report</h1>
          <p className="text-muted-foreground mt-2">
            Progress report for {currentProject?.name || 'Unknown Project'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            Back to Reports
          </Button>
          <Button onClick={() => navigate('/reports/new')}>
            New Report
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading report...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="border border-destructive rounded-lg p-6 bg-destructive/10">
          <p className="text-destructive font-medium">Error loading report:</p>
          <p className="text-sm text-destructive mt-2">{error.message}</p>
        </div>
      )}

      {/* Report Preview */}
      {reportData && !isLoading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Report Data</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <ExportButtons
                reportData={reportData}
                projectName={currentProject?.name || 'Unknown Project'}
                onExportPDF={exportToPDF}
              />
            </div>
          </div>
          <ReportPreview data={reportData} projectName={currentProject?.name || 'Unknown Project'} />
        </div>
      )}

      {/* Save Configuration Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report Configuration</DialogTitle>
            <DialogDescription>
              Save this report configuration to quickly generate it again in the future.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="config-name" className="text-sm font-medium">
                Configuration Name *
              </label>
              <Input
                id="config-name"
                placeholder="e.g., Weekly Area Report"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="config-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="config-description"
                placeholder="Brief description of this report configuration"
                value={configDescription}
                onChange={(e) => setConfigDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">This configuration will save:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Grouping dimension: {dimension.replace('_', ' ')}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                setConfigName('');
                setConfigDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={createConfig.isPending || !configName.trim()}
            >
              {createConfig.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
