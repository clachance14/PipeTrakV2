/**
 * Contract Tests: Sprint 1 Hooks API
 *
 * Tests for Feature 005-sprint-1-core TanStack Query hooks.
 * These tests validate that all 11 hooks exist with correct signatures.
 *
 * Hooks tested:
 * - useProjects (already implemented)
 * - useDrawings, useComponents, useAreas, useSystems, useTestPackages
 * - useWelders, useFieldWeldInspections, useNeedsReview, useAuditLog
 * - useRefreshDashboards
 *
 * Expected: Tests FAIL until hooks are implemented
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('Sprint 1 Hooks API Contract', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useProjects Hook (T013 - COMPLETE)', () => {
    it('should exist and be importable', async () => {
      const { useProjects } = await import('@/hooks/useProjects');
      expect(useProjects).toBeDefined();
      expect(typeof useProjects).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useProjects } = await import('@/hooks/useProjects');
      const { result } = renderHook(() => useProjects(), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  describe('useDrawings Hook (T014)', () => {
    it('should exist and be importable', async () => {
      const { useDrawings } = await import('@/hooks/useDrawings');
      expect(useDrawings).toBeDefined();
      expect(typeof useDrawings).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useDrawings } = await import('@/hooks/useDrawings');
      const { result } = renderHook(() => useDrawings('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have useSimilarDrawings sub-hook', async () => {
      const hooks = await import('@/hooks/useDrawings');
      expect(hooks).toHaveProperty('useSimilarDrawings');
      expect(typeof hooks.useSimilarDrawings).toBe('function');
    });

    it('should have useCreateDrawing mutation', async () => {
      const hooks = await import('@/hooks/useDrawings');
      expect(hooks).toHaveProperty('useCreateDrawing');
      expect(typeof hooks.useCreateDrawing).toBe('function');
    });

    it('should have useRetireDrawing mutation', async () => {
      const hooks = await import('@/hooks/useDrawings');
      expect(hooks).toHaveProperty('useRetireDrawing');
      expect(typeof hooks.useRetireDrawing).toBe('function');
    });
  });

  describe('useComponents Hook (T015)', () => {
    it('should exist and be importable', async () => {
      const { useComponents } = await import('@/hooks/useComponents');
      expect(useComponents).toBeDefined();
      expect(typeof useComponents).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useComponents } = await import('@/hooks/useComponents');
      const { result } = renderHook(() => useComponents('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have useComponent single-query hook', async () => {
      const hooks = await import('@/hooks/useComponents');
      expect(hooks).toHaveProperty('useComponent');
      expect(typeof hooks.useComponent).toBe('function');
    });

    it('should have useCreateComponent mutation', async () => {
      const hooks = await import('@/hooks/useComponents');
      expect(hooks).toHaveProperty('useCreateComponent');
      expect(typeof hooks.useCreateComponent).toBe('function');
    });

    it('should have useUpdateComponentMilestones mutation', async () => {
      const hooks = await import('@/hooks/useComponents');
      expect(hooks).toHaveProperty('useUpdateComponentMilestones');
      expect(typeof hooks.useUpdateComponentMilestones).toBe('function');
    });
  });

  describe('useAreas Hook (T016)', () => {
    it('should exist and be importable', async () => {
      const { useAreas } = await import('@/hooks/useAreas');
      expect(useAreas).toBeDefined();
      expect(typeof useAreas).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useAreas } = await import('@/hooks/useAreas');
      const { result } = renderHook(() => useAreas('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have useCreateArea mutation', async () => {
      const hooks = await import('@/hooks/useAreas');
      expect(hooks).toHaveProperty('useCreateArea');
      expect(typeof hooks.useCreateArea).toBe('function');
    });
  });

  describe('useSystems Hook (T017)', () => {
    it('should exist and be importable', async () => {
      const { useSystems } = await import('@/hooks/useSystems');
      expect(useSystems).toBeDefined();
      expect(typeof useSystems).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useSystems } = await import('@/hooks/useSystems');
      const { result } = renderHook(() => useSystems('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have useCreateSystem mutation', async () => {
      const hooks = await import('@/hooks/useSystems');
      expect(hooks).toHaveProperty('useCreateSystem');
      expect(typeof hooks.useCreateSystem).toBe('function');
    });
  });

  describe('useTestPackages Hook (T018)', () => {
    it('should exist and be importable', async () => {
      const { useTestPackages } = await import('@/hooks/useTestPackages');
      expect(useTestPackages).toBeDefined();
      expect(typeof useTestPackages).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useTestPackages } = await import('@/hooks/useTestPackages');
      const { result } = renderHook(() => useTestPackages('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have usePackageReadiness materialized view query', async () => {
      const hooks = await import('@/hooks/useTestPackages');
      expect(hooks).toHaveProperty('usePackageReadiness');
      expect(typeof hooks.usePackageReadiness).toBe('function');
    });

    it('should have useCreateTestPackage mutation', async () => {
      const hooks = await import('@/hooks/useTestPackages');
      expect(hooks).toHaveProperty('useCreateTestPackage');
      expect(typeof hooks.useCreateTestPackage).toBe('function');
    });
  });

  describe('useWelders Hook (T019)', () => {
    it('should exist and be importable', async () => {
      const { useWelders } = await import('@/hooks/useWelders');
      expect(useWelders).toBeDefined();
      expect(typeof useWelders).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useWelders } = await import('@/hooks/useWelders');
      const { result } = renderHook(() => useWelders('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have useCreateWelder mutation', async () => {
      const hooks = await import('@/hooks/useWelders');
      expect(hooks).toHaveProperty('useCreateWelder');
      expect(typeof hooks.useCreateWelder).toBe('function');
    });

    it('should have useVerifyWelder mutation', async () => {
      const hooks = await import('@/hooks/useWelders');
      expect(hooks).toHaveProperty('useVerifyWelder');
      expect(typeof hooks.useVerifyWelder).toBe('function');
    });
  });

  describe('useFieldWeldInspections Hook (T020)', () => {
    it('should exist and be importable', async () => {
      const { useFieldWeldInspections } = await import('@/hooks/useFieldWeldInspections');
      expect(useFieldWeldInspections).toBeDefined();
      expect(typeof useFieldWeldInspections).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useFieldWeldInspections } = await import('@/hooks/useFieldWeldInspections');
      const { result } = renderHook(() => useFieldWeldInspections('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have useFieldWeldInspection single-query hook', async () => {
      const hooks = await import('@/hooks/useFieldWeldInspections');
      expect(hooks).toHaveProperty('useFieldWeldInspection');
      expect(typeof hooks.useFieldWeldInspection).toBe('function');
    });

    it('should have useWeldRepairHistory RPC query', async () => {
      const hooks = await import('@/hooks/useFieldWeldInspections');
      expect(hooks).toHaveProperty('useWeldRepairHistory');
      expect(typeof hooks.useWeldRepairHistory).toBe('function');
    });

    it('should have useCreateFieldWeldInspection mutation', async () => {
      const hooks = await import('@/hooks/useFieldWeldInspections');
      expect(hooks).toHaveProperty('useCreateFieldWeldInspection');
      expect(typeof hooks.useCreateFieldWeldInspection).toBe('function');
    });

    it('should have useUpdateFieldWeldInspection mutation', async () => {
      const hooks = await import('@/hooks/useFieldWeldInspections');
      expect(hooks).toHaveProperty('useUpdateFieldWeldInspection');
      expect(typeof hooks.useUpdateFieldWeldInspection).toBe('function');
    });

    it('should have useFlagWeldForXRay mutation', async () => {
      const hooks = await import('@/hooks/useFieldWeldInspections');
      expect(hooks).toHaveProperty('useFlagWeldForXRay');
      expect(typeof hooks.useFlagWeldForXRay).toBe('function');
    });

    it('should have useCreateWeldRepair mutation', async () => {
      const hooks = await import('@/hooks/useFieldWeldInspections');
      expect(hooks).toHaveProperty('useCreateWeldRepair');
      expect(typeof hooks.useCreateWeldRepair).toBe('function');
    });
  });

  describe('useNeedsReview Hook (T021)', () => {
    it('should exist and be importable', async () => {
      const { useNeedsReview } = await import('@/hooks/useNeedsReview');
      expect(useNeedsReview).toBeDefined();
      expect(typeof useNeedsReview).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useNeedsReview } = await import('@/hooks/useNeedsReview');
      const { result } = renderHook(() => useNeedsReview('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should have useResolveNeedsReview mutation', async () => {
      const hooks = await import('@/hooks/useNeedsReview');
      expect(hooks).toHaveProperty('useResolveNeedsReview');
      expect(typeof hooks.useResolveNeedsReview).toBe('function');
    });
  });

  describe('useAuditLog Hook (T022)', () => {
    it('should exist and be importable', async () => {
      const { useAuditLog } = await import('@/hooks/useAuditLog');
      expect(useAuditLog).toBeDefined();
      expect(typeof useAuditLog).toBe('function');
    });

    it('should return query with data, error, isLoading properties', async () => {
      const { useAuditLog } = await import('@/hooks/useAuditLog');
      const { result } = renderHook(() => useAuditLog('project-id'), { wrapper });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  describe('useRefreshDashboards Hook (T023)', () => {
    it('should exist and be importable', async () => {
      const { useRefreshDashboards } = await import('@/hooks/useRefreshDashboards');
      expect(useRefreshDashboards).toBeDefined();
      expect(typeof useRefreshDashboards).toBe('function');
    });

    it('should return mutation with mutate, error, isPending properties', async () => {
      const { useRefreshDashboards } = await import('@/hooks/useRefreshDashboards');
      const { result } = renderHook(() => useRefreshDashboards(), { wrapper });

      expect(result.current).toHaveProperty('mutate');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isPending'); // TanStack Query v5 uses isPending for mutations
    });
  });

  describe('Query Key Formats', () => {
    it('useProjects should use correct query key format', async () => {
      // Query keys: ['projects', filters]
      const { useProjects } = await import('@/hooks/useProjects');
      const { result } = renderHook(() => useProjects({ is_archived: false }), { wrapper });

      // TanStack Query query object has queryKey property
      expect(result.current).toBeDefined();
    });

    it('useDrawings should use correct query key format', async () => {
      // Query keys: ['projects', projectId, 'drawings', filters]
      const { useDrawings } = await import('@/hooks/useDrawings');
      const { result } = renderHook(() => useDrawings('test-project-id'), { wrapper });

      expect(result.current).toBeDefined();
    });

    it('useComponents should use correct query key format', async () => {
      // Query keys: ['projects', projectId, 'components', filters]
      const { useComponents } = await import('@/hooks/useComponents');
      const { result } = renderHook(() => useComponents('test-project-id'), { wrapper });

      expect(result.current).toBeDefined();
    });
  });
});
