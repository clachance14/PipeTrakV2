/**
 * Integration tests for progress report views
 * Feature: Weekly Progress Reports (019)
 * Phase: 2 (Foundational) - Tasks T011, T012, T013
 *
 * Tests the database views that aggregate component progress:
 * - vw_progress_by_area
 * - vw_progress_by_system
 * - vw_progress_by_test_package
 *
 * Note: These tests verify the views exist and can be queried.
 * Detailed aggregation logic is tested in hook unit tests.
 */

import { describe, it, expect, vi } from 'vitest';

// Unmock supabase for integration tests
vi.unmock('@/lib/supabase');

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create real Supabase client for integration tests
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-expect-error - import.meta.env is available in Vite/Vitest
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('Progress report views', () => {

  describe('vw_progress_by_area', () => {
    it('should exist and be queryable', async () => {
      const { data, error } = await supabase
        .from('vw_progress_by_area')
        .select('area_id, area_name, project_id, budget, pct_received, pct_installed, pct_punch, pct_tested, pct_restored, pct_total')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // Data may be empty array if no components exist, which is fine
    });

    it('should have correct column structure', async () => {
      const { data, error } = await supabase
        .from('vw_progress_by_area')
        .select('*')
        .limit(1)
        .maybeSingle();

      expect(error).toBeNull();

      if (data) {
        // Verify all expected columns exist
        expect(data).toHaveProperty('area_id');
        expect(data).toHaveProperty('area_name');
        expect(data).toHaveProperty('project_id');
        expect(data).toHaveProperty('budget');
        expect(data).toHaveProperty('pct_received');
        expect(data).toHaveProperty('pct_installed');
        expect(data).toHaveProperty('pct_punch');
        expect(data).toHaveProperty('pct_tested');
        expect(data).toHaveProperty('pct_restored');
        expect(data).toHaveProperty('pct_total');
      }
    });
  });

  describe('vw_progress_by_system', () => {
    it('should exist and be queryable', async () => {
      const { data, error } = await supabase
        .from('vw_progress_by_system')
        .select('system_id, system_name, project_id, budget, pct_received, pct_installed, pct_punch, pct_tested, pct_restored, pct_total')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have correct column structure', async () => {
      const { data, error } = await supabase
        .from('vw_progress_by_system')
        .select('*')
        .limit(1)
        .maybeSingle();

      expect(error).toBeNull();

      if (data) {
        expect(data).toHaveProperty('system_id');
        expect(data).toHaveProperty('system_name');
        expect(data).toHaveProperty('project_id');
        expect(data).toHaveProperty('budget');
        expect(data).toHaveProperty('pct_received');
        expect(data).toHaveProperty('pct_installed');
        expect(data).toHaveProperty('pct_punch');
        expect(data).toHaveProperty('pct_tested');
        expect(data).toHaveProperty('pct_restored');
        expect(data).toHaveProperty('pct_total');
      }
    });
  });

  describe('vw_progress_by_test_package', () => {
    it('should exist and be queryable', async () => {
      const { data, error } = await supabase
        .from('vw_progress_by_test_package')
        .select('test_package_id, test_package_name, project_id, budget, pct_received, pct_installed, pct_punch, pct_tested, pct_restored, pct_total')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have correct column structure', async () => {
      const { data, error } = await supabase
        .from('vw_progress_by_test_package')
        .select('*')
        .limit(1)
        .maybeSingle();

      expect(error).toBeNull();

      if (data) {
        expect(data).toHaveProperty('test_package_id');
        expect(data).toHaveProperty('test_package_name');
        expect(data).toHaveProperty('project_id');
        expect(data).toHaveProperty('budget');
        expect(data).toHaveProperty('pct_received');
        expect(data).toHaveProperty('pct_installed');
        expect(data).toHaveProperty('pct_punch');
        expect(data).toHaveProperty('pct_tested');
        expect(data).toHaveProperty('pct_restored');
        expect(data).toHaveProperty('pct_total');
      }
    });
  });
});
