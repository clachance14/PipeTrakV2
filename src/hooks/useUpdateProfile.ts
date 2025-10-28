import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UpdateProfileParams {
  userId: string
  fullName: string
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, fullName }: UpdateProfileParams) => {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Optimistic update: Show new value immediately
    onMutate: async ({ userId, fullName }) => {
      // Cancel outgoing refetches (prevent overwriting optimistic update)
      await queryClient.cancelQueries({ queryKey: ['userProfile', userId] })

      // Snapshot previous value for rollback
      const previousProfile = queryClient.getQueryData(['userProfile', userId])

      // Optimistically update cache
      queryClient.setQueryData(['userProfile', userId], (old: any) => ({
        ...old,
        full_name: fullName
      }))

      // Return context with snapshot for rollback
      return { previousProfile, userId }
    },

    // On error: Rollback to previous value
    onError: (_err, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(
          ['userProfile', context.userId],
          context.previousProfile
        )
      }
    },

    // On settled: Refetch to sync with server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }
  })
}
