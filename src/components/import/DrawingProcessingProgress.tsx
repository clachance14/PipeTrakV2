/**
 * DrawingProcessingProgress Component
 * Shows real-time processing progress for uploaded drawings.
 * Uses Supabase Realtime to update as drawings are processed.
 */

import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useDrawingProcessingStatus } from '@/hooks/useDrawingProcessingStatus';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DrawingProcessingProgressProps {
  projectId: string;
  onUploadMore?: () => void;
}

function StatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case 'queued':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-700',
    complete: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };

  if (!status) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function DrawingProcessingProgress({
  projectId,
  onUploadMore,
}: DrawingProcessingProgressProps) {
  const { data: drawings, isLoading } = useDrawingProcessingStatus(projectId || null);
  const navigate = useNavigate();

  const total = drawings?.length ?? 0;
  const completed = drawings?.filter((d) => d.processing_status === 'complete').length ?? 0;
  const errors = drawings?.filter((d) => d.processing_status === 'error').length ?? 0;
  const processing =
    drawings?.filter(
      (d) => d.processing_status === 'processing' || d.processing_status === 'queued',
    ).length ?? 0;
  const progressPercent = total > 0 ? Math.round(((completed + errors) / total) * 100) : 0;
  const isAllDone = processing === 0 && total > 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Processing Drawings</h2>
        <p className="text-gray-600">
          AI is extracting title block and bill of materials from your drawings.
        </p>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>
              {completed + errors} / {total} complete
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
            {completed > 0 && <span className="text-green-600">{completed} successful</span>}
            {errors > 0 && <span className="text-red-600">{errors} failed</span>}
            {processing > 0 && <span className="text-blue-600">{processing} in progress</span>}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading status...</span>
        </div>
      )}

      {/* Drawing status rows */}
      {drawings && drawings.length > 0 && (
        <div className="space-y-2 mb-6">
          {drawings.map((drawing) => (
            <div
              key={drawing.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
            >
              <StatusIcon status={drawing.processing_status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {drawing.drawing_no_raw}
                  </p>
                  {drawing.sheet_number && drawing.sheet_number !== '1' && (
                    <span className="text-xs text-gray-500">Sheet {drawing.sheet_number}</span>
                  )}
                </div>
                {drawing.processing_status === 'error' && drawing.processing_note && (
                  <p className="text-xs text-red-600 mt-0.5 truncate">{drawing.processing_note}</p>
                )}
              </div>
              <StatusBadge status={drawing.processing_status} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && total === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No drawings are currently being processed.</p>
        </div>
      )}

      {/* Completion actions */}
      {isAllDone && (
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            onClick={() => navigate(`/projects/${projectId}/drawing-table`)}
          >
            View in Drawing Table
          </Button>
          {onUploadMore && (
            <Button variant="outline" onClick={onUploadMore}>
              Upload More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
