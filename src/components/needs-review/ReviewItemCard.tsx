import { AlertCircle, ClipboardCheck, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';
import { WeldCompletedPayload } from '@/types/needs-review';

export type ReviewType =
  | 'out_of_sequence'
  | 'rollback'
  | 'delta_quantity'
  | 'drawing_change'
  | 'similar_drawing'
  | 'verify_welder'
  | 'weld_completed';

export interface ReviewItem {
  id: string;
  type: ReviewType;
  description: string;
  ageInDays: number;
  ageColorClass: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface ReviewItemCardProps {
  item: ReviewItem;
  onResolve: (id: string, note?: string) => void;
  onRecordNDE?: (id: string, payload: WeldCompletedPayload) => void;
  onViewNDE?: (id: string, payload: WeldCompletedPayload) => void;
}

const typeLabels: Record<ReviewType, string> = {
  out_of_sequence: 'Out of Sequence',
  rollback: 'Rollback',
  delta_quantity: 'Delta Quantity',
  drawing_change: 'Drawing Change',
  similar_drawing: 'Similar Drawing',
  verify_welder: 'Verify Welder',
  weld_completed: 'Weld Completed'
};

const typeBadgeColors: Record<ReviewType, string> = {
  out_of_sequence: 'bg-red-100 text-red-800',
  rollback: 'bg-orange-100 text-orange-800',
  delta_quantity: 'bg-yellow-100 text-yellow-800',
  drawing_change: 'bg-blue-100 text-blue-800',
  similar_drawing: 'bg-purple-100 text-purple-800',
  verify_welder: 'bg-amber-100 text-amber-800',
  weld_completed: 'bg-green-100 text-green-800'
};

/**
 * Review item card component
 * Displays flagged item with type badge, description, age, and context-aware action button
 * - weld_completed + current_nde_result: "View NDE"
 * - weld_completed (no NDE recorded): "Record NDE"
 * - other types: "Resolve"
 */
export function ReviewItemCard({
  item,
  onResolve,
  onRecordNDE,
  onViewNDE
}: ReviewItemCardProps) {
  const handleResolve = () => {
    onResolve(item.id);
  };

  // Render context-aware action button for weld_completed items
  const renderActionButton = () => {
    // For non-weld_completed types, always show Resolve
    if (item.type !== 'weld_completed') {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={handleResolve}
          className="flex-shrink-0"
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Resolve
        </Button>
      );
    }

    const payload = item.payload as WeldCompletedPayload;

    // NDE already recorded - show View NDE button
    if (payload.current_nde_result && onViewNDE) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewNDE(item.id, payload)}
          className="flex-shrink-0"
        >
          <Eye className="h-4 w-4 mr-1" />
          View NDE
        </Button>
      );
    }

    // NDE required but not recorded - show Record NDE button
    if (onRecordNDE) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRecordNDE(item.id, payload)}
          className="flex-shrink-0"
        >
          <ClipboardCheck className="h-4 w-4 mr-1" />
          Record NDE
        </Button>
      );
    }

    // Fallback to Resolve button
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleResolve}
        className="flex-shrink-0"
      >
        <AlertCircle className="h-4 w-4 mr-1" />
        Resolve
      </Button>
    );
  };

  // Render custom content for weld_completed type
  const renderWeldCompletedContent = () => {
    if (item.type !== 'weld_completed') return null;

    const payload = item.payload as WeldCompletedPayload;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <strong className="font-semibold">{payload.weld_number}</strong>
          <span className="text-sm text-muted-foreground">
            on {payload.drawing_number}
          </span>
        </div>
        <div className="text-sm">
          Completed on {new Date(payload.date_welded).toLocaleDateString()}
          {payload.welder_name && (
            <span className="ml-1">by {payload.welder_name}</span>
          )}
        </div>
        {payload.nde_required && (
          <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
            NDE Required
          </span>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Review created: {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>
    );
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('px-2 py-1 rounded-md text-xs font-medium', typeBadgeColors[item.type])}>
              {typeLabels[item.type]}
            </span>
            <span className={cn('text-xs font-medium', item.ageColorClass)}>
              {item.ageInDays === 0 ? 'Today' : `${item.ageInDays} day${item.ageInDays > 1 ? 's' : ''} ago`}
            </span>
          </div>

          {/* Custom content for weld_completed or default description */}
          {item.type === 'weld_completed' ? (
            renderWeldCompletedContent()
          ) : (
            <>
              {/* Description */}
              <p className="text-sm text-gray-900 mb-1">{item.description}</p>

              {/* Created timestamp */}
              <p className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </>
          )}
        </div>

        {/* Action button (permission-gated) */}
        <PermissionGate permission="can_resolve_reviews">
          {renderActionButton()}
        </PermissionGate>
      </div>
    </Card>
  );
}
