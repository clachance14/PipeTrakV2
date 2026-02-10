/**
 * Contract Tests: Stored Procedures (Sprint 1 Core Foundation)
 *
 * Tests for 5 stored procedures in Feature 005-sprint-1-core:
 * 1. calculate_component_percent(component_id UUID) → NUMERIC(5,2)
 * 2. detect_similar_drawings(project_id UUID, drawing_no_norm TEXT, threshold NUMERIC) → TABLE
 * 3. validate_component_identity_key(component_type TEXT, identity_key JSONB) → BOOLEAN
 * 4. validate_milestone_weights(milestones_config JSONB) → BOOLEAN
 * 5. get_weld_repair_history(parent_weld_id UUID) → TABLE
 *
 * These tests MUST FAIL before migration 00009_sprint1_core_tables.sql is applied (TDD).
 *
 * Expected: ALL TESTS FAIL until stored procedures are created in migration
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Unmock supabase for contract tests
vi.unmock('@/lib/supabase');

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create real Supabase client for contract tests
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('Stored Procedures - Sprint 1', () => {
  let testProjectId: string;
  let testComponentId: string;
  let testSpoolTemplateId: string;
  let _testFieldWeldTemplateId: string;

  beforeAll(async () => {
    // Create test project for stored procedure tests
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name: 'Test Project - Stored Procedures' })
      .select()
      .single();

    if (projectError) throw projectError;
    testProjectId = project.id;

    // Get progress templates for test components
    const { data: spoolTemplate } = await supabase
      .from('progress_templates' as any)
      .select('id')
      .eq('component_type', 'spool')
      .eq('version', 1)
      .single();

    const { data: fieldWeldTemplate } = await supabase
      .from('progress_templates' as any)
      .select('id')
      .eq('component_type', 'field_weld')
      .eq('version', 1)
      .single();

    testSpoolTemplateId = spoolTemplate?.id;
    _testFieldWeldTemplateId = fieldWeldTemplate?.id;

    // Create test component for calculate_component_percent tests
    const { data: component } = await supabase
      .from('components' as any)
      .insert({
        project_id: testProjectId,
        component_type: 'spool',
        progress_template_id: testSpoolTemplateId,
        identity_key: { spool_id: 'SP-TEST-001' },
        current_milestones: {},
        percent_complete: 0.00
      })
      .select()
      .single();

    testComponentId = component?.id;
  });

  describe('calculate_component_percent', () => {
    it('should return 0.00 when no milestones complete', async () => {
      // Test component created with empty milestones
      const { data, error } = await supabase.rpc('calculate_component_percent' as any, {
        p_component_id: testComponentId
      });

      expect(error).toBeNull();
      expect(data).toBe(0.00);
    });

    it('should return 45.00 for spool with Receive (5%) + Erect (40%) complete', async () => {
      // Update component milestones: Receive + Erect
      await supabase
        .from('components' as any)
        .update({
          current_milestones: {
            "Receive": true,
            "Erect": true,
            "Connect": false,
            "Punch": false,
            "Test": false,
            "Restore": false
          }
        })
        .eq('id', testComponentId);

      const { data, error } = await supabase.rpc('calculate_component_percent' as any, {
        p_component_id: testComponentId
      });

      expect(error).toBeNull();
      expect(data).toBe(45.00);
    });

    it('should return 100.00 when all milestones complete', async () => {
      // Update component milestones: all complete
      await supabase
        .from('components' as any)
        .update({
          current_milestones: {
            "Receive": true,
            "Erect": true,
            "Connect": true,
            "Punch": true,
            "Test": true,
            "Restore": true
          }
        })
        .eq('id', testComponentId);

      const { data, error } = await supabase.rpc('calculate_component_percent' as any, {
        p_component_id: testComponentId
      });

      expect(error).toBeNull();
      expect(data).toBe(100.00);
    });

    it('should calculate partial % for hybrid workflow (threaded pipe with 75% fabricate)', async () => {
      // Get threaded_pipe template
      const { data: threadedTemplate } = await supabase
        .from('progress_templates' as any)
        .select('id')
        .eq('component_type', 'threaded_pipe')
        .eq('version', 1)
        .single();

      // Create threaded pipe component
      const { data: threadedComponent } = await supabase
        .from('components' as any)
        .insert({
          project_id: testProjectId,
          component_type: 'threaded_pipe',
          progress_template_id: threadedTemplate.id,
          identity_key: { drawing_norm: 'P-001', commodity_code: 'CS-2', size: '2IN', seq: 1 },
          current_milestones: {
            "Fabricate": 75.00, // 16% * 0.75 = 12.00%
            "Install": 0,
            "Erect": 0,
            "Connect": 0,
            "Support": 0,
            "Punch": false,
            "Test": false,
            "Restore": false
          },
          percent_complete: 0.00
        })
        .select()
        .single();

      const { data, error } = await supabase.rpc('calculate_component_percent' as any, {
        p_component_id: threadedComponent.id
      });

      expect(error).toBeNull();
      expect(data).toBe(12.00);
    });
  });

  describe('detect_similar_drawings', () => {
    it('should find P-0001 when searching for P-001 (>85% similarity)', async () => {
      // Create similar drawings
      await supabase.from('drawings' as any).insert([
        { project_id: testProjectId, drawing_no_raw: 'P-0001', drawing_no_norm: 'P0001' },
        { project_id: testProjectId, drawing_no_raw: 'P-0002', drawing_no_norm: 'P0002' },
      ]);

      const { data, error } = await supabase.rpc('detect_similar_drawings' as any, {
        p_project_id: testProjectId,
        p_drawing_no_norm: 'P001',
        p_threshold: 0.85
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);

      // Check that P0001 is in results
      const matchingDrawing = data.find((d: any) => d.drawing_no_norm === 'P0001');
      expect(matchingDrawing).toBeDefined();
      expect(matchingDrawing.similarity_score).toBeGreaterThan(0.85);
    });

    it('should exclude retired drawings from results', async () => {
      // Create retired drawing
      await supabase.from('drawings' as any).insert({
        project_id: testProjectId,
        drawing_no_raw: 'P-RETIRED',
        drawing_no_norm: 'PRETIRED',
        is_retired: true
      });

      const { data, error } = await supabase.rpc('detect_similar_drawings' as any, {
        p_project_id: testProjectId,
        p_drawing_no_norm: 'PRETIRED',
        p_threshold: 0.85
      });

      expect(error).toBeNull();
      // Should not include the retired drawing
      const retiredDrawing = data?.find((d: any) => d.drawing_no_norm === 'PRETIRED');
      expect(retiredDrawing).toBeUndefined();
    });

    it('should return max 3 results ordered by similarity score DESC', async () => {
      // Create multiple similar drawings
      await supabase.from('drawings' as any).insert([
        { project_id: testProjectId, drawing_no_raw: 'SIM-001', drawing_no_norm: 'SIM001' },
        { project_id: testProjectId, drawing_no_raw: 'SIM-002', drawing_no_norm: 'SIM002' },
        { project_id: testProjectId, drawing_no_raw: 'SIM-003', drawing_no_norm: 'SIM003' },
        { project_id: testProjectId, drawing_no_raw: 'SIM-004', drawing_no_norm: 'SIM004' },
      ]);

      const { data, error } = await supabase.rpc('detect_similar_drawings' as any, {
        p_project_id: testProjectId,
        p_drawing_no_norm: 'SIM001',
        p_threshold: 0.85
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeLessThanOrEqual(3);

      // Verify descending order
      for (let i = 1; i < data.length; i++) {
        expect(data[i-1].similarity_score).toBeGreaterThanOrEqual(data[i].similarity_score);
      }
    });
  });

  describe('validate_component_identity_key', () => {
    it('should accept valid spool identity_key', async () => {
      const { data, error } = await supabase.rpc('validate_component_identity_key' as any, {
        p_component_type: 'spool',
        p_identity_key: { spool_id: 'SP-001' }
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should reject spool with mismatched field_weld identity_key', async () => {
      const { data, error } = await supabase.rpc('validate_component_identity_key' as any, {
        p_component_type: 'spool',
        p_identity_key: { weld_number: 'W-001' } // Wrong key for spool
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should accept valid support identity_key with all required fields', async () => {
      const { data, error } = await supabase.rpc('validate_component_identity_key' as any, {
        p_component_type: 'support',
        p_identity_key: {
          drawing_norm: 'P-001',
          commodity_code: 'CS-2',
          size: '2IN',
          seq: 1
        }
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should reject support identity_key missing required fields', async () => {
      const { data, error } = await supabase.rpc('validate_component_identity_key' as any, {
        p_component_type: 'support',
        p_identity_key: {
          drawing_norm: 'P-001',
          // Missing commodity_code, size, seq
        }
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('validate_milestone_weights', () => {
    it('should return true for weights totaling 100%', async () => {
      const milestonesConfig = [
        { name: 'Receive', weight: 5, order: 1 },
        { name: 'Erect', weight: 40, order: 2 },
        { name: 'Connect', weight: 40, order: 3 },
        { name: 'Punch', weight: 5, order: 4 },
        { name: 'Test', weight: 5, order: 5 },
        { name: 'Restore', weight: 5, order: 6 }
      ];

      const { data, error } = await supabase.rpc('validate_milestone_weights' as any, {
        p_milestones_config: milestonesConfig
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for weights totaling 97% (invalid)', async () => {
      const milestonesConfig = [
        { name: 'Receive', weight: 5 },
        { name: 'Erect', weight: 40 },
        { name: 'Connect', weight: 40 },
        { name: 'Punch', weight: 5 },
        { name: 'Test', weight: 5 },
        { name: 'Restore', weight: 2 } // Wrong: should be 5
      ];

      const { data, error } = await supabase.rpc('validate_milestone_weights' as any, {
        p_milestones_config: milestonesConfig
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('get_weld_repair_history', () => {
    it('should return only original weld when no repairs exist', async () => {
      // Create original weld
      const { data: originalWeld } = await supabase
        .from('field_weld_inspections' as any)
        .insert({
          project_id: testProjectId,
          component_id: testComponentId,
          weld_id_number: 99.0,
          parent_weld_id: null,
          repair_sequence: 0,
          welder_stencil: 'TEST'
        })
        .select()
        .single();

      const { data, error } = await supabase.rpc('get_weld_repair_history' as any, {
        p_parent_weld_id: originalWeld.id
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].weld_id_number).toBe(99.0);
      expect(data[0].repair_sequence).toBe(0);
    });

    it('should return original weld + repairs in correct order (42.0, 42.1, 42.2)', async () => {
      // Create original weld
      const { data: originalWeld } = await supabase
        .from('field_weld_inspections' as any)
        .insert({
          project_id: testProjectId,
          component_id: testComponentId,
          weld_id_number: 42.0,
          parent_weld_id: null,
          repair_sequence: 0,
          welder_stencil: 'JD42',
          date_welded: '2025-01-01'
        })
        .select()
        .single();

      // Create repairs
      await supabase.from('field_weld_inspections' as any).insert([
        {
          project_id: testProjectId,
          component_id: testComponentId,
          weld_id_number: 42.1,
          parent_weld_id: originalWeld.id,
          repair_sequence: 1,
          welder_stencil: 'AB99',
          date_welded: '2025-01-05'
        },
        {
          project_id: testProjectId,
          component_id: testComponentId,
          weld_id_number: 42.2,
          parent_weld_id: originalWeld.id,
          repair_sequence: 2,
          welder_stencil: 'CD77',
          date_welded: '2025-01-10'
        }
      ]);

      const { data, error } = await supabase.rpc('get_weld_repair_history' as any, {
        p_parent_weld_id: originalWeld.id
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      expect(data[0].weld_id_number).toBe(42.0);
      expect(data[0].welder_stencil).toBe('JD42');
      expect(data[1].weld_id_number).toBe(42.1);
      expect(data[1].welder_stencil).toBe('AB99');
      expect(data[2].weld_id_number).toBe(42.2);
      expect(data[2].welder_stencil).toBe('CD77');
    });

    it('should work when called with repair ID (traverses to root)', async () => {
      // Get the repair weld created in previous test
      const { data: repair } = await supabase
        .from('field_weld_inspections' as any)
        .select('id')
        .eq('weld_id_number', 42.1)
        .single();

      // Call with repair ID, should return full chain including root
      const { data, error } = await supabase.rpc('get_weld_repair_history' as any, {
        p_parent_weld_id: repair.id
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(3); // Should include 42.0, 42.1, 42.2
      expect(data[0].weld_id_number).toBe(42.0); // Root weld
    });
  });
});
