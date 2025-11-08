/**
 * ReportConfigList component (Feature 019 - T073)
 * Displays saved report configurations with Generate, Edit, and Delete actions
 */

import { Link } from 'react-router-dom';
import { useDeleteReportConfig } from '@/hooks/useReportConfigs';
import { Button } from '@/components/ui/button';
import { BarChart3, Plus, Play, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ReportConfig } from '@/types/reports';

interface ReportConfigListProps {
  configs: ReportConfig[];
  isLoading: boolean;
}

export function ReportConfigList({ configs, isLoading }: ReportConfigListProps) {
  const deleteConfig = useDeleteReportConfig();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (configId: string, configName: string) => {
    if (!confirm(`Are you sure you want to delete "${configName}"?`)) {
      return;
    }

    setDeletingId(configId);
    try {
      await deleteConfig.mutateAsync({ id: configId });
      toast.success('Report configuration deleted successfully');
    } catch (error) {
      toast.error('Failed to delete report configuration');
      console.error('Delete error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Reports</h3>
        <p className="text-sm text-gray-600 mb-6">
          Create your first report configuration to get started
        </p>
        <Button asChild>
          <Link to="/reports/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Link>
        </Button>
      </div>
    );
  }

  // Configs list
  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <div
          key={config.id}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Config Info */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{config.name}</h3>
            {config.description && (
              <p className="text-sm text-gray-600 mb-2">{config.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                Group by {config.groupingDimension.replace('_', ' ')}
              </span>
              <span>Updated {new Date(config.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              asChild
              variant="default"
              size="sm"
              className="flex-1 md:flex-initial"
            >
              <Link
                to={`/reports/view?dimension=${config.groupingDimension}`}
                state={{ configId: config.id }}
              >
                <Play className="h-4 w-4 mr-2" />
                Generate
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 md:flex-initial"
            >
              <Link to={`/reports/new?configId=${config.id}`}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(config.id, config.name)}
              disabled={deletingId === config.id}
              className="flex-1 md:flex-initial"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
