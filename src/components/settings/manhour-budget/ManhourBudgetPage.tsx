/**
 * ManhourBudgetPage component (Feature 032 - US1)
 * Settings page for viewing and managing project manhour budgets
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { useManhourPermissions } from '@/lib/permissions/manhour-permissions';
import { useManhourBudget, useBudgetVersionHistory } from '@/hooks/useManhourBudget';
import { BudgetCreateForm } from './BudgetCreateForm';
import { DistributionResults } from './DistributionResults';
import { BudgetVersionHistory } from './BudgetVersionHistory';
import { Calendar, DollarSign, FileText, Plus } from 'lucide-react';

// Type for distribution result from RPC (matches CreateBudgetResult from BudgetCreateForm)
interface DistributionResult {
  success: boolean;
  budget_id?: string;
  version_number?: number;
  distribution_summary?: {
    total_components: number;
    components_allocated: number;
    components_with_warnings: number;
    total_weight: number;
    total_allocated_mh: number;
  };
  warnings?: Array<{
    component_id: string;
    message: string;
  }>;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateString: string): string {
  // Parse as local date to avoid timezone shift for date-only strings
  const parts = dateString.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function ManhourBudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { canEditBudget } = useManhourPermissions();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);

  const { data: activeBudget, isLoading, error } = useManhourBudget(projectId ?? '');
  const { data: versions } = useBudgetVersionHistory(projectId ?? '');

  if (isLoading) {
    return (
      <SettingsLayout
        title="Manhour Budget"
        description="Manage manhour budget and track earned value"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-600">Loading budget...</div>
        </div>
      </SettingsLayout>
    );
  }

  if (error) {
    return (
      <SettingsLayout
        title="Manhour Budget"
        description="Manage manhour budget and track earned value"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-600">
            Error loading budget: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  const hasActiveBudget = !!activeBudget;

  return (
    <SettingsLayout
      title="Manhour Budget"
      description="Manage manhour budget and track earned value for this project"
    >
      <div className="space-y-6">
        {/* No Budget State */}
        {!hasActiveBudget && !showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>No Budget Configured</CardTitle>
              <CardDescription>
                Create a manhour budget to enable earned value tracking for this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canEditBudget ? (
                <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Budget
                </Button>
              ) : (
                <p className="text-sm text-slate-500">
                  Contact a Project Manager or Admin to create a budget.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Budget Form */}
        {showCreateForm && projectId && !distributionResult && (
          <Card>
            <CardHeader>
              <CardTitle>{hasActiveBudget ? 'Create New Budget Version' : 'Create Manhour Budget'}</CardTitle>
              <CardDescription>
                {hasActiveBudget
                  ? 'Create a new version of the manhour budget. This will recalculate distribution for all components.'
                  : 'Set the total manhour budget for this project. Manhours will be distributed to all components based on their calculated weight.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetCreateForm
                projectId={projectId}
                onSuccess={(result) => {
                  if (result.distribution_summary) {
                    setDistributionResult(result);
                  }
                  setShowCreateForm(false);
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* Distribution Results */}
        {distributionResult && distributionResult.distribution_summary && (
          <DistributionResults
            summary={distributionResult.distribution_summary}
            warnings={distributionResult.warnings ?? []}
            onDismiss={() => setDistributionResult(null)}
          />
        )}

        {/* Active Budget Summary */}
        {hasActiveBudget && activeBudget && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Current Budget (v{activeBudget.version_number})</CardTitle>
                    <CardDescription>Active manhour budget for this project</CardDescription>
                  </div>
                  {canEditBudget && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Create New Version
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Budgeted Manhours */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Budgeted</p>
                      <p className="text-2xl font-semibold text-slate-900">
                        {formatNumber(activeBudget.total_budgeted_manhours)}
                      </p>
                      <p className="text-xs text-slate-500">manhours</p>
                    </div>
                  </div>

                  {/* Revision Reason */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Revision Reason</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {activeBudget.revision_reason}
                      </p>
                    </div>
                  </div>

                  {/* Effective Date */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Effective Date</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {formatDate(activeBudget.effective_date)}
                      </p>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Created</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {formatDate(activeBudget.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget Version History */}
            <BudgetVersionHistory
              versions={versions || []}
              activeBudgetId={activeBudget.id}
            />
          </>
        )}

        {/* Read-Only Notice */}
        {!canEditBudget && hasActiveBudget && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> You have view-only access to budget information. Contact a
              Project Manager or Admin to create or modify budgets.
            </p>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
