import { describe, it, expect, vi } from 'vitest';

// Unmock supabase for contract tests - we need the real client to validate schema
vi.unmock('@/lib/supabase');

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create real Supabase client for contract tests
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('Migration Schema Contract', () => {
  describe('Table Structure', () => {
    it('user_organizations table should not exist', async () => {
      const { data: _data, error } = await supabase
        .from('user_organizations' as any)
        .select('*')
        .limit(1);

      // Should fail because table doesn't exist
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/table.*user_organizations|relation/i);
    });

    it('users table should have organization_id column', async () => {
      const { data: _data, error } = await supabase
        .from('users')
        .select('organization_id')
        .limit(1);

      expect(error).toBeNull();
      // Column should exist (query succeeds)
    });

    it('users table should have role column', async () => {
      const { data: _data, error } = await supabase
        .from('users')
        .select('role')
        .limit(1);

      expect(error).toBeNull();
      // Column should exist (query succeeds)
    });
  });

  describe('Data Integrity', () => {
    it('all users should have organization_id (NOT NULL)', async () => {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, organization_id')
        .is('organization_id', null);

      expect(error).toBeNull();
      expect(users).toHaveLength(0); // No users with NULL organization_id
    });

    it('all users should have role (NOT NULL)', async () => {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, role')
        .is('role', null);

      expect(error).toBeNull();
      expect(users).toHaveLength(0); // No users with NULL role
    });

    it('role column should only accept valid values', async () => {
      const validRoles = ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer'];

      const { data: users, error } = await supabase
        .from('users')
        .select('role');

      expect(error).toBeNull();
      users?.forEach(user => {
        expect(validRoles).toContain(user.role);
      });
    });
  });

  describe('Relationships', () => {
    it('users.organization_id should reference organizations table', async () => {
      const { data: users, error: _usersError } = await supabase
        .from('users')
        .select('organization_id')
        .limit(1)
        .single();

      if (users?.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', users.organization_id)
          .single();

        expect(orgError).toBeNull();
        expect(org).toBeTruthy();
        expect(org?.id).toBe(users.organization_id);
      }
    });
  });
});
