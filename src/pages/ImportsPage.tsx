import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { EmptyState } from '@/components/EmptyState';
import { Upload, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

export function ImportsPage() {
  const { selectedProjectId } = useProject();

  const { data: recentImports, isLoading, isError, error, refetch } = useAuditLog(
    selectedProjectId || '',
    { action_type: 'import', limit: 10 }
  );

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Upload}
            title="No Project Selected"
            description="Please select a project from the dropdown to import data."
          />
        </div>
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
            <p className="text-gray-600 mt-1">Upload Excel/CSV files to import components</p>
          </div>
          <div className="bg-white rounded-lg shadow p-8 animate-pulse">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="h-48 bg-gray-100 rounded-lg" />
              <div className="h-32 bg-gray-100 rounded-lg" />
              <div className="h-24 bg-gray-100 rounded-lg" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load import history</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          <p className="text-gray-600 mt-1">Upload Excel/CSV files to import components</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="max-w-2xl mx-auto">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold text-blue-600 hover:text-blue-700">Click to upload</span> or drag and
                drop
              </p>
              <p className="mt-1 text-xs text-gray-500">Excel (.xlsx) or CSV files up to 10MB</p>
            </div>

            {/* Template Downloads */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Download Templates</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">Spools Import Template</span>
                  <Download className="h-5 w-5 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">Field Welds Import Template</span>
                  <Download className="h-5 w-5 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">Valves/Fittings Import Template</span>
                  <Download className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Recent Imports */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Imports</h3>
              {!recentImports || recentImports.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No recent imports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentImports.map((entry) => {
                    const payload = entry.metadata as { filename?: string; count?: number; status?: string } | null;
                    const filename = payload?.filename || 'Unknown file';
                    const count = payload?.count || 0;
                    const status = payload?.status || 'success';

                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{filename}</p>
                          <p className="text-xs text-gray-500">
                            {count} component{count !== 1 ? 's' : ''} imported • {formatTimeAgo(entry.created_at)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
