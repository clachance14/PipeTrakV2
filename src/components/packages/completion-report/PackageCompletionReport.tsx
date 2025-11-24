/**
 * PackageCompletionReport Component
 * Feature 030: Test Package Workflow - Main completion report container
 *
 * Renders package component list grouped by drawing with weld log and NDE data.
 */

import { DrawingSection } from './DrawingSection';
import type { DrawingGroup } from '@/types/packageReport';

interface PackageCompletionReportProps {
  drawingGroups: DrawingGroup[];
}

export function PackageCompletionReport({ drawingGroups }: PackageCompletionReportProps) {
  if (drawingGroups.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">
            No components found in this package
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Assign components to this package to see the completion report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {drawingGroups.map((drawingGroup) => (
        <DrawingSection key={drawingGroup.drawing_id} drawingGroup={drawingGroup} />
      ))}
    </div>
  );
}
