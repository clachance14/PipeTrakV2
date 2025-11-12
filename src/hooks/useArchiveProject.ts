/**
 * useArchiveProject Hook - Soft delete for projects
 *
 * Archives a project by setting the deleted_at timestamp.
 * This is a soft delete - the project is hidden from queries
 * but data is preserved and can be recovered.
 *
 * RLS policies filter out archived projects (deleted_at IS NOT NULL)
 * from all SELECT queries automatically.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all project queries to remove archived project from lists
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
