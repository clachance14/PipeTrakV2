/**
 * Integration tests for calculate_earned_milestone_value() database function
 * Feature: Weekly Progress Reports (019)
 * Phase: 2 (Foundational) - Task T009
 *
 * Tests the database function that maps component-specific milestones
 * to standardized milestone percentages (Received, Installed, Punch, Tested, Restored)
 *
 * Note: These tests call the database function directly using RPC
 * and do not require authentication or test data creation.
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

describe('calculate_earned_milestone_value() database function', () => {

  describe('RECEIVED milestone mapping', () => {
    it('should return 5% for spool with Receive milestone complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { Receive: true },
        p_standard_milestone: 'received'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 5/5 * 100 = 100%
    });

    it('should return 0% for spool with Receive milestone incomplete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { Receive: false },
        p_standard_milestone: 'received'
      });

      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    it('should return 10% for valve with Receive milestone complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'valve',
        p_milestones: { Receive: true },
        p_standard_milestone: 'received'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });

    it('should return 10% for field_weld with Fit-Up milestone complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'field_weld',
        p_milestones: { 'Fit-Up': true },
        p_standard_milestone: 'received'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });
  });

  describe('INSTALLED milestone mapping', () => {
    it('should return 50% for spool with only Erect complete (40/80)', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { Erect: true, Connect: false },
        p_standard_milestone: 'installed'
      });

      expect(error).toBeNull();
      expect(data).toBe(50); // 40/80 * 100 = 50%
    });

    it('should return 100% for spool with both Erect and Connect complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { Erect: true, Connect: true },
        p_standard_milestone: 'installed'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 80/80 * 100 = 100%
    });

    it('should return 100% for field_weld with Weld Made complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'field_weld',
        p_milestones: { 'Weld Made': true },
        p_standard_milestone: 'installed'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 60/60 * 100 = 100%
    });

    it('should return 100% for valve with Install complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'valve',
        p_milestones: { Install: true },
        p_standard_milestone: 'installed'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 60/60 * 100 = 100%
    });

    it('should handle partial milestones for threaded_pipe (50% progress on Fabricate)', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'threaded_pipe',
        p_milestones: { Fabricate: 50, Install: 0, Erect: 0, Connect: 0, Support: 0 },
        p_standard_milestone: 'installed'
      });

      expect(error).toBeNull();
      expect(data).toBe(10); // (50 * 0.16) / 80 * 100 = 10%
    });

    it('should calculate weighted average for threaded_pipe with multiple partial milestones', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'threaded_pipe',
        p_milestones: { Fabricate: 100, Install: 100, Erect: 50, Connect: 0, Support: 0 },
        p_standard_milestone: 'installed'
      });

      expect(error).toBeNull();
      // (100*0.16 + 100*0.16 + 50*0.16) / 80 * 100 = 40/80 * 100 = 50%
      expect(data).toBe(50);
    });
  });

  describe('PUNCH milestone mapping', () => {
    it('should return 100% for spool with Punch Complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { 'Punch Complete': true },
        p_standard_milestone: 'punch'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 5/5 * 100 = 100%
    });

    it('should return 100% for field_weld with Repair Complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'field_weld',
        p_milestones: { 'Repair Complete': true },
        p_standard_milestone: 'punch'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });

    it('should return 100% for instrument with Punch Complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'instrument',
        p_milestones: { 'Punch Complete': true },
        p_standard_milestone: 'punch'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });

    it('should return 100% for valve with Test Complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'valve',
        p_milestones: { 'Test Complete': true },
        p_standard_milestone: 'punch'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });
  });

  describe('TESTED milestone mapping', () => {
    it('should return 100% for spool with Hydrotest complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { Hydrotest: true },
        p_standard_milestone: 'tested'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 5/5 * 100 = 100%
    });

    it('should return 100% for field_weld with NDE Final complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'field_weld',
        p_milestones: { 'NDE Final': true },
        p_standard_milestone: 'tested'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });

    it('should return 100% for valve with Test complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'valve',
        p_milestones: { Test: true },
        p_standard_milestone: 'tested'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });

    it('should return 0% for support (no tested milestone)', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'support',
        p_milestones: { Install: true },
        p_standard_milestone: 'tested'
      });

      expect(error).toBeNull();
      expect(data).toBe(0); // Support has no tested milestone
    });
  });

  describe('RESTORED milestone mapping', () => {
    it('should return 100% for spool with Restore complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { Restore: true },
        p_standard_milestone: 'restored'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 5/5 * 100 = 100%
    });

    it('should return 100% for field_weld with Paint complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'field_weld',
        p_milestones: { Paint: true },
        p_standard_milestone: 'restored'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });

    it('should return 100% for support with Insulate complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'support',
        p_milestones: { Insulate: true },
        p_standard_milestone: 'restored'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });

    it('should return 100% for valve with Restore complete', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'valve',
        p_milestones: { Restore: true },
        p_standard_milestone: 'restored'
      });

      expect(error).toBeNull();
      expect(data).toBe(100); // 10/10 * 100 = 100%
    });
  });

  describe('Edge cases', () => {
    it('should return 0% for NULL milestones', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: null,
        p_standard_milestone: 'received'
      });

      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    it('should return 0% for empty milestones object', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: {},
        p_standard_milestone: 'received'
      });

      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    it('should return 0% for unknown standard milestone', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { Receive: true },
        p_standard_milestone: 'unknown_milestone'
      });

      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    it('should handle missing milestone keys gracefully (return 0)', async () => {
      const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: 'spool',
        p_milestones: { SomeOtherKey: true },
        p_standard_milestone: 'received'
      });

      expect(error).toBeNull();
      expect(data).toBe(0);
    });
  });
});
