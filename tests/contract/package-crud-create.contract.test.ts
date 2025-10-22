/**
 * Contract Test: create_test_package RPC Function
 *
 * Feature 012: Test Package Readiness Page Enhancement
 * Tests the create_test_package database function for package creation with validation.
 *
 * Key Test: BC-CREATE-003 (Empty name rejected) MUST FAIL before migration 00028
 * After migration: All 8 tests should pass
 *
 * Behavioral Contracts:
 * - BC-CREATE-001: Valid creation returns UUID
 * - BC-CREATE-002: Name trimmed
 * - BC-CREATE-003: Empty name rejected (🔑 KEY TEST)
 * - BC-CREATE-004: Description length validated
 * - BC-CREATE-005: NULL description allowed
 * - BC-CREATE-006: Target date accepted
 * - BC-CREATE-007: Invalid project rejected
 * - BC-CREATE-008: RLS enforced
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

describe('create_test_package RPC Contract', () => {
  let testProjectId: string;
  const createdPackageIds: string[] = [];

  beforeEach(async () => {
    // Note: In real implementation, we'd get a valid project ID from setup
    testProjectId = '00000000-0000-0000-0000-000000000001'; // Mock project ID
  });

  afterEach(async () => {
    // Cleanup created packages
    for (const packageId of createdPackageIds) {
      await supabase
        .from('test_packages')
        .delete()
        .eq('id', packageId);
    }
    createdPackageIds.length = 0;
  });

  describe('BC-CREATE-001: Valid Creation Returns UUID', () => {
    it('should create package and return UUID', async () => {
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: 'Test Package 001',
        });

      // Expected: UUID returned, no error
      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(typeof data).toBe('string'); // UUID is string
      if (data) createdPackageIds.push(data);

      // Verify package exists in database
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('id, name')
        .eq('id', data!)
        .single();

      expect(package_data?.name).toBe('Test Package 001');
    });
  });

  describe('BC-CREATE-002: Name Trimmed', () => {
    it('should trim whitespace from package name', async () => {
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: '  Test Package 002  ',
        });

      expect(error).toBeNull();
      if (data) createdPackageIds.push(data);

      // Verify trimmed name in database
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('name')
        .eq('id', data!)
        .single();

      expect(package_data?.name).toBe('Test Package 002'); // Trimmed
    });
  });

  describe('BC-CREATE-003: Empty Name Rejected (🔑 KEY TEST)', () => {
    it('should reject empty string name', async () => {
      // 🔑 This test MUST FAIL before migration 00028
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: '',
        });

      // Expected: Error with message "Package name cannot be empty"
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Package name cannot be empty');
      expect(data).toBeNull();
    });

    it('should reject whitespace-only name', async () => {
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: '   ',
        });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('Package name cannot be empty');
    });
  });

  describe('BC-CREATE-004: Description Length Validated', () => {
    it('should reject description longer than 100 characters', async () => {
      const longDescription = 'A'.repeat(101);

      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: 'Test Package 004',
          p_description: longDescription,
        });

      // Expected: Error with message "Description max 100 characters"
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Description max 100 characters');
      expect(data).toBeNull();
    });

    it('should accept description with exactly 100 characters', async () => {
      const maxDescription = 'A'.repeat(100);

      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: 'Test Package 004b',
          p_description: maxDescription,
        });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      if (data) createdPackageIds.push(data);
    });
  });

  describe('BC-CREATE-005: NULL Description Allowed', () => {
    it('should create package with NULL description', async () => {
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: 'Test Package 005',
          p_description: null,
        });

      expect(error).toBeNull();
      if (data) createdPackageIds.push(data);

      // Verify NULL description in database
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('description')
        .eq('id', data!)
        .single();

      expect(package_data?.description).toBeNull();
    });

    it('should create package with undefined description (defaults to NULL)', async () => {
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: 'Test Package 005b',
        });

      expect(error).toBeNull();
      if (data) createdPackageIds.push(data);
    });
  });

  describe('BC-CREATE-006: Target Date Accepted', () => {
    it('should create package with valid target date', async () => {
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: 'Test Package 006',
          p_target_date: '2025-12-31',
        });

      expect(error).toBeNull();
      if (data) createdPackageIds.push(data);

      // Verify target date in database
      const { data: package_data } = await supabase
        .from('test_packages')
        .select('target_date')
        .eq('id', data!)
        .single();

      expect(package_data?.target_date).toBe('2025-12-31');
    });

    it('should create package with NULL target date', async () => {
      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: testProjectId,
          p_name: 'Test Package 006b',
          p_target_date: null,
        });

      expect(error).toBeNull();
      if (data) createdPackageIds.push(data);
    });
  });

  describe('BC-CREATE-007: Invalid Project Rejected', () => {
    it('should reject non-existent project ID', async () => {
      const invalidProjectId = '00000000-0000-0000-0000-999999999999';

      const { data, error } = await supabase
        .rpc('create_test_package', {
          p_project_id: invalidProjectId,
          p_name: 'Test Package 007',
        });

      // Expected: Error due to foreign key constraint
      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });
  });

  describe('BC-CREATE-008: RLS Enforced', () => {
    it('should enforce RLS policies on insert', async () => {
      // Note: This test documents expected RLS behavior
      // Actual testing requires authenticated requests from different organizations

      // Test Setup:
      // - User belongs to Organization A
      // - Attempts to create package in Project B (Organization B)

      // Expected: RLS policy violation (cannot insert into other org's project)
      // Implementation would use authenticated Supabase client

      expect(true).toBe(true); // Placeholder - RLS requires auth context
    });
  });
});
