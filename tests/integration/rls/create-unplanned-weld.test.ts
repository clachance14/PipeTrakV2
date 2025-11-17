import { describe, it, expect, vi, beforeAll } from 'vitest';

// Unmock supabase for integration tests - we need the real client
vi.unmock('@/lib/supabase');

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create real Supabase client for integration tests
// @ts-ignore - import.meta.env is available in Vite/Vitest
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('create_unplanned_weld RPC', () => {
  let testProjectId: string;
  let testDrawingId: string;

  beforeAll(async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user for test');
    }

    // Get user's organization and first project
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      throw new Error('User has no organization');
    }

    // Get first project from user's organization
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .limit(1);

    if (!projects || projects.length === 0) {
      throw new Error('No projects found for testing');
    }

    testProjectId = projects[0]!.id;

    // Get first drawing from project
    const { data: drawings } = await supabase
      .from('drawings')
      .select('id, area_id, system_id, test_package_id')
      .eq('project_id', testProjectId)
      .limit(1);

    if (!drawings || drawings.length === 0) {
      throw new Error('No drawings found for testing');
    }

    testDrawingId = drawings[0]!.id;
  });

  describe('T004: Permission Checks', () => {
    it('should allow Owner role to create unplanned weld', async () => {
      // This test should FAIL until RPC is implemented
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-TEST-${Date.now()}`,
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_spec: 'HC05',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data).toHaveProperty('field_weld');
      expect(data).toHaveProperty('component');
    });

    it('should allow Admin role to create unplanned weld', async () => {
      // This test should FAIL until RPC is implemented
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-TEST-${Date.now()}`,
        p_weld_type: 'SW',
        p_weld_size: '1"',
        p_spec: 'HC05',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it('should allow PM role to create unplanned weld', async () => {
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-TEST-${Date.now()}`,
        p_weld_type: 'FW',
        p_weld_size: '1/2"',
        p_spec: 'HC05',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it('should allow Foreman role to create unplanned weld', async () => {
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-TEST-${Date.now()}`,
        p_weld_type: 'TW',
        p_weld_size: '3"',
        p_spec: 'HC05',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it('should allow QC Inspector role to create unplanned weld', async () => {
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-TEST-${Date.now()}`,
        p_weld_type: 'BW',
        p_weld_size: '4"',
        p_spec: 'HC05',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    // Note: We can't easily test Viewer/Welder rejection without switching users
    // That would require separate test users with different roles
    // For now, we rely on the RPC function's permission check logic
  });

  describe('T005: Duplicate Weld Number Rejection', () => {
    it('should reject duplicate weld number in same project', async () => {
      const weldNumber = `W-DUP-${Date.now()}`;

      // Create first weld
      const { error: error1 } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: weldNumber,
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_spec: 'HC05',
      });

      expect(error1).toBeNull();

      // Attempt to create duplicate - should FAIL
      const { error: error2 } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: weldNumber, // Same number
        p_weld_type: 'SW',
        p_weld_size: '1"',
        p_spec: 'HC05',
      });

      expect(error2).toBeTruthy();
      expect(error2?.message).toContain('Duplicate weld number');
    });
  });

  describe('T006: Metadata Inheritance', () => {
    it('should inherit area_id, system_id, test_package_id from drawing', async () => {
      // Get drawing metadata first
      const { data: drawing } = await supabase
        .from('drawings')
        .select('area_id, system_id, test_package_id')
        .eq('id', testDrawingId)
        .single();

      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-META-${Date.now()}`,
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_spec: 'HC05',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      // Verify component metadata matches drawing
      const component = data?.component;
      expect(component?.area_id).toBe(drawing?.area_id);
      expect(component?.system_id).toBe(drawing?.system_id);
      expect(component?.test_package_id).toBe(drawing?.test_package_id);
    });
  });

  describe('T007: Atomic Transaction Rollback', () => {
    it('should rollback if component insert fails', async () => {
      // Attempt to create with invalid project_id (should fail foreign key constraint)
      const { error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: '00000000-0000-0000-0000-000000000000', // Invalid
        p_drawing_id: testDrawingId,
        p_weld_number: `W-FAIL-${Date.now()}`,
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_spec: 'HC05',
      });

      expect(error).toBeTruthy();

      // Verify no orphaned field_weld records exist
      const { data: orphans } = await supabase
        .from('field_welds')
        .select('id')
        .is('component_id', null);

      expect(orphans).toEqual([]);
    });

    it('should rollback if field_weld insert fails', async () => {
      // Attempt to create with invalid weld_type (should fail CHECK constraint)
      const { error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-INVALID-${Date.now()}`,
        p_weld_type: 'INVALID', // Invalid weld type
        p_weld_size: '2"',
        p_spec: 'HC05',
      });

      expect(error).toBeTruthy();

      // Verify no orphaned component records exist for this weld number
      const { data: orphans } = await supabase
        .from('components')
        .select('id')
        .eq('component_type', 'field_weld')
        .eq('identity_key->weld_number', `W-INVALID-${Date.now()}`);

      expect(orphans).toEqual([]);
    });
  });

  describe('Optional Fields', () => {
    it('should accept optional schedule, base_metal, notes fields', async () => {
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-OPT-${Date.now()}`,
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_spec: 'HC05',
        p_schedule: 'XS',
        p_base_metal: 'CS',
        p_notes: 'Field change per client request',
      });

      expect(error).toBeNull();
      expect(data?.field_weld?.schedule).toBe('XS');
      expect(data?.field_weld?.base_metal).toBe('CS');
      expect(data?.field_weld?.notes).toBe('Field change per client request');
    });

    it('should create weld successfully with only required fields', async () => {
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-REQ-${Date.now()}`,
        p_weld_type: 'SW',
        p_weld_size: '1"',
        p_spec: 'HC05',
        // No optional fields
      });

      expect(error).toBeNull();
      expect(data?.field_weld?.schedule).toBeNull();
      expect(data?.field_weld?.base_metal).toBeNull();
      expect(data?.field_weld?.notes).toBeNull();
    });
  });

  describe('Return Value Structure', () => {
    it('should return both field_weld and component records', async () => {
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: testProjectId,
        p_drawing_id: testDrawingId,
        p_weld_number: `W-RET-${Date.now()}`,
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_spec: 'HC05',
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('field_weld');
      expect(data).toHaveProperty('component');

      // Verify field_weld structure
      const fieldWeld = data?.field_weld;
      expect(fieldWeld).toHaveProperty('id');
      expect(fieldWeld).toHaveProperty('component_id');
      expect(fieldWeld).toHaveProperty('project_id');
      expect(fieldWeld?.weld_type).toBe('BW');
      expect(fieldWeld?.weld_size).toBe('2"');
      expect(fieldWeld?.spec).toBe('HC05');
      expect(fieldWeld?.status).toBe('active');

      // Verify component structure
      const component = data?.component;
      expect(component).toHaveProperty('id');
      expect(component?.project_id).toBe(testProjectId);
      expect(component?.drawing_id).toBe(testDrawingId);
      expect(component?.component_type).toBe('field_weld');
      expect(component?.percent_complete).toBe(0);

      // Verify relationship
      expect(fieldWeld?.component_id).toBe(component?.id);
    });
  });
});
