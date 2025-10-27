// useOrgMembers hook - TanStack Query hook for organization members
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { TeamMember, Role } from '@/types/team.types';

interface OrgMembersParams {
  organizationId: string;
  role?: Role | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}

export function useOrgMembers(params: OrgMembersParams) {
  const { organizationId, role, search } = params;

  return useQuery({
    queryKey: ['org-members', { organization_id: organizationId, role }],
    queryFn: async () => {
      // SINGLE-ORG MODEL: Query users table directly
      // organization_id and role are columns on users table
      let query = supabase
        .from('users')
        .select('id, email, full_name, organization_id, role, created_at')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (role && role !== 'all') {
        query = query.eq('role', role);
      }

      const { data, error } = await query.order('email', { ascending: true });

      if (error) throw error;

      // Transform to TeamMember format
      const members: TeamMember[] = (data || []).map((user: any) => {
        return {
          user_id: user.id,
          organization_id: user.organization_id,
          name: user.full_name || user.email.split('@')[0],
          email: user.email,
          role: user.role,
          joined_at: user.created_at,
          last_active: null, // Note: last_active_at column doesn't exist in users table
        };
      });

      // Client-side search filter (debounced at component level)
      const filteredMembers = search
        ? members.filter(
            member =>
              member.name.toLowerCase().includes(search.toLowerCase()) ||
              member.email.toLowerCase().includes(search.toLowerCase())
          )
        : members;

      return filteredMembers;
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string;
      organizationId?: string;
      newRole: Role;
    }) => {
      // SINGLE-ORG MODEL: Update role directly on users table
      const { data, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { user: data };
    },

    onMutate: async ({ userId, newRole }) => {
      await queryClient.cancelQueries({ queryKey: ['org-members'] });
      const previousMembers = queryClient.getQueryData(['org-members']);

      queryClient.setQueryData(['org-members'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((member: TeamMember) =>
            member.user_id === userId ? { ...member, role: newRole } : member
          );
        }
        return old;
      });

      return { previousMembers };
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['org-members'], context?.previousMembers);
      toast.error('Failed to update role. Please try again.');
    },

    onSuccess: (_data, variables) => {
      toast.success(`Role updated to ${variables.newRole}`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
    }: {
      userId: string;
      organizationId?: string;
    }) => {
      // SINGLE-ORG MODEL: Soft delete user by setting deleted_at
      const { error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    },

    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: ['org-members'] });
      const previousMembers = queryClient.getQueryData(['org-members']);

      queryClient.setQueryData(['org-members'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.filter((member: TeamMember) => member.user_id !== userId);
        }
        return old;
      });

      return { previousMembers };
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['org-members'], context?.previousMembers);
      toast.error('Failed to remove member. Please try again.');
    },

    onSuccess: () => {
      toast.success('Member removed from organization');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });
}
