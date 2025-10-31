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

  const { data: component, isLoading } = useComponent(componentId);

  // Suppress unused variable warnings for now
  void canUpdateMilestones;
  void canEditMetadata;
  void onMetadataChange;

  if (isLoading) {
    return <div className="p-6">Loading component details...</div>;
  }

  if (!component) {
    return <div className="p-6">Component not found</div>;
  }

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

        <TabsContent value="overview" className="mt-4">
          <div className="text-sm text-muted-foreground">Overview content (TODO)</div>
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
          <div className="text-sm text-muted-foreground">Overview content (TODO)</div>
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
