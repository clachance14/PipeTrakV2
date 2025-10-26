/**
 * useWelders Hook (Feature 014 - Field Weld QC)
 * TanStack Query hooks for welder management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Welder {
  id: string
  project_id: string
  stencil: string
  stencil_norm: string
  name: string
  status: 'unverified' | 'verified'
  created_at: string
  created_by: string | null
  verified_at: string | null
  verified_by: string | null
}

interface CreateWelderPayload {
  project_id: string
  stencil: string
  name: string
}

/**
 * Combined hook: Query welders list + create welder mutation
 * Returns both query results and mutations in a single object
 */
export function useWelders({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()

  // Query: List welders for project
  const query = useQuery({
    queryKey: ['welders', { projectId }],
    queryFn: async (): Promise<Welder[]> => {
      const { data, error } = await supabase
        .from('welders')
        .select('*')
        .eq('project_id', projectId)
        .order('stencil_norm', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch welders: ${error.message}`)
      }

      return (data || []) as Welder[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Mutation: Create new welder
  const createWelderMutation = useMutation({
    mutationFn: async (payload: CreateWelderPayload): Promise<Welder> => {
      // Validate stencil format
      const stencilRegex = /^[A-Z0-9-]{2,12}$/
      const stencilNorm = payload.stencil.toUpperCase().trim()

      if (!stencilRegex.test(stencilNorm)) {
        throw new Error(
          'Invalid stencil format. Must be 2-12 characters (A-Z, 0-9, hyphen)'
        )
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('welders')
        .insert({
          project_id: payload.project_id,
          stencil: payload.stencil,
          stencil_norm: stencilNorm,
          name: payload.name,
          status: 'unverified',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create welder: ${error.message}`)
      }

      return data as Welder
    },
    onSuccess: (data) => {
      // Invalidate welders cache
      queryClient.invalidateQueries({
        queryKey: ['welders', { projectId: data.project_id }],
      })

      toast.success(`Welder ${data.stencil} created successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to create welder: ${error.message}`)
    },
  })

  // Return object with query properties spread + mutation
  return {
    ...query,
    createWelderMutation,
  }
}
