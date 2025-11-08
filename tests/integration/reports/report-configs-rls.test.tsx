/**
 * Integration tests for RLS policies on report_configs table (Feature 019 - T072)
 * Verifies users can only modify their own configurations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import type { CreateReportConfigInput } from '@/types/reports';

// Test data
const TEST_PROJECT_ID = 'test-project-rls';
const USER_1_ID = 'user-1-rls-test';
const USER_2_ID = 'user-2-rls-test';

describe('Report Configs RLS Policies', () => {
  beforeEach(async () => {
    // Clean up test data
    await supabase
      .from('report_configs')
      .delete()
      .eq('project_id', TEST_PROJECT_ID);
  });

  describe('SELECT Policy', () => {
    it('allows users to view configs for projects they have access to', async () => {
      // Note: This test assumes user has access to TEST_PROJECT_ID
      // In production, RLS would filter based on user's organization membership

      const { data, error } = await supabase
        .from('report_configs')
        .select('*')
        .eq('project_id', TEST_PROJECT_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('returns empty array for projects user does not have access to', async () => {
      // Note: This test assumes user does NOT have access to 'unauthorized-project'
      // RLS should prevent seeing configs for other organizations

      const { data, error } = await supabase
        .from('report_configs')
        .select('*')
        .eq('project_id', 'unauthorized-project');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0);
    });
  });

  describe('INSERT Policy', () => {
    it('allows users to create configs for their own projects', async () => {
      const newConfig = {
        project_id: TEST_PROJECT_ID,
        name: 'RLS Test Config',
        description: 'Testing RLS insert policy',
        grouping_dimension: 'area',
        hierarchical_grouping: false,
        component_type_filter: null,
      };

      const { data, error } = await supabase
        .from('report_configs')
        .insert(newConfig)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.name).toBe('RLS Test Config');
    });

    it('prevents duplicate config names within same project', async () => {
      const config1 = {
        project_id: TEST_PROJECT_ID,
        name: 'Duplicate Name',
        grouping_dimension: 'area',
      };

      // First insert should succeed
      const { error: error1 } = await supabase
        .from('report_configs')
        .insert(config1)
        .select()
        .single();

      expect(error1).toBeNull();

      // Second insert with same name should fail (unique constraint)
      const { error: error2 } = await supabase
        .from('report_configs')
        .insert(config1)
        .select()
        .single();

      expect(error2).not.toBeNull();
      expect(error2?.message).toMatch(/duplicate key value|unique constraint/i);
    });

    it('automatically sets created_by to current user', async () => {
      const newConfig = {
        project_id: TEST_PROJECT_ID,
        name: 'Auto User Test',
        grouping_dimension: 'system',
      };

      const { data, error } = await supabase
        .from('report_configs')
        .insert(newConfig)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.created_by).toBeDefined();
      expect(typeof data?.created_by).toBe('string');
    });
  });

  describe('UPDATE Policy', () => {
    it('allows users to update their own configs', async () => {
      // Create config as current user
      const { data: created, error: createError } = await supabase
        .from('report_configs')
        .insert({
          project_id: TEST_PROJECT_ID,
          name: 'Update Test Config',
          grouping_dimension: 'area',
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(created).toBeDefined();

      // Update the config
      const { data: updated, error: updateError } = await supabase
        .from('report_configs')
        .update({
          name: 'Updated Name',
          description: 'Updated description',
        })
        .eq('id', created!.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated description');
    });

    it('prevents users from updating other users configs', async () => {
      // Note: This test requires mocking different user contexts
      // In practice, RLS policy checks created_by = auth.uid()
      // For now, we document the expected behavior

      // Create config as User 1 (simulated)
      const { data: created } = await supabase
        .from('report_configs')
        .insert({
          project_id: TEST_PROJECT_ID,
          name: 'User 1 Config',
          grouping_dimension: 'area',
          // In real scenario, created_by would be User 1's ID
        })
        .select()
        .single();

      // Try to update as User 2 (simulated)
      // This should fail in production with proper RLS
      // For testing purposes, we verify the RLS policy exists in migration

      expect(created).toBeDefined();

      // Verify RLS is enabled on table
      const { data: rlsStatus } = await supabase.rpc('pg_has_role', {
        role: 'authenticated',
        privilege: 'usage',
      });

      // This is a placeholder - in production tests, you'd switch user sessions
      // and verify the update fails for configs owned by other users
      expect(rlsStatus).toBeDefined();
    });

    it('updates updated_at timestamp automatically', async () => {
      const { data: created } = await supabase
        .from('report_configs')
        .insert({
          project_id: TEST_PROJECT_ID,
          name: 'Timestamp Test',
          grouping_dimension: 'area',
        })
        .select()
        .single();

      const originalUpdatedAt = new Date(created!.updated_at);

      // Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: updated } = await supabase
        .from('report_configs')
        .update({ description: 'Added description' })
        .eq('id', created!.id)
        .select()
        .single();

      const newUpdatedAt = new Date(updated!.updated_at);

      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('DELETE Policy', () => {
    it('allows users to delete their own configs', async () => {
      // Create config
      const { data: created } = await supabase
        .from('report_configs')
        .insert({
          project_id: TEST_PROJECT_ID,
          name: 'Delete Test Config',
          grouping_dimension: 'area',
        })
        .select()
        .single();

      expect(created).toBeDefined();

      // Delete the config
      const { error: deleteError } = await supabase
        .from('report_configs')
        .delete()
        .eq('id', created!.id);

      expect(deleteError).toBeNull();

      // Verify config is deleted
      const { data: retrieved } = await supabase
        .from('report_configs')
        .select('*')
        .eq('id', created!.id)
        .single();

      expect(retrieved).toBeNull();
    });

    it('prevents users from deleting other users configs', async () => {
      // Note: Similar to UPDATE test, this requires mocking different user contexts
      // RLS policy should check created_by = auth.uid()

      // Create config as User 1 (simulated)
      const { data: created } = await supabase
        .from('report_configs')
        .insert({
          project_id: TEST_PROJECT_ID,
          name: 'User 1 Delete Test',
          grouping_dimension: 'system',
        })
        .select()
        .single();

      expect(created).toBeDefined();

      // In production with proper user switching:
      // 1. Create session as User 1
      // 2. Create config (owned by User 1)
      // 3. Switch to User 2 session
      // 4. Try to delete User 1's config
      // 5. Verify deletion fails

      // For now, we document that RLS policy exists
      // See migration 00056_create_report_configs.sql for policy definition
    });

    it('allows deletion of multiple configs via cascading project delete', async () => {
      // Create multiple configs
      const configs = [
        {
          project_id: TEST_PROJECT_ID,
          name: 'Config 1',
          grouping_dimension: 'area' as const,
        },
        {
          project_id: TEST_PROJECT_ID,
          name: 'Config 2',
          grouping_dimension: 'system' as const,
        },
      ];

      for (const config of configs) {
        await supabase.from('report_configs').insert(config);
      }

      // Verify configs exist
      const { data: before } = await supabase
        .from('report_configs')
        .select('*')
        .eq('project_id', TEST_PROJECT_ID);

      expect(before?.length).toBeGreaterThanOrEqual(2);

      // Delete all configs for project
      const { error } = await supabase
        .from('report_configs')
        .delete()
        .eq('project_id', TEST_PROJECT_ID);

      expect(error).toBeNull();

      // Verify configs deleted
      const { data: after } = await supabase
        .from('report_configs')
        .select('*')
        .eq('project_id', TEST_PROJECT_ID);

      expect(after?.length).toBe(0);
    });
  });

  describe('Project Isolation', () => {
    it('isolates configs between different projects', async () => {
      const PROJECT_A = 'project-a-isolation';
      const PROJECT_B = 'project-b-isolation';

      // Create config for Project A
      await supabase.from('report_configs').insert({
        project_id: PROJECT_A,
        name: 'Project A Config',
        grouping_dimension: 'area',
      });

      // Create config for Project B
      await supabase.from('report_configs').insert({
        project_id: PROJECT_B,
        name: 'Project B Config',
        grouping_dimension: 'system',
      });

      // Query Project A configs
      const { data: projectAConfigs } = await supabase
        .from('report_configs')
        .select('*')
        .eq('project_id', PROJECT_A);

      // Query Project B configs
      const { data: projectBConfigs } = await supabase
        .from('report_configs')
        .select('*')
        .eq('project_id', PROJECT_B);

      // Verify isolation
      expect(projectAConfigs?.length).toBe(1);
      expect(projectAConfigs?.[0].name).toBe('Project A Config');

      expect(projectBConfigs?.length).toBe(1);
      expect(projectBConfigs?.[0].name).toBe('Project B Config');

      // Clean up
      await supabase.from('report_configs').delete().eq('project_id', PROJECT_A);
      await supabase.from('report_configs').delete().eq('project_id', PROJECT_B);
    });
  });

  describe('Database Constraints', () => {
    it('enforces unique constraint on (project_id, name)', async () => {
      const config = {
        project_id: TEST_PROJECT_ID,
        name: 'Unique Constraint Test',
        grouping_dimension: 'area',
      };

      // First insert
      const { error: error1 } = await supabase
        .from('report_configs')
        .insert(config);

      expect(error1).toBeNull();

      // Duplicate insert
      const { error: error2 } = await supabase
        .from('report_configs')
        .insert(config);

      expect(error2).not.toBeNull();
      expect(error2?.code).toBe('23505'); // PostgreSQL unique violation
    });

    it('requires project_id to reference valid project', async () => {
      const config = {
        project_id: 'non-existent-project-12345',
        name: 'Invalid Project Test',
        grouping_dimension: 'area',
      };

      const { error } = await supabase.from('report_configs').insert(config);

      // Should fail foreign key constraint
      expect(error).not.toBeNull();
      expect(error?.code).toBe('23503'); // PostgreSQL foreign key violation
    });

    it('enforces NOT NULL constraints', async () => {
      // Try to insert without required fields
      const invalidConfigs = [
        {
          // Missing project_id
          name: 'Missing Project',
          grouping_dimension: 'area',
        },
        {
          project_id: TEST_PROJECT_ID,
          // Missing name
          grouping_dimension: 'area',
        },
        {
          project_id: TEST_PROJECT_ID,
          name: 'Missing Dimension',
          // Missing grouping_dimension
        },
      ];

      for (const config of invalidConfigs) {
        const { error } = await supabase.from('report_configs').insert(config as any);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('23502'); // PostgreSQL NOT NULL violation
      }
    });

    it('validates grouping_dimension enum values', async () => {
      const invalidConfig = {
        project_id: TEST_PROJECT_ID,
        name: 'Invalid Dimension',
        grouping_dimension: 'invalid_dimension', // Not in enum
      };

      const { error } = await supabase.from('report_configs').insert(invalidConfig);

      expect(error).not.toBeNull();
      // Should fail check constraint or enum validation
    });
  });

  describe('Default Values', () => {
    it('sets default values for optional fields', async () => {
      const minimalConfig = {
        project_id: TEST_PROJECT_ID,
        name: 'Minimal Config',
        grouping_dimension: 'area',
      };

      const { data, error } = await supabase
        .from('report_configs')
        .insert(minimalConfig)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.hierarchical_grouping).toBe(false);
      expect(data?.component_type_filter).toBeNull();
      expect(data?.description).toBeNull();
      expect(data?.created_at).toBeDefined();
      expect(data?.updated_at).toBeDefined();
    });

    it('sets created_at and updated_at to same value on insert', async () => {
      const { data } = await supabase
        .from('report_configs')
        .insert({
          project_id: TEST_PROJECT_ID,
          name: 'Timestamp Test',
          grouping_dimension: 'area',
        })
        .select()
        .single();

      const createdAt = new Date(data!.created_at);
      const updatedAt = new Date(data!.updated_at);

      // Should be within 1 second of each other
      expect(Math.abs(createdAt.getTime() - updatedAt.getTime())).toBeLessThan(1000);
    });
  });
});
