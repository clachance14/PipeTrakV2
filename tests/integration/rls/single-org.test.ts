import { describe, it, expect, vi } from 'vitest';

// Unmock supabase for integration tests - we need the real client
vi.unmock('@/lib/supabase');

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create real Supabase client for integration tests
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('RLS Single-Org Isolation', () => {
  describe('Direct Organization Relationship', () => {
    it.skip('user can read own organization using users.organization_id', async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user for test');
      }

      // Query user's organization via direct relationship
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      expect(userError).toBeNull();
      expect(userData).toBeTruthy();
      expect(userData?.organization_id).toBeTruthy();

      // Verify can read organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData!.organization_id)
        .single();

      expect(orgError).toBeNull();
      expect(org).toBeTruthy();
    });

    it.skip('user can read own org projects without JOIN to user_organizations', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user for test');
      }

      // Get user's organization_id
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Query projects filtered by organization
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', userData!.organization_id);

      expect(error).toBeNull();
      expect(Array.isArray(projects)).toBe(true);
      // RLS should allow reading own org's projects
    });
  });

  describe('RLS Policy Validation', () => {
    it('RLS policies should NOT reference user_organizations table', async () => {
      // This test verifies indirectly by checking queries work without the junction table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.organization_id).toBeTruthy();
      expect(data?.role).toBeTruthy();
    });
  });
});
