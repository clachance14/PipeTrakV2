/**
 * ComponentDetailView component (Feature 007)
 * Detail view of a component with milestone tracking
 */

import { useState } from 'react';
// import { MilestoneButton } from './MilestoneButton'; // TODO: Will be used in Phase 5
// import { MilestoneEventHistory } from './MilestoneEventHistory'; // TODO: Will be used in Phase 6
import { useComponent } from '@/hooks/useComponents';
// import { useUpdateMilestone } from '@/hooks/useMilestones'; // TODO: Will be used in Phase 5
// import { toast } from 'sonner'; // TODO: Will be used in Phases 4-5
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatIdentityKey } from '@/lib/formatIdentityKey';
import { formatIdentityKey as formatFieldWeldKey } from '@/lib/field-weld-utils';

interface ComponentDetailViewProps {
  componentId: string;
  canUpdateMilestones?: boolean; // Permission check
  canEditMetadata?: boolean;      // NEW
  onMetadataChange?: () => void;  // NEW
}

/**
 * ComponentDetailView component
 * Shows component details with interactive milestone buttons
 * Displays progress % and milestone event history
 */
export function ComponentDetailView({
  componentId,
  canUpdateMilestones = false, // TODO: Will be used in Phase 5
  canEditMetadata = false, // TODO: Will be used in Phase 4
  onMetadataChange, // TODO: Will be used in Phase 4
}: ComponentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'milestones' | 'history'>('overview');

  const { data: componentData, isLoading } = useComponent(componentId);

  // Suppress unused variable warnings for now
  void canUpdateMilestones;
  void canEditMetadata;
  void onMetadataChange;

  if (isLoading) {
    return <div className="p-6">Loading component details...</div>;
  }

  if (!componentData) {
    return <div className="p-6">Component not found</div>;
  }

  // Cast to proper type with joined data
  const component = componentData as any;

  // Format identity based on type
  let identityDisplay: string;
  if (component.component_type === 'field_weld') {
    identityDisplay = formatFieldWeldKey(
      component.identity_key as Record<string, unknown>,
      component.component_type
    );
  } else if (component.component_type === 'spool') {
    const key = component.identity_key as Record<string, unknown>;
    identityDisplay = (key?.spool_id as string) || 'Unknown Spool';
  } else {
    identityDisplay = formatIdentityKey(
      component.identity_key as any,
      component.component_type as any
    );
  }

  // Calculate milestone stats
  const template = component.progress_template;
  const totalMilestones = template?.milestones_config?.length || 0;
  const currentMilestones = (component.current_milestones as Record<string, boolean | number>) || {};
  const completedMilestones = Object.values(currentMilestones).filter(
    (value) => value === true || value === 100
  ).length;

  return (
    <>
      {/* Desktop: Horizontal Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="hidden md:block">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Component Identity */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Component</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono">{identityDisplay}</span>
              <Badge variant="secondary">{component.component_type}</Badge>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Progress</h3>
              <span className="text-2xl font-bold">{component.percent_complete.toFixed(1)}%</span>
            </div>
            <Progress value={component.percent_complete} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {component.last_updated_at
                ? new Date(component.last_updated_at).toLocaleString()
                : 'Never'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Milestones</p>
              <p className="text-3xl font-bold">{totalMilestones}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold">{completedMilestones}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="text-sm text-muted-foreground">Details content (TODO)</div>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <div className="text-sm text-muted-foreground">Milestones content (TODO)</div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="text-sm text-muted-foreground">History content (TODO)</div>
        </TabsContent>
      </Tabs>

      {/* Mobile: Dropdown Selector */}
      <div className="md:hidden space-y-4">
        <Select value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <SelectTrigger className="w-full min-h-[44px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Overview</SelectItem>
            <SelectItem value="details">Details</SelectItem>
            <SelectItem value="milestones">Milestones</SelectItem>
            <SelectItem value="history">History</SelectItem>
          </SelectContent>
        </Select>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Component Identity */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Component</h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono">{identityDisplay}</span>
                <Badge variant="secondary">{component.component_type}</Badge>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Progress</h3>
                <span className="text-2xl font-bold">{component.percent_complete.toFixed(1)}%</span>
              </div>
              <Progress value={component.percent_complete} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {component.last_updated_at
                  ? new Date(component.last_updated_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Milestones</p>
                <p className="text-3xl font-bold">{totalMilestones}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{completedMilestones}</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'details' && (
          <div className="text-sm text-muted-foreground">Details content (TODO)</div>
        )}
        {activeTab === 'milestones' && (
          <div className="text-sm text-muted-foreground">Milestones content (TODO)</div>
        )}
        {activeTab === 'history' && (
          <div className="text-sm text-muted-foreground">History content (TODO)</div>
        )}
      </div>
    </>
  );
}
