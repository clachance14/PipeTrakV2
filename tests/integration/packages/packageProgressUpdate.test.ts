/**
 * Integration Tests: Package Progress Update
 * Feature 030 - Test Package Lifecycle Workflow - Bug Fix
 *
 * Tests that package completion percentage updates immediately when:
 * - Component milestones are updated
 * - Component metadata is changed
 * - Components are assigned/unassigned from packages
 *
 * Bug: Package % complete was cached and not invalidated on component updates
 * Fix: Add query invalidation to mutation hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { usePackageReadiness } from '@/hooks/usePackages';
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone';
import { useUpdateComponent } from '@/hooks/useUpdateComponent';
import type { Component } from '@/types/database.types';

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-uuid',
      email: 'test@example.com',
    },
  }),
}));

describe('Package Progress Update', () => {
  let queryClient: QueryClient;
  const testProjectId = 'test-project-uuid';
  const testPackageId = 'test-package-uuid';
  const testComponentId = 'test-component-uuid';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 }, // No cache for tests
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('Scenario 1: Updating component milestone updates package %', () => {
    it('should refetch package stats immediately after milestone update', async () => {
      // Initial package data with one component at 0% complete
      const mockPackage = {
        id: testPackageId,
        name: 'TP-001',
        project_id: testProjectId,
        test_type: 'Hydrostatic' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockComponentBefore: Partial<Component> = {
        id: testComponentId,
        project_id: testProjectId,
        test_package_id: testPackageId,
        percent_complete: 0,
        current_milestones: { welding: false, fitup: false, nde: false },
        is_retired: false,
      };

      const mockComponentAfter: Partial<Component> = {
        ...mockComponentBefore,
        percent_complete: 33, // 1/3 milestones complete
        current_milestones: { welding: true, fitup: false, nde: false },
      };

      // Mock initial package query - 0% complete
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'test_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockPackage],
              error: null,
            }),
          } as any;
        }
        if (table === 'components') {
          let callCount = 0;
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn(() => {
              callCount++;
              // First call returns 0%, second call (after invalidation) returns 33%
              const component = callCount === 1 ? mockComponentBefore : mockComponentAfter;
              return Promise.resolve({
                data: [component],
                error: null,
              });
            }),
          } as any;
        }
        return {} as any;
      });

      // Mock milestone update mutation
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      } as any);

      // Render usePackageReadiness hook to get initial package stats
      const { result: packagesResult } = renderHook(() => usePackageReadiness(testProjectId), {
        wrapper,
      });

      // Wait for initial query to complete
      await waitFor(() => {
        expect(packagesResult.current.isLoading).toBe(false);
      });

      // Verify initial package is 0% complete
      const initialPackage = packagesResult.current.data?.find(p => p.package_id === testPackageId);
      expect(initialPackage).toBeDefined();
      expect(initialPackage?.avg_percent_complete).toBe(0);

      // Render useUpdateMilestone hook
      const { result: updateResult } = renderHook(() => useUpdateMilestone(), {
        wrapper,
      });

      // Update milestone
      updateResult.current.mutate({
        componentId: testComponentId,
        milestone: 'welding',
        value: true,
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      // Wait for package query to refetch (invalidation should trigger this)
      await waitFor(() => {
        const updatedPackage = packagesResult.current.data?.find(p => p.package_id === testPackageId);
        expect(updatedPackage?.avg_percent_complete).toBe(33);
      }, { timeout: 3000 });

      // Verify the package stats were refetched with updated data
      const finalPackage = packagesResult.current.data?.find(p => p.package_id === testPackageId);
      expect(finalPackage).toBeDefined();
      expect(finalPackage?.avg_percent_complete).toBe(33);
      expect(finalPackage?.total_components).toBe(1);
    });
  });

  describe('Scenario 2: Updating component metadata updates package %', () => {
    it('should refetch package stats immediately after component metadata update', async () => {
      // Similar setup to Scenario 1, but using useUpdateComponent instead
      const mockPackage = {
        id: testPackageId,
        name: 'TP-002',
        project_id: testProjectId,
        test_type: 'Pneumatic' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockComponentBefore: Partial<Component> = {
        id: testComponentId,
        project_id: testProjectId,
        test_package_id: testPackageId,
        percent_complete: 50,
        is_retired: false,
      };

      const mockComponentAfter: Partial<Component> = {
        ...mockComponentBefore,
        test_package_id: null, // Unassigned from package
      };

      // Mock queries
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'test_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockPackage],
              error: null,
            }),
          } as any;
        }
        if (table === 'components') {
          let callCount = 0;
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            order: vi.fn(() => {
              callCount++;
              // First call has component (50%), second call (after unassignment) has no components
              const components = callCount === 1 ? [mockComponentBefore] : [];
              return Promise.resolve({
                data: components,
                error: null,
              });
            }),
          } as any;
        }
        return {} as any;
      });

      // Mock component update mutation
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'components') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockComponentAfter,
              error: null,
            }),
          } as any;
        }
        return {} as any;
      });

      // Render usePackageReadiness hook
      const { result: packagesResult } = renderHook(() => usePackageReadiness(testProjectId), {
        wrapper,
      });

      // Wait for initial query
      await waitFor(() => {
        expect(packagesResult.current.isLoading).toBe(false);
      });

      // Verify initial package has 1 component at 50%
      const initialPackage = packagesResult.current.data?.find(p => p.package_id === testPackageId);
      expect(initialPackage?.avg_percent_complete).toBe(50);
      expect(initialPackage?.total_components).toBe(1);

      // Render useUpdateComponent hook
      const { result: updateResult } = renderHook(() => useUpdateComponent(testProjectId), {
        wrapper,
      });

      // Unassign component from package
      updateResult.current.mutate({
        componentId: testComponentId,
        version: 1,
        test_package_id: null,
      });

      // Wait for mutation
      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      // Wait for package stats to update (should show 0 components now)
      await waitFor(() => {
        const updatedPackage = packagesResult.current.data?.find(p => p.package_id === testPackageId);
        expect(updatedPackage?.total_components).toBe(0);
      }, { timeout: 3000 });

      // Verify final state
      const finalPackage = packagesResult.current.data?.find(p => p.package_id === testPackageId);
      expect(finalPackage?.avg_percent_complete).toBe(null); // No components
      expect(finalPackage?.total_components).toBe(0);
    });
  });
});
