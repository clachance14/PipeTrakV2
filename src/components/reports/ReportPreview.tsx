/**
 * ReportPreview Component (Feature 019 - T024)
 * Displays generated report data with metadata (generation time, dimension)
 */

import { ReportTable } from './ReportTable';
import type { ReportData } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';

interface ReportPreviewProps {
  data: ReportData;
  projectName: string;
}

export function ReportPreview({ data, projectName }: ReportPreviewProps) {
  const formattedDate = data.generatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">
          Pipe Tracker - by {DIMENSION_LABELS[data.dimension]}
        </h1>
        <div className="mt-2 text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Project:</span> {projectName}
          </p>
          <p>
            <span className="font-medium">Generated:</span> {formattedDate}
          </p>
          <p>
            <span className="font-medium">Grouping:</span> {DIMENSION_LABELS[data.dimension]}
          </p>
        </div>
      </div>

      {/* Report Table */}
      <ReportTable data={data} />

      {/* Report Footer */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        <p>
          This report shows progress percentages calculated using earned value methodology.
          Percentages reflect partial completion where applicable.
        </p>
      </div>
    </div>
  );
}
