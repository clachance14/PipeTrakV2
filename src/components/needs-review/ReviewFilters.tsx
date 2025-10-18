import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export type ReviewStatus = 'pending' | 'resolved' | 'ignored';
export type ReviewType =
  | 'all'
  | 'out_of_sequence'
  | 'rollback'
  | 'delta_quantity'
  | 'drawing_change'
  | 'similar_drawing'
  | 'verify_welder';

export interface ReviewFiltersState {
  type?: ReviewType;
  status?: ReviewStatus;
}

export interface ReviewFiltersProps {
  onFilterChange: (filters: ReviewFiltersState) => void;
}

const typeLabels: Record<ReviewType, string> = {
  all: 'All Types',
  out_of_sequence: 'Out of Sequence',
  rollback: 'Rollback',
  delta_quantity: 'Delta Quantity',
  drawing_change: 'Drawing Change',
  similar_drawing: 'Similar Drawing',
  verify_welder: 'Verify Welder'
};

/**
 * Review filters component with type and status filters
 */
export function ReviewFilters({ onFilterChange }: ReviewFiltersProps) {
  const [type, setType] = useState<ReviewType>('all');
  const [status, setStatus] = useState<ReviewStatus>('pending');

  const handleTypeChange = (newType: ReviewType) => {
    setType(newType);
    onFilterChange({ type: newType === 'all' ? undefined : newType, status });
  };

  const handleStatusChange = (newStatus: ReviewStatus) => {
    setStatus(newStatus);
    onFilterChange({ type: type === 'all' ? undefined : type, status: newStatus });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Type filter dropdown */}
      <div className="flex-1">
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filter by type..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={status === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('pending')}
        >
          Pending
        </Button>
        <Button
          variant={status === 'resolved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('resolved')}
        >
          Resolved
        </Button>
        <Button
          variant={status === 'ignored' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('ignored')}
        >
          Ignored
        </Button>
      </div>
    </div>
  );
}
