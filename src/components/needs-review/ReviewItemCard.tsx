import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';

export type ReviewType =
  | 'out_of_sequence'
  | 'rollback'
  | 'delta_quantity'
  | 'drawing_change'
  | 'similar_drawing'
  | 'verify_welder';

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
}

const typeLabels: Record<ReviewType, string> = {
  out_of_sequence: 'Out of Sequence',
  rollback: 'Rollback',
  delta_quantity: 'Delta Quantity',
  drawing_change: 'Drawing Change',
  similar_drawing: 'Similar Drawing',
  verify_welder: 'Verify Welder'
};

const typeBadgeColors: Record<ReviewType, string> = {
  out_of_sequence: 'bg-red-100 text-red-800',
  rollback: 'bg-orange-100 text-orange-800',
  delta_quantity: 'bg-yellow-100 text-yellow-800',
  drawing_change: 'bg-blue-100 text-blue-800',
  similar_drawing: 'bg-purple-100 text-purple-800',
  verify_welder: 'bg-amber-100 text-amber-800'
};

/**
 * Review item card component
 * Displays flagged item with type badge, description, age, and resolve button
 */
export function ReviewItemCard({ item, onResolve }: ReviewItemCardProps) {
  const handleResolve = () => {
    onResolve(item.id);
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

          {/* Description */}
          <p className="text-sm text-gray-900 mb-1">{item.description}</p>

          {/* Created timestamp */}
          <p className="text-xs text-muted-foreground">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Resolve button (permission-gated) */}
        <PermissionGate permission="can_resolve_reviews">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResolve}
            className="flex-shrink-0"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Resolve
          </Button>
        </PermissionGate>
      </div>
    </Card>
  );
}
