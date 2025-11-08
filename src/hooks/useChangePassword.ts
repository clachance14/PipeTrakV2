/**
 * Password Change Hook
 * Feature: 017-user-profile-management
 * Purpose: Change user password with current password verification
 */

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PasswordChangeRequest, PasswordChangeResponse } from '@/lib/password-validation'

/**
 * Hook to change user password
 *
 * Workflow:
 * 1. Verify current password via signInWithPassword
 * 2. Update password via auth.updateUser
 * 3. Session maintained (no forced logout)
 *
 * @returns TanStack Query mutation for password change
 */
export function useChangePassword() {
  const { user } = useAuth()

  return useMutation<PasswordChangeResponse, Error, PasswordChangeRequest>({
    mutationFn: async ({ currentPassword, newPassword }: PasswordChangeRequest) => {
      if (!user?.email) {
        throw new Error('User not authenticated')
      }

      // Step 1: Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (verifyError) {
        throw new Error('Current password is incorrect')
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      return {
        message: 'Password updated successfully',
        sessionMaintained: true,
        changedAt: new Date().toISOString(),
      }
    },
  })
}
