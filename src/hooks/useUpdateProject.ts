/**
 * useUpdateProject Hook - Specialized hook for updating project details
 *
 * Provides a focused mutation hook for updating project name and description
 * from the Settings > Project Details page. This is a specialized version
 * extracted from the broader useProjects.ts for clarity and separation of concerns.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UpdateProjectParams {
  projectId: string
  name: string
  description?: string | null
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, name, description }: UpdateProjectParams) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate project queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', data.id] })
    },
  })
}
