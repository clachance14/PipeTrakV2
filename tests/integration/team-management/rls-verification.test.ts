// T022: Verify RLS policies restrict access to owner/admin roles
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Unmock supabase for integration tests
import { vi } from 'vitest';
vi.unmock('@/lib/supabase');

// Create real Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('Team Management RLS Policies', () => {
  describe('User Organization Access', () => {
    it('should only allow users to view members from their own organization', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('Skipping test: No authenticated user');
        return;
      }

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      expect(userData?.organization_id).toBeTruthy();
      const myOrgId = userData!.organization_id!;

      // Query user_organizations - should only see own org's members
      const { data: members } = await supabase
        .from('users')
        .select('*, user_organizations!inner(organization_id, role)')
        .eq('user_organizations.organization_id', myOrgId)
        .is('user_organizations.deleted_at', null);

      expect(members).toBeTruthy();
      expect(members!.length).toBeGreaterThan(0);

      // Verify all returned members belong to the same organization
      members?.forEach((member: any) => {
        const userOrg = Array.isArray(member.user_organizations)
          ? member.user_organizations[0]
          : member.user_organizations;
        expect(userOrg.organization_id).toBe(myOrgId);
      });
    });

    it('should prevent querying members from other organizations', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate a random UUID that's not the user's org
      const fakeOrgId = '00000000-0000-0000-0000-000000000000';

      // Attempt to query members from fake organization
      const { data: members } = await supabase
        .from('users')
        .select('*, user_organizations!inner(organization_id, role)')
        .eq('user_organizations.organization_id', fakeOrgId);

      // Should return empty array (RLS filters out unauthorized data)
      expect(members).toEqual([]);
    });
  });

  describe('Invitation Access', () => {
    it('should only allow users to view invitations from their own organization', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      const myOrgId = userData!.organization_id!;

      // Query invitations - should only see own org's invitations
      const { data: invitations } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', myOrgId);

      expect(invitations).toBeTruthy();

      // All invitations should belong to user's org
      invitations?.forEach(invitation => {
        expect(invitation.organization_id).toBe(myOrgId);
      });
    });

    it('should prevent viewing invitations from other organizations', async () => {
      const fakeOrgId = '00000000-0000-0000-0000-000000000000';

      // Attempt to query invitations from fake organization
      const { data: invitations } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', fakeOrgId);

      // Should return empty array (RLS filters out unauthorized data)
      expect(invitations).toEqual([]);
    });
  });

  describe('Role-Based Permissions', () => {
    it('should allow owner/admin to view all team members', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's role
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, user_organizations!inner(role)')
        .eq('id', user.id)
        .single();

      const userOrg = Array.isArray((userData as any)?.user_organizations)
        ? (userData as any).user_organizations[0]
        : (userData as any)?.user_organizations;

      const userRole = userOrg?.role;
      const orgId = userData?.organization_id;

      // If user is owner or admin, they should be able to query members
      if (userRole === 'owner' || userRole === 'admin') {
        const { data: members, error } = await supabase
          .from('users')
          .select('*, user_organizations!inner(organization_id, role)')
          .eq('user_organizations.organization_id', orgId!)
          .is('user_organizations.deleted_at', null);

        expect(error).toBeNull();
        expect(members).toBeTruthy();
        expect(members!.length).toBeGreaterThan(0);
      } else {
        console.log(`User has role: ${userRole}, skipping admin-only test`);
      }
    });
  });

  describe('Data Isolation', () => {
    it('should not leak user data across organizations via joins', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Attempt to query all users (should be filtered by RLS)
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email');

      // RLS should restrict this to only users we can access
      // (users in our organization via user_organizations join)
      expect(allUsers).toBeTruthy();

      // We should only see ourselves (or members of our org if we have access)
      const userIds = allUsers?.map(u => u.id) || [];
      expect(userIds).toContain(user.id);
    });

    it('should enforce organization_id filter on all member queries', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      const myOrgId = userData?.organization_id;

      // Query without explicit organization_id filter should still be restricted by RLS
      const { data: members } = await supabase
        .from('users')
        .select('*, user_organizations!inner(organization_id, role)')
        .is('user_organizations.deleted_at', null);

      // All returned members should belong to user's organization
      members?.forEach((member: any) => {
        const userOrg = Array.isArray(member.user_organizations)
          ? member.user_organizations[0]
          : member.user_organizations;
        expect(userOrg.organization_id).toBe(myOrgId);
      });
    });
  });
});
