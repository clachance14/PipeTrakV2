import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type {
  MilestoneUpdatePayload,
  MilestoneUpdateResponse,
  ComponentRow,
} from '@/types/drawing-table.types'

/**
 * Custom hook to update a component milestone with optimistic UI
 *
 * Flow:
 * 1. onMutate: Cancel queries, snapshot state, optimistically update cache
 * 2. mutationFn: Call Supabase RPC update_component_milestone
 * 3. onSuccess: Invalidate related queries (['components'], ['drawing-progress'], ['drawings-with-progress'])
 * 4. onError: Rollback cache to snapshot, show error toast
 *
 * @returns UseMutationResult for milestone updates
 */
export function useUpdateMilestone() {
  const queryClient = useQueryClient()

  return useMutation<
    MilestoneUpdateResponse,
    Error,
    MilestoneUpdatePayload,
    { previous: ComponentRow[] | undefined }
  >({
    mutationFn: async (payload: MilestoneUpdatePayload) => {
      // Convert boolean to numeric (1 or 0) for discrete milestones
      // Partial milestones already send numeric values (0-100)
      let numericValue: number;

      if (typeof payload.value === 'boolean') {
        numericValue = payload.value ? 1 : 0;
      } else if (typeof payload.value === 'string') {
        // Handle string values (shouldn't happen, but be defensive)
        if (payload.value === 'true') numericValue = 1;
        else if (payload.value === 'false') numericValue = 0;
        else numericValue = parseFloat(payload.value) || 0;
      } else {
        numericValue = Number(payload.value);
      }

      // Ensure we have a valid number
      if (isNaN(numericValue)) {
        throw new Error(`Invalid milestone value: ${payload.value}`);
      }

      const { data, error } = await supabase.rpc('update_component_milestone', {
        p_component_id: payload.component_id,
        p_milestone_name: payload.milestone_name,
        p_new_value: numericValue,
        p_user_id: payload.user_id,
      })

      if (error) throw error

      return data as unknown as MilestoneUpdateResponse
    },

    onMutate: async (payload) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['components'] })

      // Snapshot the previous value for rollback
      const previous = queryClient.getQueryData<ComponentRow[]>([
        'components',
        { drawing_id: payload.component_id },
      ])

      // Optimistically update cache
      // Note: We can't easily determine the drawing_id from payload alone,
      // so we update all component queries
      // Convert boolean to numeric for consistency with database
      const optimisticValue = typeof payload.value === 'boolean'
        ? (payload.value ? 1 : 0)
        : payload.value

      queryClient.setQueriesData<ComponentRow[]>(
        { queryKey: ['components'] },
        (old) => {
          if (!old || !Array.isArray(old)) return old

          return old.map((component) =>
            component.id === payload.component_id
              ? {
                  ...component,
                  current_milestones: {
                    ...component.current_milestones,
                    [payload.milestone_name]: optimisticValue,
                  },
                  // TODO: Recalculate percent_complete client-side for instant feedback
                }
              : component
          )
        }
      )

      return { previous }
    },

    onError: (error, payload, context) => {
      // Rollback optimistic update on error
      if (context?.previous) {
        queryClient.setQueryData(
          ['components', { drawing_id: payload.component_id }],
          context.previous
        )
      }

      // Show error toast
      toast.error('Failed to update milestone. Please try again.')

      console.error('Milestone update error:', error)
    },

    onSuccess: (data, payload) => {
      // Update component cache with server response (has updated percent_complete)
      queryClient.setQueriesData<ComponentRow[]>(
        { queryKey: ['components'] },
        (old) => {
          if (!old || !Array.isArray(old)) return old

          return old.map((component) =>
            component.id === payload.component_id
              ? {
                  ...component,
                  percent_complete: data.new_percent_complete,
                  current_milestones: {
                    ...component.current_milestones,
                    [payload.milestone_name]: typeof payload.value === 'boolean'
                      ? (payload.value ? 1 : 0)
                      : payload.value,
                  },
                  last_updated_at: new Date().toISOString(),
                  last_updated_by: payload.user_id,
                }
              : component
          )
        }
      )

      // Invalidate drawing-level queries to update progress aggregates
      // Note: Don't invalidate ['components'] since we already updated it above via setQueriesData
      // Invalidating would trigger a refetch/resort which causes visual flickering
      queryClient.invalidateQueries({ queryKey: ['drawing-progress'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })
    },
  })
}
