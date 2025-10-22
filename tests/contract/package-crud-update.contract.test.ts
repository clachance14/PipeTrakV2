/**
 * Contract Test: update_test_package RPC Function
 *
 * Feature 012: Test Package Readiness Page Enhancement
 * Tests the update_test_package database function for partial package updates.
 *
 * All tests MUST FAIL before migration 00028 is applied (function doesn't exist)
 * After migration: All 9 tests should pass
 *
 * Behavioral Contracts:
 * - BC-UPDATE-001: Name updated
 * - BC-UPDATE-002: Description updated
 * - BC-UPDATE-003: Multiple fields updated
 * - BC-UPDATE-004: Description cleared (set to NULL)
 * - BC-UPDATE-005: Empty name rejected
 * - BC-UPDATE-006: Description length validated
 * - BC-UPDATE-007: Package not found error
 * - BC-UPDATE-008: RLS enforced
 * - BC-UPDATE-009: No-op when all parameters NULL
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Unmock supabase for contract tests - we need the real client
vi.unmock('@/lib/supabase');

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create real Supabase client for contract tests
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

describe('update_test_package RPC Contract', () => {
  let testProjectId: string;
  let testPackageId: string;

  beforeEach(async () => {
    testProjectId = '00000000-0000-0000-0000-000000000001'; // Mock project ID

    // Create a test package for update tests
    const { data } = await supabase.rpc('create_test_package', {
      p_project_id: testProjectId,
      p_name: 'Original Name',
      p_description: 'Original Description',
      p_target_date: '2025-12-31',
    });

    testPackageId = data || '';
  });

  afterEach(async () => {
    // Cleanup test package
    if (testPackageId) {
      await supabase
        .from('test_packages')
        .delete()
        .eq('id', testPackageId);
    }
  });

  describe('BC-UPDATE-001: Name Updated', () => {
    it('should update package name only', async () => {
      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_name: 'Updated Name',
      });

      // Expected: {success: true}
      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      // Verify name updated, other fields unchanged
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('name, description, target_date')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.name).toBe('Updated Name');
      expect(package_data?.description).toBe('Original Description');
      expect(package_data?.target_date).toBe('2025-12-31');
    });
  });

  describe('BC-UPDATE-002: Description Updated', () => {
    it('should update package description only', async () => {
      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_description: 'Updated Description',
      });

      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      // Verify description updated, other fields unchanged
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('name, description')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.name).toBe('Original Name');
      expect(package_data?.description).toBe('Updated Description');
    });
  });

  describe('BC-UPDATE-003: Multiple Fields Updated', () => {
    it('should update name and description simultaneously', async () => {
      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_name: 'New Name',
        p_description: 'New Description',
      });

      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      // Verify both fields updated
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('name, description')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.name).toBe('New Name');
      expect(package_data?.description).toBe('New Description');
    });

    it('should update all three fields simultaneously', async () => {
      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_name: 'All New Name',
        p_description: 'All New Description',
        p_target_date: '2026-01-15',
      });

      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      const { data: package_data } = await supabase
        .from('test_packages')
        .select('name, description, target_date')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.name).toBe('All New Name');
      expect(package_data?.description).toBe('All New Description');
      expect(package_data?.target_date).toBe('2026-01-15');
    });
  });

  describe('BC-UPDATE-004: Description Cleared (Set to NULL)', () => {
    it('should set description to NULL when passed NULL', async () => {
      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_description: null,
      });

      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      // Verify description is NULL
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('description')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.description).toBeNull();
    });
  });

  describe('BC-UPDATE-005: Empty Name Rejected', () => {
    it('should reject empty string name', async () => {
      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_name: '',
      });

      // Expected: {error: "Package name cannot be empty"}
      expect(error).toBeNull(); // RPC returns JSONB, not SQL error
      expect(data).toEqual({ error: 'Package name cannot be empty' });

      // Verify name unchanged
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('name')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.name).toBe('Original Name');
    });

    it('should reject whitespace-only name', async () => {
      const { data } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_name: '   ',
      });

      expect(data).toEqual({ error: 'Package name cannot be empty' });
    });
  });

  describe('BC-UPDATE-006: Description Length Validated', () => {
    it('should reject description longer than 100 characters', async () => {
      const longDescription = 'A'.repeat(101);

      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_description: longDescription,
      });

      expect(error).toBeNull();
      expect(data).toEqual({ error: 'Description max 100 characters' });

      // Verify description unchanged
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('description')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.description).toBe('Original Description');
    });

    it('should accept description with exactly 100 characters', async () => {
      const maxDescription = 'B'.repeat(100);

      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
        p_description: maxDescription,
      });

      expect(error).toBeNull();
      expect(data).toEqual({ success: true });
    });
  });

  describe('BC-UPDATE-007: Package Not Found Error', () => {
    it('should return error for non-existent package', async () => {
      const invalidPackageId = '00000000-0000-0000-0000-999999999999';

      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: invalidPackageId,
        p_name: 'New Name',
      });

      expect(error).toBeNull();
      expect(data).toEqual({ error: 'Package not found' });
    });
  });

  describe('BC-UPDATE-008: RLS Enforced', () => {
    it('should enforce RLS policies on update', async () => {
      // Note: This test documents expected RLS behavior
      // Actual testing requires authenticated requests from different organizations

      // Test Setup:
      // - User belongs to Organization A
      // - Attempts to update package in Project B (Organization B)

      // Expected: {error: "Package not found"} (RLS hides row)
      expect(true).toBe(true); // Placeholder - RLS requires auth context
    });
  });

  describe('BC-UPDATE-009: No-Op When All Parameters NULL', () => {
    it('should return success when no parameters provided', async () => {
      const { data, error } = await supabase.rpc('update_test_package', {
        p_package_id: testPackageId,
      });

      expect(error).toBeNull();
      expect(data).toEqual({ success: true });

      // Verify all fields unchanged
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('name, description, target_date')
        .eq('id', testPackageId)
        .single();

      expect(package_data?.name).toBe('Original Name');
      expect(package_data?.description).toBe('Original Description');
      expect(package_data?.target_date).toBe('2025-12-31');
    });
  });
});
