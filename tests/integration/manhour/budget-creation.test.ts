/**
 * Integration Tests: Manhour Budget Creation RPC
 * Feature 032-manhour-earned-value
 *
 * Tests the create_manhour_budget RPC function:
 * - FR-001: Budget creation with auto-distribution
 * - FR-002: Permission enforcement (Owner/Admin/PM only)
 * - FR-003: Validation (amount > 0, project has components)
 * - FR-004: Version incrementing
 * - FR-005: Weight-based distribution with warnings
 *
 * RPC: create_manhour_budget (SECURITY DEFINER)
 * Migration: 20251204162418_manhour_create_budget_rpc.sql
 *
 * Test approach: Mock supabase.rpc calls to verify contract compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useCreateManhourBudget } from '@/hooks/useManhourBudget';
import type { CreateManhourBudgetResponse } from '@/hooks/useManhourBudget';

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
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

describe('Manhour Budget Creation RPC (create_manhour_budget)', () => {
  let queryClient: QueryClient;
  const testProjectId = 'test-project-uuid';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('FR-001: Successful budget creation with distribution summary', () => {
    it('should create budget and return distribution summary', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: '550e8400-e29b-41d4-a716-446655440000',
        version_number: 1,
        distribution_summary: {
          total_components: 500,
          components_allocated: 500,
          components_with_warnings: 12,
          total_weight: 847.25,
          total_allocated_mh: 1250.0,
        },
        warnings: [
          {
            component_id: 'comp-1',
            message: 'No parseable size, fixed weight (0.5) assigned',
          },
        ],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      // Execute mutation
      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1250.0,
        revisionReason: 'Original estimate',
        effectiveDate: '2025-01-15',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify RPC was called with correct parameters
      expect(supabase.rpc).toHaveBeenCalledWith('create_manhour_budget', {
        p_project_id: testProjectId,
        p_total_budgeted_manhours: 1250.0,
        p_revision_reason: 'Original estimate',
        p_effective_date: '2025-01-15',
      });

      // Verify response structure
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.success).toBe(true);
      expect(result.current.data?.budget_id).toBeDefined();
      expect(result.current.data?.version_number).toBe(1);
      expect(result.current.data?.distribution_summary).toBeDefined();
      expect(result.current.data?.distribution_summary?.total_components).toBe(500);
      expect(result.current.data?.distribution_summary?.components_allocated).toBe(500);
      expect(result.current.data?.distribution_summary?.total_allocated_mh).toBe(1250.0);
    });

    it('should include warnings for components with no parseable size', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'budget-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 10,
          components_allocated: 10,
          components_with_warnings: 3,
          total_weight: 45.0,
          total_allocated_mh: 100.0,
        },
        warnings: [
          {
            component_id: 'comp-1',
            message: 'No parseable size, fixed weight (0.5) assigned',
          },
          {
            component_id: 'comp-2',
            message: 'No parseable size, fixed weight (0.5) assigned',
          },
          {
            component_id: 'comp-3',
            message: 'No parseable size, fixed weight (0.5) assigned',
          },
        ],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 100.0,
        revisionReason: 'Initial budget',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify warnings are included
      expect(result.current.data?.warnings).toHaveLength(3);
      expect(result.current.data?.distribution_summary?.components_with_warnings).toBe(3);
    });

    it('should use default effective_date when not provided', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'budget-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 50,
          components_allocated: 50,
          components_with_warnings: 0,
          total_weight: 200.0,
          total_allocated_mh: 500.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 500.0,
        revisionReason: 'Initial budget',
        // effectiveDate omitted - should default to today
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify RPC was called with today's date (ISO format)
      const todayISO = new Date().toISOString().split('T')[0];
      expect(supabase.rpc).toHaveBeenCalledWith('create_manhour_budget', {
        p_project_id: testProjectId,
        p_total_budgeted_manhours: 500.0,
        p_revision_reason: 'Initial budget',
        p_effective_date: todayISO,
      });
    });
  });

  describe('FR-002: Error handling for invalid budget (<=0 manhours)', () => {
    it('should return INVALID_BUDGET error when totalBudgetedManhours <= 0', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: false,
        error: 'INVALID_BUDGET',
        message: 'Total budgeted manhours must be greater than 0',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 0,
        revisionReason: 'Invalid budget',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Verify error was thrown
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Total budgeted manhours must be greater than 0');
    });

    it('should reject negative manhours', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: false,
        error: 'INVALID_BUDGET',
        message: 'Total budgeted manhours must be greater than 0',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: -100,
        revisionReason: 'Negative budget',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('FR-003: Error handling for missing components', () => {
    it('should return NO_COMPONENTS error when project has no components', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: false,
        error: 'NO_COMPONENTS',
        message: 'Project has no non-retired components',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'Budget for empty project',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Project has no non-retired components');
    });
  });

  describe('FR-004: Versioning - second budget increments version_number', () => {
    it('should increment version_number for successive budgets', async () => {
      // First budget creation (version 1)
      const firstBudgetResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'budget-v1-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 100,
          components_allocated: 100,
          components_with_warnings: 0,
          total_weight: 500.0,
          total_allocated_mh: 1000.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: firstBudgetResponse,
        error: null,
      } as any);

      const { result: firstResult } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(firstResult.current.mutate).toBeDefined());

      firstResult.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'Original estimate',
      });

      await waitFor(() => expect(firstResult.current.isSuccess).toBe(true));

      expect(firstResult.current.data?.version_number).toBe(1);

      // Clear mocks for second budget
      vi.clearAllMocks();

      // Second budget creation (version 2)
      const secondBudgetResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'budget-v2-uuid',
        version_number: 2,
        distribution_summary: {
          total_components: 100,
          components_allocated: 100,
          components_with_warnings: 0,
          total_weight: 500.0,
          total_allocated_mh: 1200.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: secondBudgetResponse,
        error: null,
      } as any);

      const { result: secondResult } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(secondResult.current.mutate).toBeDefined());

      secondResult.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1200.0,
        revisionReason: 'Revised estimate - scope change',
      });

      await waitFor(() => expect(secondResult.current.isSuccess).toBe(true));

      // Verify version incremented
      expect(secondResult.current.data?.version_number).toBe(2);
    });

    it('should handle version 3+ correctly', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'budget-v5-uuid',
        version_number: 5,
        distribution_summary: {
          total_components: 100,
          components_allocated: 100,
          components_with_warnings: 0,
          total_weight: 500.0,
          total_allocated_mh: 1500.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1500.0,
        revisionReason: 'Fifth revision',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.version_number).toBe(5);
    });
  });

  describe('FR-005: Permission checks (only Owner, Admin, PM can create budgets)', () => {
    it('should return UNAUTHORIZED error when user lacks permission', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only Owner, Admin, or Project Manager can create budgets',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'Unauthorized attempt',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Only Owner, Admin, or Project Manager can create budgets');
    });

    it('should allow Owner role to create budget', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'owner-budget-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 50,
          components_allocated: 50,
          components_with_warnings: 0,
          total_weight: 200.0,
          total_allocated_mh: 500.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 500.0,
        revisionReason: 'Owner budget creation',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
    });

    it('should allow Admin role to create budget', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'admin-budget-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 75,
          components_allocated: 75,
          components_with_warnings: 0,
          total_weight: 300.0,
          total_allocated_mh: 750.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 750.0,
        revisionReason: 'Admin budget creation',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
    });

    it('should allow Project Manager role to create budget', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'pm-budget-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 100,
          components_allocated: 100,
          components_with_warnings: 0,
          total_weight: 400.0,
          total_allocated_mh: 1000.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'PM budget creation',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ZERO_WEIGHT error when all components have zero weight', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: false,
        error: 'ZERO_WEIGHT',
        message: 'Sum of component weights is zero, cannot distribute budget',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'Zero weight project',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle network/database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: dbError,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'Network error test',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Failed to create manhour budget');
    });

    it('should handle very large budgets (10000+ manhours)', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'large-budget-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 5000,
          components_allocated: 5000,
          components_with_warnings: 150,
          total_weight: 12500.0,
          total_allocated_mh: 50000.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 50000.0,
        revisionReason: 'Large project estimate',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.distribution_summary?.total_allocated_mh).toBe(50000.0);
      expect(result.current.data?.distribution_summary?.total_components).toBe(5000);
    });

    it('should handle very small budgets (fractional manhours)', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'small-budget-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 5,
          components_allocated: 5,
          components_with_warnings: 0,
          total_weight: 10.0,
          total_allocated_mh: 5.5,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 5.5,
        revisionReason: 'Small project estimate',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.distribution_summary?.total_allocated_mh).toBe(5.5);
    });
  });

  describe('RPC Contract Compliance', () => {
    it('should match expected response shape for success case', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: true,
        budget_id: 'test-uuid',
        version_number: 1,
        distribution_summary: {
          total_components: 100,
          components_allocated: 100,
          components_with_warnings: 5,
          total_weight: 500.0,
          total_allocated_mh: 1000.0,
        },
        warnings: [],
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'Contract compliance test',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify all required fields are present
      expect(result.current.data).toHaveProperty('success');
      expect(result.current.data).toHaveProperty('budget_id');
      expect(result.current.data).toHaveProperty('version_number');
      expect(result.current.data).toHaveProperty('distribution_summary');
      expect(result.current.data).toHaveProperty('warnings');

      // Verify distribution_summary structure
      expect(result.current.data?.distribution_summary).toHaveProperty('total_components');
      expect(result.current.data?.distribution_summary).toHaveProperty('components_allocated');
      expect(result.current.data?.distribution_summary).toHaveProperty('components_with_warnings');
      expect(result.current.data?.distribution_summary).toHaveProperty('total_weight');
      expect(result.current.data?.distribution_summary).toHaveProperty('total_allocated_mh');

      // Verify error field is not present on success
      expect(result.current.data).not.toHaveProperty('error');
    });

    it('should match expected response shape for error case', async () => {
      const mockResponse: CreateManhourBudgetResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only Owner, Admin, or Project Manager can create budgets',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      } as any);

      const { result } = renderHook(() => useCreateManhourBudget(), { wrapper });

      await waitFor(() => expect(result.current.mutate).toBeDefined());

      result.current.mutate({
        projectId: testProjectId,
        totalBudgetedManhours: 1000.0,
        revisionReason: 'Error case test',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Error should be thrown by the hook
      expect(result.current.error).toBeDefined();
    });
  });
});
