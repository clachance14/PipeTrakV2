import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Unmock supabase for integration tests - we need the real client
vi.unmock('@/lib/supabase');

// Get migration path relative to project root
const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20251120101651_qc_weld_completion_alerts.sql'
);

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create service role client for testing RLS policies
// @ts-ignore - import.meta.env is available in Vite/Vitest
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Service role key comes from process.env (loaded from .env)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

// Service role client bypasses RLS - used to set up test data
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

describe('Needs Review RLS - weld_completed filtering', () => {
  it('should verify migration file contains RLS policy for weld_completed filtering', () => {
    // Read the migration file to verify the policy was created
    const migrationContent = readFileSync(MIGRATION_PATH, 'utf-8');

    // Verify the migration contains the RLS policy
    expect(migrationContent).toContain('CREATE POLICY "Users can view needs_review in their organization"');
    expect(migrationContent).toContain('FOR SELECT USING');

    // Verify the policy filters weld_completed by qc_inspector role
    expect(migrationContent).toContain("type != 'weld_completed'");
    expect(migrationContent).toContain("type = 'weld_completed'");
    expect(migrationContent).toContain("role = 'qc_inspector'");

    console.log('✓ Migration file contains RLS policy with weld_completed filtering');
  });

  it('should verify migration file contains weld_completed type constraint', () => {
    // Read the migration file
    const migrationContent = readFileSync(MIGRATION_PATH, 'utf-8');

    // Verify weld_completed is added to the type constraint
    expect(migrationContent).toContain('ADD CONSTRAINT needs_review_type_check');
    expect(migrationContent).toContain("'weld_completed'");

    console.log('✓ Migration file adds weld_completed to type constraint');
  });

  it('should verify migration file creates trigger function', () => {
    // Read the migration file
    const migrationContent = readFileSync(MIGRATION_PATH, 'utf-8');

    // Verify trigger function is created
    expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION notify_qc_on_weld_completion()');
    expect(migrationContent).toContain('SECURITY DEFINER');
    expect(migrationContent).toContain("'weld_completed',");
    expect(migrationContent).toContain('INSERT INTO needs_review');

    console.log('✓ Migration file creates trigger function with SECURITY DEFINER');
  });

  it('should allow weld_completed as a valid type (constraint test)', async () => {
    // Get a real project to test with
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (!projects || projects.length === 0) {
      console.log('⚠️  Skipping: No projects available for testing');
      return;
    }

    const testProjectId = projects[0]!.id;

    // Test by attempting to create a needs_review with weld_completed type
    const { data, error } = await supabase
      .from('needs_review')
      .insert({
        project_id: testProjectId,
        type: 'weld_completed',
        payload: { weld_id: 'test-weld', weld_number: 'W-TEST' },
        status: 'pending'
      })
      .select()
      .single();

    // Should succeed (no type constraint error)
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.type).toBe('weld_completed');

    // Cleanup
    if (data) {
      await supabase.from('needs_review').delete().eq('id', data.id);
    }

    console.log('✓ weld_completed type is allowed in needs_review table');
  });

  it('should verify RLS policy logic structure', () => {
    // Read the migration file
    const migrationContent = readFileSync(MIGRATION_PATH, 'utf-8');

    // Extract the policy definition
    const policyMatch = migrationContent.match(/CREATE POLICY "Users can view needs_review in their organization"[\s\S]*?\);/);

    expect(policyMatch).toBeDefined();

    const policyDef = policyMatch![0];

    // Verify policy structure:
    // 1. Uses FOR SELECT
    expect(policyDef).toContain('FOR SELECT');

    // 2. Checks organization membership
    expect(policyDef).toContain('organization_id');

    // 3. Has two conditions with OR:
    //    - Non-weld_completed types are visible to everyone
    //    - weld_completed types are only visible to qc_inspector
    expect(policyDef).toContain('AND (');
    expect(policyDef).toContain("type != 'weld_completed'");
    expect(policyDef).toContain('OR');
    expect(policyDef).toContain("(type = 'weld_completed'");
    expect(policyDef).toContain("role = 'qc_inspector'");

    console.log('✓ RLS policy has correct structure with role-based filtering');
  });
});
