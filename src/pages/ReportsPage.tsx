/**
 * ReportsPage (Feature 019 - T044, T075)
 * Landing page for reports with "Create New Report" button and saved configs list
 */

import { Layout } from '@/components/Layout';
import { Link } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { useReportConfigs } from '@/hooks/useReportConfigs';
import { ReportConfigList } from '@/components/reports/ReportConfigList';
import { Button } from '@/components/ui/button';
import { BarChart3, Plus } from 'lucide-react';

export function ReportsPage() {
  const { selectedProjectId } = useProject();
  const { data: reportConfigs, isLoading } = useReportConfigs(selectedProjectId || '');

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-gray-600">
              Generate progress reports grouped by Area, System, or Test Package
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/reports/new">
              <Plus className="h-5 w-5 mr-2" />
              Create New Report
            </Link>
          </Button>
        </div>

        {/* Saved Report Configurations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Saved Report Configurations</h2>
          <ReportConfigList configs={reportConfigs || []} isLoading={isLoading} />
        </div>
      </div>
    </Layout>
  );
}
