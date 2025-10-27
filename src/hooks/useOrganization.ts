/**
 * Organization Hook (Single-Org Model)
 * Feature: 004-plan-the-single
 *
 * Provides queries and mutations for organization and member management.
 * Updated to use direct users.organization_id relationship (no junction table).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Role } from '@/types/team.types'

type UserRole = Role

interface OrgMembersParams {
  organizationId: string
  role?: UserRole
  search?: string
  limit?: number
  offset?: number
}

/**
 * Fetch the current user's organization
 * Uses direct users.organization_id relationship
 */
function useCurrentOrganizationQuery() {
  return useQuery({
    queryKey: ['currentOrganization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (userError) throw userError
      if (!userData.organization_id) throw new Error('User has no organization')

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', userData.organization_id)
        .single()

      if (orgError) throw orgError

      return {
        organization: org,
        role: userData.role,
      }
    },
  })
}

/**
 * Fetch organization members
 * Queries users table directly by organization_id
 */
function useOrgMembersList(params: OrgMembersParams) {
  const { organizationId, role, search, limit = 50, offset = 0 } = params

  return useQuery({
    queryKey: ['orgMembers', organizationId, role, search, limit, offset],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('id, email, full_name, role, created_at', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      if (role) query = query.eq('role', role)
      if (search) query = query.ilike('email', `%${search}%`)

      const { data, error, count } = await query.range(offset, offset + limit - 1)

      if (error) throw error

      const members = data?.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || 'Unknown',
        role: user.role,
        joined_at: user.created_at,
      }))

      return { members: members || [], total_count: count || 0 }
    },
    enabled: !!organizationId,
  })
}

export function useOrganization() {
  const queryClient = useQueryClient()

  /**
   * Update a member's role
   * Modifies users.role directly
   * Includes optimistic updates for <50ms perceived latency
   */
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      organizationId,
    }: {
      userId: string
      role: UserRole
      organizationId: string
    }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) throw error
      return { success: true, user: data }
    },

    onMutate: async ({ userId, role, organizationId }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['orgMembers', organizationId] })
      const previousMembers = queryClient.getQueryData(['orgMembers', organizationId])

      // Optimistically update the cache
      queryClient.setQueryData(['orgMembers', organizationId], (old: any) => {
        if (!old || !old.members) return old
        return {
          ...old,
          members: old.members.map((member: any) =>
            member.id === userId ? { ...member, role } : member
          ),
        }
      })

      return { previousMembers }
    },

    onError: (_err, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousMembers) {
        queryClient.setQueryData(['orgMembers', variables.organizationId], context.previousMembers)
      }
      toast.error('Failed to update role. Please try again.')
    },

    onSuccess: (_, variables) => {
      toast.success(`Role updated to ${variables.role}`)
    },

    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orgMembers', variables.organizationId] })
    },
  })

  /**
   * Remove a member from organization
   * NOTE: In single-org model, this soft-deletes the user by setting deleted_at timestamp.
   */
  const removeMemberMutation = useMutation({
    mutationFn: async ({ userId, organizationId }: { userId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('organization_id', organizationId)

      if (error) throw error
    },

    onMutate: async ({ userId, organizationId }) => {
      await queryClient.cancelQueries({ queryKey: ['orgMembers', organizationId] })
      const previousMembers = queryClient.getQueryData(['orgMembers', organizationId])

      // Get member name before removing
      const memberData = previousMembers as { members: Array<{ id: string; full_name: string | null; email: string }> } | undefined
      const member = memberData?.members?.find((m) => m.id === userId)
      const memberName = member?.full_name || member?.email || 'Member'

      // Optimistically update the cache by removing the member
      queryClient.setQueryData(['orgMembers', organizationId], (old: any) => {
        if (!old || !old.members) return old
        return {
          ...old,
          members: old.members.filter((m: any) => m.id !== userId),
          total_count: old.total_count - 1,
        }
      })

      return { previousMembers, memberName }
    },

    onError: (_err, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousMembers) {
        queryClient.setQueryData(['orgMembers', variables.organizationId], context.previousMembers)
      }
      toast.error('Failed to remove member. Please try again.')
    },

    onSuccess: (_data, _variables, context) => {
      toast.success(`${context?.memberName} removed from organization`)
    },

    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orgMembers', variables.organizationId] })
    },
  })

  return {
    useCurrentOrganization: useCurrentOrganizationQuery,
    useOrgMembers: useOrgMembersList,
    updateMemberRoleMutation,
    removeMemberMutation,
  }
}
