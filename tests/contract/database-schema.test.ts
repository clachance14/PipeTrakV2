/**
 * Contract Tests: Database Schema (Sprint 1 Core Foundation)
 *
 * Tests for Feature 005-sprint-1-core database schema expansion.
 * These tests MUST FAIL before migration 00009_sprint1_core_tables.sql is applied (TDD).
 *
 * Validates:
 * - All 11 new tables exist (drawings, areas, systems, test_packages, progress_templates,
 *   components, milestone_events, welders, field_weld_inspections, needs_review, audit_log)
 * - Progress templates seeded with 11 component types
 *
 * Expected: ALL TESTS FAIL until migration 00009 is applied
 */

import { describe, it, expect, vi } from 'vitest';

// Unmock supabase for contract tests - we need the real client to validate schema
vi.unmock('@/lib/supabase');

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create real Supabase client for contract tests
// @ts-ignore - import.meta.env is available in Vite/Vitest
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('Database Schema - Sprint 1 Core Tables', () => {
  describe('New Tables Existence', () => {
    it('should have drawings table', async () => {
      const { data, error } = await supabase
        .from('drawings' as any)
        .select('id, project_id, drawing_no_raw, drawing_no_norm, is_retired')
        .limit(1);

      expect(error).toBeNull();
      // Table should exist (query succeeds)
    });

    it('should have areas table', async () => {
      const { data, error } = await supabase
        .from('areas' as any)
        .select('id, project_id, name')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have systems table', async () => {
      const { data, error } = await supabase
        .from('systems' as any)
        .select('id, project_id, name')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have test_packages table', async () => {
      const { data, error } = await supabase
        .from('test_packages' as any)
        .select('id, project_id, name, target_date')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have progress_templates table', async () => {
      const { data, error} = await supabase
        .from('progress_templates' as any)
        .select('id, component_type, version, workflow_type, milestones_config')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have components table', async () => {
      const { data, error } = await supabase
        .from('components' as any)
        .select('id, project_id, component_type, identity_key, current_milestones, percent_complete')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have milestone_events table', async () => {
      const { data, error } = await supabase
        .from('milestone_events' as any)
        .select('id, component_id, milestone_name, action, user_id')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have welders table', async () => {
      const { data, error } = await supabase
        .from('welders' as any)
        .select('id, project_id, name, stencil, stencil_norm, status')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have field_weld_inspections table', async () => {
      const { data, error } = await supabase
        .from('field_weld_inspections' as any)
        .select('id, component_id, weld_id_number, parent_weld_id, repair_sequence, hydro_complete, flagged_for_xray, turned_over_to_client')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have needs_review table', async () => {
      const { data, error } = await supabase
        .from('needs_review' as any)
        .select('id, project_id, component_id, type, status, payload')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have audit_log table', async () => {
      const { data, error } = await supabase
        .from('audit_log' as any)
        .select('id, project_id, user_id, action_type, entity_type, entity_id')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Progress Templates Seed Data', () => {
    it('should have 11 progress templates seeded (one per component type)', async () => {
      const { data: templates, error } = await supabase
        .from('progress_templates' as any)
        .select('component_type, version')
        .eq('version', 1);

      expect(error).toBeNull();
      expect(templates).toHaveLength(11);

      const componentTypes = templates?.map((t: any) => t.component_type) || [];
      expect(componentTypes).toContain('spool');
      expect(componentTypes).toContain('field_weld');
      expect(componentTypes).toContain('support');
      expect(componentTypes).toContain('valve');
      expect(componentTypes).toContain('fitting');
      expect(componentTypes).toContain('flange');
      expect(componentTypes).toContain('instrument');
      expect(componentTypes).toContain('tubing');
      expect(componentTypes).toContain('hose');
      expect(componentTypes).toContain('misc_component');
      expect(componentTypes).toContain('threaded_pipe');
    });

    it('should have all progress template milestone weights totaling exactly 100%', async () => {
      const { data: templates, error } = await supabase
        .from('progress_templates' as any)
        .select('component_type, milestones_config')
        .eq('version', 1);

      expect(error).toBeNull();
      expect(templates).toBeDefined();

      templates?.forEach((template: any) => {
        const milestones = template.milestones_config;
        const totalWeight = milestones.reduce((sum: number, m: any) => sum + m.weight, 0);
        expect(totalWeight).toBe(100);
      });
    });
  });

  describe('Materialized Views', () => {
    it('should have mv_package_readiness materialized view', async () => {
      const { data, error } = await supabase
        .from('mv_package_readiness' as any)
        .select('package_id, total_components, avg_percent_complete')
        .limit(1);

      expect(error).toBeNull();
      // View should exist (query succeeds)
    });

    it('should have mv_drawing_progress materialized view', async () => {
      const { data, error } = await supabase
        .from('mv_drawing_progress' as any)
        .select('drawing_id, total_components, avg_percent_complete')
        .limit(1);

      expect(error).toBeNull();
    });
  });
});
