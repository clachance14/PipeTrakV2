/**
 * TanStack Query mutation hook for cloning system templates (Feature 026)
 * Calls clone_system_templates_for_project RPC function
 */

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type CloneTemplatesRequest = {
  projectId: string
}

type CloneTemplatesResponse = {
  templates_created: number
}

/**
 * Clone system templates to project-specific templates
 * Calls the clone_system_templates_for_project RPC function
 *
 * @returns Mutation hook with mutate function
 */
export function useCloneTemplates(): UseMutationResult<
  CloneTemplatesResponse,
  Error,
  CloneTemplatesRequest
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId }: CloneTemplatesRequest) => {
      const { data, error } = await supabase.rpc('clone_system_templates_for_project', {
        target_project_id: projectId,
      })

      if (error) throw error

      return { templates_created: data || 0 }
    },
    onSuccess: (_, variables) => {
      // Invalidate project templates queries for this project
      queryClient.invalidateQueries({
        queryKey: ['projectTemplates', variables.projectId],
      })
    },
  })
}
