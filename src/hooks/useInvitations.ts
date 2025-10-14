// T036: Invitations hook (TanStack Query)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

function useInvitationsList(params: InvitationsParams) {
  const { organizationId, status, limit = 50, offset = 0 } = params

  return useQuery({
    queryKey: ['invitations', organizationId, status, limit, offset],
    queryFn: async () => {
      let query = supabase.from('invitations').select('*, invited_by:users!invited_by(id, email, raw_user_meta_data)', { count: 'exact' })

      if (organizationId) query = query.eq('organization_id', organizationId)
      if (status) query = query.eq('status', status)

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) throw error

      const invitations = data?.map((inv: any) => ({
        ...inv,
        invited_by: {
          id: inv.invited_by?.id,
          email: inv.invited_by?.email,
          full_name: inv.invited_by?.raw_user_meta_data?.full_name || 'Unknown'
        }
      }))

      return { invitations: invitations || [], total_count: count || 0 }
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
      const { data: existingUser } = await supabase
        .from('users')
        .select('organization_id')
        .eq('email', email)
        .is('deleted_at', null)
        .maybeSingle()

      if (existingUser?.organization_id) {
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

      return {
        invitation: { ...data, invitation_link: invitationLink },
        email_sent: true,
        invitation_link: invitationLink
      }
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
      const { data: existingUser } = await supabase
        .from('users')
        .select('organization_id')
        .eq('email', invitation.email)
        .is('deleted_at', null)
        .single()

      if (existingUser?.organization_id) {
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
        if (authError || !authData.user) throw authError
      }

      const currentUser = await supabase.auth.getUser()
      const userId = currentUser.data.user?.id
      if (!userId) throw new Error('Authentication failed')

      // SINGLE-ORG: Atomically set organization_id and role on users table
      await supabase
        .from('users')
        .update({
          organization_id: invitation.organization_id,
          role: invitation.role,
        })
        .eq('id', userId)

      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return {
        user: { id: userId, email: invitation.email, is_new_user: !user },
        organization: invitation.organizations,
        role: invitation.role,
      }
    },
  })

  const resendInvitationMutation = useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single()

      if (error || !data) throw error
      if (data.status === 'accepted') throw new Error('INVITATION_ALREADY_ACCEPTED')
      if (data.status === 'revoked') throw new Error('INVITATION_REVOKED')

      return { success: true, email_sent: true }
    },
  })

  const revokeInvitationMutation = useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
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
      const { data, error } = await supabase
        .from('invitations')
        .select('*, organizations(name), invited_by_user:users!invited_by(id, email, raw_user_meta_data)')
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
          invited_by_name: invData.invited_by_user?.raw_user_meta_data?.full_name || 'Unknown',
        },
      }
    },
    enabled: !!token,
  })
}

