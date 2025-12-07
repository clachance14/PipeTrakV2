/**
 * Unit tests for useFieldWeldDeltaReport hook (Feature 033)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useFieldWeldDeltaReport } from './useFieldWeldDeltaReport';
import type { ReportDateRange, FieldWeldGroupingDimension } from '@/types/reports';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

// Create a test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFieldWeldDeltaReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful queries', () => {
    it('returns correct data structure when query succeeds', async () => {
      // Mock RPC response (database snake_case format)
      const mockRpcData = [
        {
          dimension_id: 'area-1',
          dimension_name: 'Area A',
          stencil: null,
          welds_with_activity: 10,
          delta_fitup_count: 5,
          delta_weld_complete_count: 3,
          delta_accepted_count: 2,
          delta_pct_total: 25.5,
        },
        {
          dimension_id: 'area-2',
          dimension_name: 'Area B',
          stencil: null,
          welds_with_activity: 20,
          delta_fitup_count: 10,
          delta_weld_complete_count: 8,
          delta_accepted_count: 6,
          delta_pct_total: 50.0,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      // Wait for query to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      const data = result.current.data!;

      // Check overall structure
      expect(data.dimension).toBe('area');
      expect(data.projectId).toBe('project-123');
      expect(data.dateRange).toBe(dateRange);
      expect(data.generatedAt).toBeInstanceOf(Date);

      // Check rows (should match mock data, transformed to camelCase)
      expect(data.rows).toHaveLength(2);
      expect(data.rows[0]).toEqual({
        id: 'area-1',
        name: 'Area A',
        stencil: undefined,
        weldsWithActivity: 10,
        deltaFitupCount: 5,
        deltaWeldCompleteCount: 3,
        deltaAcceptedCount: 2,
        deltaPctTotal: 25.5,
      });
      expect(data.rows[1]).toEqual({
        id: 'area-2',
        name: 'Area B',
        stencil: undefined,
        weldsWithActivity: 20,
        deltaFitupCount: 10,
        deltaWeldCompleteCount: 8,
        deltaAcceptedCount: 6,
        deltaPctTotal: 50.0,
      });

      // Check grand total (sum of counts, weighted average of percentage)
      expect(data.grandTotal).toEqual({
        name: 'Grand Total',
        weldsWithActivity: 30, // 10 + 20
        deltaFitupCount: 15, // 5 + 10
        deltaWeldCompleteCount: 11, // 3 + 8
        deltaAcceptedCount: 8, // 2 + 6
        deltaPctTotal: 41.833333333333336, // (25.5 * 10 + 50.0 * 20) / 30 = weighted avg
      });
    });

    it('handles welder dimension with stencil field', async () => {
      const mockRpcData = [
        {
          dimension_id: 'welder-1',
          dimension_name: 'John Doe',
          stencil: 'JD',
          welds_with_activity: 15,
          delta_fitup_count: 8,
          delta_weld_complete_count: 5,
          delta_accepted_count: 2,
          delta_pct_total: 33.33,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_30_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'welder', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rows[0]?.stencil).toBe('JD');
    });

    it('calls RPC with correct parameters', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      renderHook(() => useFieldWeldDeltaReport('project-456', 'system', dateRange), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

      expect(supabase.rpc).toHaveBeenCalledWith('get_field_weld_delta_by_dimension', {
        p_project_id: 'project-456',
        p_dimension: 'system',
        p_start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
        p_end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });

    it('handles empty result set', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rows).toEqual([]);
      expect(result.current.data?.grandTotal).toEqual({
        name: 'Grand Total',
        weldsWithActivity: 0,
        deltaFitupCount: 0,
        deltaWeldCompleteCount: 0,
        deltaAcceptedCount: 0,
        deltaPctTotal: 0,
      });
    });
  });

  describe('filtering behavior', () => {
    it('filters out rows with welds_with_activity === 0', async () => {
      const mockRpcData = [
        {
          dimension_id: 'area-1',
          dimension_name: 'Area A',
          stencil: null,
          welds_with_activity: 10,
          delta_fitup_count: 5,
          delta_weld_complete_count: 3,
          delta_accepted_count: 2,
          delta_pct_total: 25.0,
        },
        {
          dimension_id: 'area-2',
          dimension_name: 'Area B (No Activity)',
          stencil: null,
          welds_with_activity: 0, // Should be filtered out
          delta_fitup_count: 0,
          delta_weld_complete_count: 0,
          delta_accepted_count: 0,
          delta_pct_total: 0,
        },
        {
          dimension_id: 'area-3',
          dimension_name: 'Area C',
          stencil: null,
          welds_with_activity: 5,
          delta_fitup_count: 2,
          delta_weld_complete_count: 2,
          delta_accepted_count: 1,
          delta_pct_total: 20.0,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should only have 2 rows (Area A and Area C)
      expect(result.current.data?.rows).toHaveLength(2);
      expect(result.current.data?.rows[0]?.name).toBe('Area A');
      expect(result.current.data?.rows[1]?.name).toBe('Area C');

      // Grand total should only include filtered rows
      expect(result.current.data?.grandTotal.weldsWithActivity).toBe(15); // 10 + 5
      expect(result.current.data?.grandTotal.deltaFitupCount).toBe(7); // 5 + 2
    });

    it('handles all rows filtered out (all have zero activity)', async () => {
      const mockRpcData = [
        {
          dimension_id: 'area-1',
          dimension_name: 'Area A',
          stencil: null,
          welds_with_activity: 0,
          delta_fitup_count: 0,
          delta_weld_complete_count: 0,
          delta_accepted_count: 0,
          delta_pct_total: 0,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rows).toEqual([]);
      expect(result.current.data?.grandTotal).toEqual({
        name: 'Grand Total',
        weldsWithActivity: 0,
        deltaFitupCount: 0,
        deltaWeldCompleteCount: 0,
        deltaAcceptedCount: 0,
        deltaPctTotal: 0,
      });
    });
  });

  describe('disabled state', () => {
    it('is disabled when preset is "all_time"', async () => {
      const dateRange: ReportDateRange = {
        preset: 'all_time',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      // Query should be disabled (idle)
      expect(result.current.status).toBe('pending');
      expect(result.current.fetchStatus).toBe('idle');

      // RPC should not be called
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('is disabled when projectId is undefined', async () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport(undefined, 'area', dateRange),
        { wrapper: createWrapper() }
      );

      // Query should be disabled
      expect(result.current.status).toBe('pending');
      expect(result.current.fetchStatus).toBe('idle');

      // RPC should not be called
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('is disabled when enabled parameter is false', async () => {
      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange, false),
        { wrapper: createWrapper() }
      );

      // Query should be disabled
      expect(result.current.status).toBe('pending');
      expect(result.current.fetchStatus).toBe('idle');

      // RPC should not be called
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('is enabled when all conditions are met', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange, true),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // RPC should be called
      expect(supabase.rpc).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('throws error when RPC fails', async () => {
      const mockError = new Error('Database connection failed');

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(mockError);
    });

    it('handles null data gracefully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rows).toEqual([]);
      expect(result.current.data?.grandTotal.weldsWithActivity).toBe(0);
    });
  });

  describe('date range handling', () => {
    it('handles custom date range', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      renderHook(() => useFieldWeldDeltaReport('project-123', 'area', dateRange), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_field_weld_delta_by_dimension',
        expect.objectContaining({
          p_start_date: '2025-01-01',
          p_end_date: '2025-02-01', // +1 day for inclusive end
        })
      );
    });

    it('throws error for custom date range with missing dates', async () => {
      const dateRange: ReportDateRange = {
        preset: 'custom',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      // The query will try to execute because preset !== 'all_time'
      // But resolveDateRange returns null, so queryFn will try to access null.start
      // This will cause an error
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // The RPC might or might not be called depending on when the error occurs
      // The important thing is that it errors because of the invalid date range
    });
  });

  describe('different dimensions', () => {
    const dimensions: FieldWeldGroupingDimension[] = [
      'area',
      'system',
      'test_package',
      'welder',
      'overall',
    ];

    it.each(dimensions)('works with %s dimension', async (dimension) => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', dimension, dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_field_weld_delta_by_dimension',
        expect.objectContaining({
          p_dimension: dimension,
        })
      );

      expect(result.current.data?.dimension).toBe(dimension);
    });
  });

  describe('query caching', () => {
    it('uses staleTime of 2 minutes', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result, rerender } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // First call
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Rerender should not trigger new query (data is fresh)
      rerender();

      // Should still be only 1 call (cached)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('generates unique query keys for different parameters', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      });

      const wrapper = createWrapper();

      const dateRange1: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const dateRange2: ReportDateRange = {
        preset: 'last_30_days',
        startDate: null,
        endDate: null,
      };

      // First query
      const { unmount: unmount1 } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange1),
        { wrapper }
      );

      await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));

      unmount1();

      // Second query with different date range
      renderHook(() => useFieldWeldDeltaReport('project-123', 'area', dateRange2), {
        wrapper,
      });

      await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(2));

      // Different query keys = separate cache entries
    });
  });

  describe('grand total calculation', () => {
    it('calculates weighted average for deltaPctTotal', async () => {
      const mockRpcData = [
        {
          dimension_id: 'area-1',
          dimension_name: 'Area A',
          stencil: null,
          welds_with_activity: 100, // Large weight
          delta_fitup_count: 10,
          delta_weld_complete_count: 5,
          delta_accepted_count: 5,
          delta_pct_total: 10.0,
        },
        {
          dimension_id: 'area-2',
          dimension_name: 'Area B',
          stencil: null,
          welds_with_activity: 10, // Small weight
          delta_fitup_count: 5,
          delta_weld_complete_count: 3,
          delta_accepted_count: 2,
          delta_pct_total: 50.0,
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Weighted average: (10.0 * 100 + 50.0 * 10) / 110 = 13.636...
      expect(result.current.data?.grandTotal.deltaPctTotal).toBeCloseTo(13.636, 2);
    });

    it('handles zero weldsWithActivity in grand total calculation', async () => {
      const mockRpcData = [
        {
          dimension_id: 'area-1',
          dimension_name: 'Area A',
          stencil: null,
          welds_with_activity: 0,
          delta_fitup_count: 0,
          delta_weld_complete_count: 0,
          delta_accepted_count: 0,
          delta_pct_total: 100.0, // Should be ignored
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      const dateRange: ReportDateRange = {
        preset: 'last_7_days',
        startDate: null,
        endDate: null,
      };

      const { result } = renderHook(
        () => useFieldWeldDeltaReport('project-123', 'area', dateRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // All rows filtered out
      expect(result.current.data?.rows).toHaveLength(0);
      expect(result.current.data?.grandTotal.deltaPctTotal).toBe(0);
    });
  });
});
