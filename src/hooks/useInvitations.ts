// T036: Invitations hook (TanStack Query)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { generateInvitationToken, hashToken } from '@/lib/invitations'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

interface InvitationsParams {
  organizationId?: string
  status?: 'pending' | 'accepted' | 'revoked' | 'expired'
  limit?: number
  offset?: number
}

interface AcceptInvitationResult {
  success: boolean
  error?: string
  organization_id?: string
  role?: UserRole
}

function useInvitationsList(params: InvitationsParams) {
  const { organizationId, status, limit = 50, offset = 0 } = params

  return useQuery({
    queryKey: ['invitations', organizationId, status, limit, offset],
    queryFn: async () => {
      // Note: invited_by is a UUID that references auth.users(id), not public.users(id)
      // We can't directly join to public.users, so we just return the UUID
      let query = supabase.from('invitations').select('*', { count: 'exact' })

      if (organizationId) query = query.eq('organization_id', organizationId)
      if (status) query = query.eq('status', status)

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) throw error

      return { invitations: data || [], total_count: count || 0 }
    },
    enabled: !!organizationId,
  })
}

export function useInvitations() {
  const queryClient = useQueryClient()

  const createInvitationMutation = useMutation({
    mutationFn: async ({
      email,
      role,
      organizationId,
    }: {
      email: string
      role: UserRole
      organizationId?: string
    }) => {
      const token = generateInvitationToken()
      const tokenHash = await hashToken(token)

      const currentUser = await supabase.auth.getUser()
      if (!currentUser.data.user) throw new Error('Not authenticated')

      // Get current user's organization_id (single-org model)
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', currentUser.data.user.id)
        .single()

      const orgId = organizationId || userData?.organization_id

      if (!orgId) throw new Error('No organization found for user')

      // SINGLE-ORG VALIDATION: Check if email already has a user with an organization
      const { data: hasOrg } = await supabase
        .rpc('check_email_has_organization', { check_email: email })

      if (hasOrg) {
        throw new Error('USER_ALREADY_HAS_ORGANIZATION')
      }

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email,
          role,
          organization_id: orgId,
          token_hash: tokenHash,
          invited_by: currentUser.data.user.id,
        })
        .select()
        .single()

      if (error) throw error

      const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`

      // Call Edge Function to send email
      let emailSent = false
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data: inviterData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single()

        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single()

        const emailResponse = await supabase.functions.invoke('send-invitation', {
          body: {
            email,
            invitationLink,
            role,
            organizationName: orgData?.name || 'PipeTrak',
            inviterName: inviterData?.full_name || undefined,
          },
        })

        console.log('📧 Email Edge Function Response:', {
          success: emailResponse.data?.success,
          emailId: emailResponse.data?.emailId,
          error: emailResponse.error,
          data: emailResponse.data,
        })

        if (emailResponse.data?.success) {
          emailSent = true
          console.log('✅ Email sent successfully! Email ID:', emailResponse.data.emailId)
        } else {
          console.warn('❌ Email sending failed:', emailResponse.error || emailResponse.data?.error)
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError)
        // Continue - invitation was created, just email failed (FR-041)
      }

      const result = {
        invitation: { ...data, invitation_link: invitationLink },
        email_sent: emailSent,
        invitation_link: invitationLink
      }

      console.log('📬 Final invitation result:', result)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })

  const acceptInvitationMutation = useMutation({
    mutationFn: async ({
      token,
      password,
      full_name,
    }: {
      token: string
      password?: string
      full_name?: string
    }) => {
      const tokenHash = await hashToken(token)

      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select('*, organizations(*)')
        .eq('token_hash', tokenHash)
        .single()

      if (invError || !invitation) throw new Error('INVITATION_NOT_FOUND')
      if (invitation.status !== 'pending') throw new Error('INVITATION_ALREADY_ACCEPTED')
      if (new Date(invitation.expires_at) < new Date()) throw new Error('INVITATION_EXPIRED')

      // SINGLE-ORG VALIDATION: Check if invitation email already has a user with an organization
      // Use secure function that bypasses RLS (safe for unauthenticated users)
      const { data: hasOrg, error: checkError } = await supabase
        .rpc('check_email_has_organization', { check_email: invitation.email })

      if (checkError) {
        console.error('Error checking email organization:', checkError)
        throw new Error('EMAIL_CHECK_FAILED')
      }

      if (hasOrg) {
        throw new Error('USER_ALREADY_HAS_ORGANIZATION')
      }

      const { data: { user } } = await supabase.auth.getUser()

      // SINGLE-ORG VALIDATION: If authenticated user exists, verify they don't have an organization
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (userData?.organization_id) {
          throw new Error('USER_ALREADY_HAS_ORGANIZATION')
        }
      }

      if (!user && (!password || !full_name)) {
        throw new Error('PASSWORD_REQUIRED')
      }

      if (!user && password && full_name) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: invitation.email,
          password,
          options: { data: { full_name } },
        })
        if (authError) throw authError
        if (!authData.user) throw new Error('Signup failed')

        // IMMEDIATELY assign organization and role using SECURITY DEFINER function
        // This works even without a session (during email confirmation flow)
        const { data: acceptResult, error: acceptError } = await supabase
          .rpc('accept_invitation_for_user', {
            p_user_id: authData.user.id,
            p_invitation_id: invitation.id,
          })

        const result = acceptResult as unknown as AcceptInvitationResult

        if (acceptError) {
          console.error('Failed to accept invitation:', acceptError)
          throw new Error(`Failed to complete invitation: ${acceptError.message}`)
        }

        if (!result?.success) {
          console.error('Invitation acceptance failed:', result?.error)
          throw new Error(result?.error || 'Failed to accept invitation')
        }

        console.log('✅ Organization and role assigned:', {
          user_id: authData.user.id,
          organization_id: result.organization_id,
          role: result.role,
        })

        // Check if email confirmation is required (user created but no session)
        if (authData.user && !authData.session) {
          console.log('Email confirmation required - organization already assigned, user just needs to confirm email')
          return {
            user: { id: authData.user.id, email: invitation.email, is_new_user: true },
            organization: invitation.organizations,
            role: invitation.role,
            requires_email_confirmation: true,
          }
        }

        // If we have a session, return success
        return {
          user: { id: authData.user.id, email: invitation.email, is_new_user: true },
          organization: invitation.organizations,
          role: invitation.role,
        }
      }

      // Existing user accepting invitation
      const currentUser = await supabase.auth.getUser()
      const userId = currentUser.data.user?.id
      if (!userId) throw new Error('Authentication failed - please log in and try accepting the invitation again')

      // Use the same function for existing users
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc('accept_invitation_for_user', {
          p_user_id: userId,
          p_invitation_id: invitation.id,
        })

      const result = acceptResult as unknown as AcceptInvitationResult

      if (acceptError) {
        console.error('Failed to accept invitation:', acceptError)
        throw new Error(`Failed to complete invitation: ${acceptError.message}`)
      }

      if (!result?.success) {
        console.error('Invitation acceptance failed:', result?.error)
        throw new Error(result?.error || 'Failed to accept invitation')
      }

      return {
        user: { id: userId, email: invitation.email, is_new_user: false },
        organization: invitation.organizations,
        role: invitation.role,
      }
    },
  })

  const resendInvitationMutation = useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      // Get invitation details
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('id, email, role, organization_id, token_hash')
        .eq('id', invitationId)
        .eq('status', 'pending')
        .single()

      if (error || !invitation) throw new Error('Invitation not found')

      // Generate new token for resend
      const token = generateInvitationToken()
      const tokenHash = await hashToken(token)

      // Update invitation with new token
      await supabase
        .from('invitations')
        .update({ token_hash: tokenHash })
        .eq('id', invitationId)

      const invitationLink = `${window.location.origin}/accept-invitation?token=${token}`

      // Get organization name and inviter name
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: inviterData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', invitation.organization_id)
        .single()

      // Send email via Edge Function
      let emailSent = false
      try {
        const emailResponse = await supabase.functions.invoke('send-invitation', {
          body: {
            email: invitation.email,
            invitationLink,
            role: invitation.role,
            organizationName: orgData?.name || 'PipeTrak',
            inviterName: inviterData?.full_name || undefined,
          },
        })

        console.log('📧 Email Resend Edge Function Response:', {
          success: emailResponse.data?.success,
          emailId: emailResponse.data?.emailId,
          error: emailResponse.error,
          data: emailResponse.data,
        })

        if (emailResponse.data?.success) {
          emailSent = true
          console.log('✅ Email resent successfully! Email ID:', emailResponse.data.emailId)
        } else {
          console.warn('❌ Email resend failed:', emailResponse.error || emailResponse.data?.error)
        }
      } catch (emailError) {
        console.error('Error resending invitation email:', emailError)
      }

      return {
        email: invitation.email,
        resent_at: new Date().toISOString(),
        email_sent: emailSent,
        invitation_link: invitationLink
      }
    },

    onMutate: async () => {
      // Optimistic update - no actual state change needed since sent_at doesn't exist
      await queryClient.cancelQueries({ queryKey: ['invitations'] })
      const previousInvitations = queryClient.getQueryData(['invitations'])

      // No optimistic UI update needed - toast notification is sufficient
      return { previousInvitations }
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['invitations'], context?.previousInvitations)
      toast.error('Failed to resend invitation. Please try again.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })

  const revokeInvitationMutation = useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)

      if (error) throw error
    },

    onMutate: async ({ invitationId }) => {
      await queryClient.cancelQueries({ queryKey: ['invitations'] })
      const previousInvitations = queryClient.getQueryData(['invitations'])

      queryClient.setQueryData(['invitations'], (old: any) => {
        if (!old) return old
        if (Array.isArray(old)) {
          return old.filter(inv => inv.id !== invitationId)
        }
        if (old.invitations && Array.isArray(old.invitations)) {
          return {
            ...old,
            invitations: old.invitations.filter((inv: any) => inv.id !== invitationId),
            total_count: old.total_count - 1
          }
        }
        return old
      })

      return { previousInvitations }
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['invitations'], context?.previousInvitations)
      toast.error('Failed to revoke invitation. Please try again.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })

  return {
    useInvitations: useInvitationsList,
    useValidateToken,
    createInvitationMutation,
    acceptInvitationMutation,
    resendInvitationMutation,
    revokeInvitationMutation,
  }
}

export function useValidateToken(token: string) {
  return useQuery({
    queryKey: ['validateInvitation', token],
    queryFn: async () => {
      const tokenHash = await hashToken(token)
      // Note: invited_by references auth.users, not public.users, so we can't join
      const { data, error } = await supabase
        .from('invitations')
        .select('*, organizations(name)')
        .eq('token_hash', tokenHash)
        .single()

      if (error || !data) {
        return { valid: false, error: 'INVITATION_NOT_FOUND' }
      }

      if (data.status === 'revoked') {
        return { valid: false, error: 'INVITATION_REVOKED' }
      }

      if (new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'INVITATION_EXPIRED' }
      }

      const invData = data as any

      return {
        valid: true,
        invitation: {
          organization_name: invData.organizations?.name || 'Unknown',
          role: data.role,
          expires_at: data.expires_at,
          invited_by_name: 'Team Admin', // Can't fetch from public.users due to FK relationship
        },
      }
    },
    enabled: !!token,
  })
}

