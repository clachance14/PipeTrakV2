/**
 * TanStack Query hooks for milestone tracking (Feature 007)
 * Provides mutations for updating component milestones with auto-calculation
 * Enforces runtime validation for partial milestone values (0-100 range)
 */

import { useMutation, useQueryClient, UseMutationResult, useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];
type MilestoneEvent = Database['public']['Tables']['milestone_events']['Row'];

interface UpdateMilestoneParams {
  component_id: string;
  milestone_name: string;
  value: boolean | number;
  metadata?: Record<string, any>;
}

interface UpdateMilestoneResult {
  component: Component;
  event: MilestoneEvent;
}

/**
 * Update a component milestone (discrete or partial)
 * Triggers database trigger to recalculate percent_complete
 * Creates milestone_event audit trail entry
 * Enforces 0-100 range for partial milestone values
 * Requires can_update_milestones permission (enforced by RLS)
 */
export function useUpdateMilestone(): UseMutationResult<
  UpdateMilestoneResult,
  Error,
  UpdateMilestoneParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ component_id, milestone_name, value, metadata }) => {
      // Runtime validation: ensure partial % values are 0-100
      if (typeof value === 'number' && (value < 0 || value > 100)) {
        throw new Error(`Partial milestone value must be between 0 and 100 (received: ${value})`);
      }

      // Fetch current component to get existing milestones
      const { data: component, error: fetchError } = await supabase
        .from('components')
        .select('*')
        .eq('id', component_id)
        .single();

      if (fetchError) throw fetchError;
      if (!component) throw new Error(`Component not found: ${component_id}`);

      // Update current_milestones JSONB with new value
      const currentMilestones = (component.current_milestones as Record<string, any>) || {};
      const updatedMilestones = {
        ...currentMilestones,
        [milestone_name]: value,
      };

      // Determine milestone action (complete, rollback, update)
      const previousValue = currentMilestones[milestone_name];
      let action: 'complete' | 'rollback' | 'update';

      if (previousValue === false && value === true) {
        action = 'complete';
      } else if (previousValue === true && value === false) {
        action = 'rollback';
      } else if (typeof previousValue === 'number' && typeof value === 'number') {
        if (previousValue === 0 && value > 0) {
          action = 'complete';
        } else if (previousValue > 0 && value === 0) {
          action = 'rollback';
        } else {
          action = 'update';
        }
      } else if (previousValue === undefined || previousValue === null) {
        action = 'complete';
      } else {
        action = 'update';
      }

      // Update component milestones
      const { data: updatedComponent, error: updateError } = await supabase
        .from('components')
        .update({
          current_milestones: updatedMilestones,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', component_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();

      // Create milestone event (audit trail)
      // Convert boolean values to numbers for database (false=0, true=100)
      const numericValue = typeof value === 'boolean' ? (value ? 100 : 0) : value;
      const numericPrevValue = typeof previousValue === 'boolean' ? (previousValue ? 100 : 0) : previousValue;

      const { data: event, error: eventError} = await supabase
        .from('milestone_events')
        .insert({
          component_id,
          milestone_name,
          action,
          value: numericValue,
          previous_value: numericPrevValue ?? null,
          metadata: metadata || null,
          user_id: user?.id || '',
        })
        .select()
        .single();

      if (eventError) throw eventError;

      return {
        component: updatedComponent,
        event,
      };
    },
    onSuccess: (data) => {
      // Invalidate component cache to refetch updated percent_complete and milestones
      queryClient.invalidateQueries({
        queryKey: ['components', data.component.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', data.component.project_id, 'components'],
      });

      // Invalidate milestone history for this component (matches useMilestoneHistory query key)
      queryClient.invalidateQueries({
        queryKey: ['milestone-history', data.component.id],
      });

      // Also invalidate the old milestone-events query key (for backwards compatibility)
      queryClient.invalidateQueries({
        queryKey: ['components', data.component.id, 'milestone-events'],
      });
    },
  });
}

/**
 * Query milestone events for a component (audit trail)
 * Returns all milestone updates ordered by creation date (newest first)
 */
export function useMilestoneEvents(componentId: string): UseQueryResult<MilestoneEvent[], Error> {
  return useQuery({
    queryKey: ['components', componentId, 'milestone-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestone_events')
        .select('*')
        .eq('component_id', componentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
