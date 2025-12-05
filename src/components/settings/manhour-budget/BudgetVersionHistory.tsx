/**
 * BudgetVersionHistory component (Feature 032 - US1)
 * Displays all budget versions for a project with active budget highlighted
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, FileText } from 'lucide-react';
import type { Database } from '@/types/database.types';

type ProjectManhourBudget = Database['public']['Tables']['project_manhour_budgets']['Row'];

export interface BudgetVersionHistoryProps {
  versions: ProjectManhourBudget[];
  activeBudgetId?: string;
}

/**
 * Format number with commas using toLocaleString
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date using Intl.DateTimeFormat
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function BudgetVersionHistory({ versions, activeBudgetId }: BudgetVersionHistoryProps) {
  if (versions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Version History</CardTitle>
        <CardDescription>
          All budget versions for this project ({versions.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.map((version) => {
            const isActive = version.id === activeBudgetId;

            return (
              <div
                key={version.id}
                className={`
                  flex flex-col sm:flex-row sm:items-center sm:justify-between
                  p-4 rounded-lg border
                  ${
                    isActive
                      ? 'bg-blue-50 border-blue-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200'
                  }
                `}
              >
                {/* Left Section: Version Info */}
                <div className="flex items-start gap-3 mb-3 sm:mb-0">
                  <div
                    className={`
                      p-2 rounded-lg shrink-0
                      ${isActive ? 'bg-blue-100' : 'bg-slate-100'}
                    `}
                  >
                    <Clock
                      className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-medium ${
                          isActive ? 'text-blue-900' : 'text-slate-900'
                        }`}
                      >
                        Version {version.version_number}
                      </p>
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                          Active
                        </span>
                      )}
                      {!isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-300 text-slate-700">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 mt-1">
                      <FileText className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                      <p
                        className={`text-xs break-words ${
                          isActive ? 'text-blue-700' : 'text-slate-500'
                        }`}
                      >
                        {version.revision_reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Section: Budget Details */}
                <div className="flex flex-col sm:text-right space-y-1 pl-11 sm:pl-0">
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? 'text-blue-900' : 'text-slate-900'
                    }`}
                  >
                    {formatNumber(version.total_budgeted_manhours)} MH
                  </p>
                  <div className="flex items-center gap-1.5 sm:justify-end">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <p
                      className={`text-xs ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
                    >
                      Effective {formatDate(version.effective_date)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
