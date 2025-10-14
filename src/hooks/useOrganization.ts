/**
 * Organization Hook (Single-Org Model)
 * Feature: 004-plan-the-single
 *
 * Provides queries and mutations for organization and member management.
 * Updated to use direct users.organization_id relationship (no junction table).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orgMembers', variables.organizationId] })
    },
  })

  /**
   * Remove a member from organization
   * NOTE: In single-org model, removing a user from their only organization
   * effectively disables their account. Consider implications carefully.
   */
  const removeMemberMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string; organizationId: string }) => {
      // In single-org model, we can't truly "remove" a user from their only org
      // Options: 1) Delete the user account, 2) Set org to null (breaks NOT NULL), 3) Block at UI level
      // For now, we throw an error - this should be handled at UI level
      console.log('Cannot remove user:', userId)
      throw new Error('Cannot remove user from their only organization. Consider deleting the user account instead.')
    },
    onSuccess: (_, variables) => {
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
