/**
 * Package Workflow Stepper Component
 *
 * Displays 7-stage sequential workflow with visual status indicators.
 * Feature 030 - Test Package Lifecycle Workflow
 *
 * Features:
 * - Vertical stepper showing all 7 stages in order
 * - Color-coded status: green=completed, blue=in_progress, gray=not_started, yellow=skipped
 * - Sequential lock indicators (locked stages show lock icon)
 * - Expandable stage forms (click to expand/collapse)
 * - Real-time status updates via TanStack Query
 *
 * Business Rules:
 * - FR-019: 7 sequential stages
 * - FR-020: Sequential enforcement (locked until previous stage completed/skipped)
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Check, AlertCircle, SkipForward } from 'lucide-react';
import { usePackageWorkflow, isStageAvailable } from '@/hooks/usePackageWorkflow';
import { PackageWorkflowStageForm } from './PackageWorkflowStageForm';
import { cn } from '@/lib/utils';
import type { PackageWorkflowStage, StageStatus } from '@/types/workflow.types';

interface PackageWorkflowStepperProps {
  packageId: string;
}

/**
 * Get status color for stage indicator
 */
function getStatusColor(status: StageStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500 text-white';
    case 'in_progress':
      return 'bg-blue-500 text-white';
    case 'skipped':
      return 'bg-yellow-500 text-white';
    case 'not_started':
    default:
      return 'bg-gray-300 text-gray-600';
  }
}

/**
 * Get status icon for stage
 */
function getStatusIcon(status: StageStatus) {
  switch (status) {
    case 'completed':
      return <Check className="h-5 w-5" />;
    case 'in_progress':
      return <AlertCircle className="h-5 w-5" />;
    case 'skipped':
      return <SkipForward className="h-5 w-5" />;
    case 'not_started':
    default:
      return null;
  }
}

/**
 * Individual workflow stage item
 */
interface WorkflowStageItemProps {
  stage: PackageWorkflowStage;
  isAvailable: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function WorkflowStageItem({
  stage,
  isAvailable,
  isExpanded,
  onToggle,
  isLast,
}: WorkflowStageItemProps) {
  const statusColor = getStatusColor(stage.status);
  const statusIcon = getStatusIcon(stage.status);

  return (
    <div className="relative" data-status={stage.status}>
      {/* Connector line (except for last stage) */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
      )}

      {/* Stage header */}
      <button
        type="button"
        onClick={onToggle}
        disabled={!isAvailable && stage.status === 'not_started'}
        className={cn(
          'w-full flex items-start gap-4 p-4 rounded-lg transition-colors',
          'hover:bg-gray-50',
          !isAvailable && stage.status === 'not_started' && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Status indicator circle */}
        <div
          className={cn(
            'flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center',
            'relative z-10 ring-4 ring-white',
            statusColor
          )}
        >
          {!isAvailable && stage.status === 'not_started' ? (
            <Lock className="h-5 w-5" />
          ) : (
            statusIcon || <span className="text-sm font-medium">{stage.stage_order}</span>
          )}
        </div>

        {/* Stage info */}
        <div className="flex-1 text-left">
          <h3 className="text-lg font-semibold text-gray-900">{stage.stage_name}</h3>

          {/* Status badge */}
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                stage.status === 'completed' && 'bg-green-100 text-green-800',
                stage.status === 'in_progress' && 'bg-blue-100 text-blue-800',
                stage.status === 'skipped' && 'bg-yellow-100 text-yellow-800',
                stage.status === 'not_started' && 'bg-gray-100 text-gray-800'
              )}
            >
              {stage.status === 'completed' && 'Completed'}
              {stage.status === 'in_progress' && 'In Progress'}
              {stage.status === 'skipped' && 'Skipped'}
              {stage.status === 'not_started' && 'Not Started'}
            </span>

            {/* Completed timestamp */}
            {stage.completed_at && (
              <span className="text-xs text-gray-500">
                {new Date(stage.completed_at).toLocaleDateString()}
              </span>
            )}

            {/* Skip reason indicator */}
            {stage.skip_reason && (
              <span className="text-xs text-yellow-700">Reason provided</span>
            )}
          </div>

          {/* Lock indicator */}
          {!isAvailable && stage.status === 'not_started' && (
            <p className="mt-1 text-sm text-gray-500">
              Complete previous stage to unlock
            </p>
          )}
        </div>

        {/* Expand/collapse icon */}
        {isAvailable && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        )}
      </button>

      {/* Expanded stage form */}
      {isExpanded && isAvailable && (
        <div className="ml-16 mr-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <PackageWorkflowStageForm stage={stage} />
        </div>
      )}
    </div>
  );
}

/**
 * Package Workflow Stepper
 *
 * Displays vertical stepper with all 7 workflow stages.
 * Handles expansion/collapse of individual stages.
 */
export function PackageWorkflowStepper({ packageId }: PackageWorkflowStepperProps) {
  const { data: stages, isLoading, error } = usePackageWorkflow(packageId);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">
          Failed to load workflow stages. Please try again.
        </p>
      </div>
    );
  }

  // No stages (shouldn't happen - auto-created on certificate submission)
  if (!stages || stages.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          No workflow stages found. Submit a test certificate to initialize workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Progress header */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Workflow Progress</h3>
            <p className="mt-1 text-sm text-blue-700">
              {stages.filter((s) => s.status === 'completed').length} of {stages.length} stages
              completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-900">
              {Math.round(
                (stages.filter((s) => s.status === 'completed').length / stages.length) * 100
              )}
              %
            </p>
            <p className="text-xs text-blue-700">Complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                (stages.filter((s) => s.status === 'completed').length / stages.length) * 100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Workflow stages */}
      <div className="space-y-0">
        {stages.map((stage, index) => {
          const available = isStageAvailable(stages, stage.stage_order);
          const isExpanded = expandedStageId === stage.id;

          return (
            <WorkflowStageItem
              key={stage.id}
              stage={stage}
              isAvailable={available}
              isExpanded={isExpanded}
              onToggle={() => setExpandedStageId(isExpanded ? null : stage.id)}
              isLast={index === stages.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}
