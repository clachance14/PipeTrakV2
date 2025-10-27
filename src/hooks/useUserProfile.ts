import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface Organization {
  id: string
  name: string
}

interface UserProfileData extends User {
  organization: Organization | null
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<UserProfileData> => {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          id,
          email,
          full_name,
          role,
          organization_id,
          avatar_url,
          created_at,
          updated_at,
          organization:organizations(id, name)
        `
        )
        .eq('id', userId)
        .single()

      if (error) {
        throw error
      }

      return data as UserProfileData
    },
  })
}
