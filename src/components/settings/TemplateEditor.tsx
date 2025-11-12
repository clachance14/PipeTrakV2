/**
 * TemplateEditor component (Feature 026 - User Story 2 & 3)
 * Modal for editing milestone weights with validation and retroactive recalculation (US3)
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { WeightInput } from './WeightInput';
import { WeightProgressBar } from './WeightProgressBar';
import { useUpdateProjectTemplates } from '@/hooks/useUpdateProjectTemplates';
import { supabase } from '@/lib/supabase';

interface MilestoneWeight {
  milestone_name: string;
  weight: number;
}

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  componentType: string;
  weights: MilestoneWeight[];
  lastUpdated: string;
  affectedCount?: number; // Optional: number of components that would be affected (US3)
}

export function TemplateEditor({
  open,
  onOpenChange,
  projectId,
  componentType,
  weights: initialWeights,
  lastUpdated,
  affectedCount: initialAffectedCount,
}: TemplateEditorProps) {
  const [weights, setWeights] = useState<MilestoneWeight[]>(initialWeights);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [affectedCount, setAffectedCount] = useState<number>(initialAffectedCount ?? 0);
  const [loadingCount, setLoadingCount] = useState(false);
  const hasQueriedCount = useRef(false);

  const updateMutation = useUpdateProjectTemplates(projectId);

  // Reset form when modal opens with new weights
  useEffect(() => {
    if (open) {
      setWeights(initialWeights);
      setApplyToExisting(false);
      setAffectedCount(initialAffectedCount ?? 0);
      hasQueriedCount.current = false; // Reset the query flag when modal opens
    }
  }, [open, initialWeights, initialAffectedCount]);

  // Task T045 (US3): Query affected component count when checkbox is checked
  useEffect(() => {
    if (applyToExisting && affectedCount === 0 && !loadingCount && !hasQueriedCount.current) {
      hasQueriedCount.current = true; // Set flag immediately to prevent duplicate queries
      setLoadingCount(true);
      supabase
        .from('components')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('component_type', componentType)
        .then(({ count, error }) => {
          if (!error && count !== null) {
            setAffectedCount(count);
          }
          setLoadingCount(false);
        });
    }
  }, [applyToExisting, affectedCount, loadingCount, projectId, componentType]);

  // Calculate total weight
  const total = weights.reduce((sum, { weight }) => sum + weight, 0);
  const isValid = total === 100;

  // Check individual weight validity
  const hasInvalidWeight = weights.some(({ weight }) => weight < 0 || weight > 100);

  // Disable save if total ≠ 100 or individual weights out of range
  const canSave = isValid && !hasInvalidWeight && !updateMutation.isPending;

  const handleWeightChange = (milestoneName: string, newWeight: number) => {
    console.log(`Weight change: ${milestoneName} = ${newWeight}`);
    setWeights(prevWeights => {
      const oldWeight = prevWeights.find(w => w.milestone_name === milestoneName)?.weight;
      console.log(`  Old value: ${oldWeight} → New value: ${newWeight}`);

      const newWeights = prevWeights.map(w =>
        w.milestone_name === milestoneName
          ? { ...w, weight: newWeight }
          : w
      );

      const oldSum = prevWeights.reduce((sum, w) => sum + w.weight, 0);
      const newSum = newWeights.reduce((sum, w) => sum + w.weight, 0);
      console.log(`  Total: ${oldSum} → ${newSum}`);

      return newWeights;
    });
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    // DEBUG: Log the weights at save time
    console.log('=== handleSave called ===');
    console.log('Weights state:', JSON.stringify(weights, null, 2));
    console.log('Sum:', weights.reduce((sum, w) => sum + w.weight, 0));
    console.log('========================');

    updateMutation.mutate(
      {
        componentType,
        weights,
        applyToExisting,
        lastUpdated,
      },
      {
        onSuccess: (data) => {
          // Show success toast
          if (applyToExisting && data.affected_count > 0) {
            toast.success('Template weights updated', {
              description: `Successfully recalculated ${data.affected_count} components`,
            });
          } else {
            toast.success('Template weights updated', {
              description: 'Changes will apply to new milestone updates',
            });
          }

          // Close modal
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Failed to update template weights', {
            description: error.message,
          });
        },
      }
    );
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // T058: Keyboard navigation support (Enter to save, Escape to cancel)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSave) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Get error message for individual weight
  const getWeightError = (weight: number): string | undefined => {
    if (weight < 0 || weight > 100) {
      return 'Weight must be between 0 and 100';
    }
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>
            Edit {componentType} Milestone Weights
          </DialogTitle>
          <DialogDescription>
            Adjust the percentage weight for each milestone. Total must equal 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Weight Progress Bar */}
          <WeightProgressBar weights={weights} />

          {/* Weight Inputs Grid */}
          <div className="grid grid-cols-2 gap-4">
            {weights.map((milestone) => (
              <WeightInput
                key={milestone.milestone_name}
                milestoneName={milestone.milestone_name}
                value={milestone.weight}
                onChange={handleWeightChange}
                error={getWeightError(milestone.weight)}
                disabled={updateMutation.isPending}
              />
            ))}
          </div>

          {/* Apply to Existing Components Checkbox (US3) */}
          <div className="flex items-start space-x-3 rounded-md border p-4">
            <Checkbox
              id="apply-to-existing"
              checked={applyToExisting}
              onCheckedChange={(checked) => setApplyToExisting(checked === true)}
              disabled={updateMutation.isPending}
              aria-label="Apply to existing components"
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="apply-to-existing"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Apply to existing components
              </label>
              <p className="text-sm text-gray-500">
                Recalculate progress percentages for existing components with these new weights
              </p>
              {applyToExisting && affectedCount > 0 && (
                <p className="text-sm text-orange-600 font-medium mt-2">
                  ⚠️ This affects {affectedCount} existing components
                </p>
              )}
            </div>
          </div>

          {/* Loading State */}
          {updateMutation.isPending && (
            <div className="flex items-center justify-center py-4" role="status">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-gray-600">
                {applyToExisting ? 'Saving and recalculating...' : 'Saving...'}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
