/**
 * useImportFieldWelds Hook (Feature 014 - Field Weld QC)
 * Mutation hook for importing field welds from CSV via edge function
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ImportFieldWeldsPayload {
  project_id: string
  csv_file: File
}

interface ImportSummary {
  success_count: number
  error_count: number
  errors: Array<{
    row: number
    column?: string
    message: string
  }>
}

export function useImportFieldWelds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ImportFieldWeldsPayload): Promise<ImportSummary> => {
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024
      if (payload.csv_file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit')
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Prepare form data
      const formData = new FormData()
      formData.append('project_id', payload.project_id)
      formData.append('csv_file', payload.csv_file)

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-field-welds`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result: ImportSummary = await response.json()
      return result
    },
    onSuccess: (result, payload) => {
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress', { project_id: payload.project_id }] })
      queryClient.invalidateQueries({ queryKey: ['welders', { projectId: payload.project_id }] })

      if (result.error_count === 0) {
        toast.success(`Successfully imported ${result.success_count} field welds`)
      } else if (result.success_count > 0) {
        toast.warning(`Imported ${result.success_count} welds with ${result.error_count} errors`)
      } else {
        toast.error(`Import failed: ${result.error_count} errors`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`)
    },
  })
}
