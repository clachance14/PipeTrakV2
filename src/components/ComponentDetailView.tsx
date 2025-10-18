/**
 * ComponentDetailView component (Feature 007)
 * Detail view of a component with milestone tracking
 */

import { MilestoneButton } from './MilestoneButton';
import { MilestoneEventHistory } from './MilestoneEventHistory';
import { useComponent } from '@/hooks/useComponents';
import { useUpdateMilestone } from '@/hooks/useMilestones';
import { toast } from 'sonner';

interface ComponentDetailViewProps {
  componentId: string;
  canUpdateMilestones?: boolean; // Permission check
}

/**
 * ComponentDetailView component
 * Shows component details with interactive milestone buttons
 * Displays progress % and milestone event history
 */
export function ComponentDetailView({
  componentId,
  canUpdateMilestones = false,
}: ComponentDetailViewProps) {
  const { data: component, isLoading } = useComponent(componentId);
  const updateMilestoneMutation = useUpdateMilestone();

  if (isLoading) {
    return <div className="p-6">Loading component details...</div>;
  }

  if (!component) {
    return <div className="p-6">Component not found</div>;
  }

  // Extract progress template milestones config
  const progressTemplate = (component as any).progress_template;
  const milestonesConfig = progressTemplate?.milestones_config || [];

  // Sort milestones by order
  const sortedMilestones = [...milestonesConfig].sort(
    (a: any, b: any) => a.order - b.order
  );

  const handleMilestoneChange = async (milestoneName: string, value: boolean | number) => {
    try {
      await updateMilestoneMutation.mutateAsync({
        component_id: componentId,
        milestone_name: milestoneName,
        value,
      });
      toast.success('Milestone updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update milestone');
    }
  };

  // Extract identity key display
  const identityDisplay = component.identity_key
    ? Object.values(component.identity_key as Record<string, any>).join(' - ')
    : 'Unknown';

  return (
    <div className="space-y-6 p-6">
      {/* Component Header */}
      <div>
        <h2 className="text-2xl font-bold">{identityDisplay}</h2>
        <p className="text-muted-foreground">{component.component_type}</p>
      </div>

      {/* Progress Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Progress Complete:</span>
          <span className="text-2xl font-bold">
            {component.percent_complete?.toFixed(1) || 0}%
          </span>
        </div>
        {component.last_updated_at && (
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: {new Date(component.last_updated_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        <h3 className="font-semibold">Milestones</h3>
        <div className="space-y-3">
          {sortedMilestones.map((milestone: any) => {
            const currentValue =
              (component.current_milestones as Record<string, any>)?.[milestone.name] ||
              (milestone.is_partial ? 0 : false);

            return (
              <MilestoneButton
                key={milestone.name}
                milestone={milestone}
                value={currentValue}
                onChange={(value) => handleMilestoneChange(milestone.name, value)}
                disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
              />
            );
          })}
        </div>

        {!canUpdateMilestones && (
          <p className="text-sm text-muted-foreground italic">
            You do not have permission to update milestones
          </p>
        )}
      </div>

      {/* Milestone Event History */}
      <div className="border-t pt-4">
        <MilestoneEventHistory componentId={componentId} />
      </div>
    </div>
  );
}
