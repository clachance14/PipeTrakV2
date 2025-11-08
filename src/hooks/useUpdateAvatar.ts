/**
 * Avatar Upload Hook
 * Feature: 017-user-profile-management
 * Purpose: Upload avatar to Supabase Storage and update user record
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface UpdateAvatarParams {
  userId: string
  file: File
}

interface UpdateAvatarResponse {
  id: string
  avatar_url: string
}

/**
 * Hook to upload avatar to Storage and update database
 *
 * Workflow:
 * 1. Upload file to Supabase Storage (avatars/{userId}/avatar.{ext})
 * 2. Get public URL for uploaded file
 * 3. Update users.avatar_url in database
 * 4. Invalidate user profile cache
 *
 * @returns TanStack Query mutation for avatar upload
 */
export function useUpdateAvatar() {
  const queryClient = useQueryClient()

  return useMutation<UpdateAvatarResponse, Error, UpdateAvatarParams>({
    mutationFn: async ({ userId, file }: UpdateAvatarParams) => {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const filePath = `${userId}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite existing avatar
        })

      if (uploadError) {
        throw uploadError
      }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Update user record
      const { data, error: dbError } = await supabase
        .from('users')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id, avatar_url')
        .single()

      if (dbError) {
        throw dbError
      }

      return data as UpdateAvatarResponse
    },

    // Invalidate user profile cache on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
  })
}
