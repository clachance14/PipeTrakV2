/**
 * Organization Logo Upload Hook
 * Feature: Company Logo Support
 * Purpose: Upload logo to Supabase Storage and update organization record
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UpdateOrgLogoParams {
  organizationId: string
  file: File
}

interface UpdateOrgLogoResponse {
  id: string
  logo_url: string
}

/**
 * Hook to upload organization logo to Storage and update database
 *
 * Workflow:
 * 1. Upload file to Supabase Storage (org-logos/{organizationId}/logo.{ext})
 * 2. Get public URL for uploaded file
 * 3. Update organizations.logo_url in database
 * 4. Invalidate organization cache
 *
 * @returns TanStack Query mutation for logo upload
 */
export function useUpdateOrganizationLogo() {
  const queryClient = useQueryClient()

  return useMutation<UpdateOrgLogoResponse, Error, UpdateOrgLogoParams>({
    mutationFn: async ({ organizationId, file }: UpdateOrgLogoParams) => {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const filePath = `${organizationId}/logo.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite existing logo
        })

      if (uploadError) {
        throw uploadError
      }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('org-logos')
        .getPublicUrl(filePath)

      // 3. Update organization record
      const { data, error: dbError } = await supabase
        .from('organizations')
        .update({
          logo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select('id, logo_url')
        .single()

      if (dbError) {
        throw dbError
      }

      return data as UpdateOrgLogoResponse
    },

    // Invalidate organization cache on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentOrganization'] })
    },
  })
}
