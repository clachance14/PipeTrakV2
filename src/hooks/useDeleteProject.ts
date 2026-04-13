/**
 * useDeleteProject Hook - Hard delete for projects
 *
 * Permanently deletes a project and all associated data
 * (drawings, components, BOM items, etc.) via cascading delete.
 *
 * Only the project owner (created_by) can delete a project.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('delete_project', {
        p_project_id: projectId,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
