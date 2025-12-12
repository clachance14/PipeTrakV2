/**
 * Organization Logo Delete Hook
 * Feature: Company Logo Support
 * Purpose: Remove logo from Supabase Storage and clear database reference
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DeleteOrgLogoParams {
  organizationId: string
}

/**
 * Hook to delete organization logo from Storage and clear database reference
 *
 * Workflow:
 * 1. List files in organization's logo folder
 * 2. Delete all files (handles any extension)
 * 3. Set organizations.logo_url to null
 * 4. Invalidate organization cache
 *
 * @returns TanStack Query mutation for logo deletion
 */
export function useDeleteOrganizationLogo() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteOrgLogoParams>({
    mutationFn: async ({ organizationId }: DeleteOrgLogoParams) => {
      // 1. List files in org folder
      const { data: files } = await supabase.storage
        .from('org-logos')
        .list(organizationId)

      // 2. Delete all files in folder (handles any extension)
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${organizationId}/${f.name}`)
        const { error: deleteError } = await supabase.storage
          .from('org-logos')
          .remove(filePaths)

        if (deleteError) {
          throw deleteError
        }
      }

      // 3. Clear logo_url in database
      const { error: dbError } = await supabase
        .from('organizations')
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)

      if (dbError) {
        throw dbError
      }
    },

    // Invalidate organization cache on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentOrganization'] })
    },
  })
}
