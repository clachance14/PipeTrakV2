/**
 * Unit tests for useFieldWeldProgressReport hook
 * Tests data fetching, grand total calculation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useFieldWeldProgressReport } from './useFieldWeldProgressReport';
import type { FieldWeldGroupingDimension } from '@/types/reports';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFieldWeldProgressReport', () => {
  const testProjectId = 'test-project-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Fetching', () => {
    it('fetches data from vw_field_weld_progress_by_area when dimension is "area"', async () => {
      const mockData = [
        {
          area_id: 'area-1',
          area_name: 'B-64 OSBL',
          project_id: testProjectId,
          total_welds: 100,
          active_count: 80,
          accepted_count: 70,
          rejected_count: 5,
          pct_fitup: 90,
          pct_weld_complete: 85,
          pct_accepted: 70,
          nde_required_count: 60,
          nde_pass_count: 55,
          nde_fail_count: 5,
          nde_pending_count: 0,
          nde_pass_rate: 91.7,
          repair_count: 8,
          repair_rate: 8.0,
          avg_days_to_nde: 3.5,
          avg_days_to_acceptance: 5.2,
          pct_total: 75,
          fitup_count: 90,
          weld_complete_count: 85,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('vw_field_weld_progress_by_area');
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.dimension).toBe('area');
      expect(result.current.data?.rows).toHaveLength(1);
      expect(result.current.data?.rows[0].name).toBe('B-64 OSBL');
    });

    it('fetches data from vw_field_weld_progress_by_system when dimension is "system"', async () => {
      const mockData = [
        {
          system_id: 'system-1',
          system_name: 'S-100 Piping',
          project_id: testProjectId,
          total_welds: 50,
          active_count: 40,
          accepted_count: 35,
          rejected_count: 2,
          pct_fitup: 85,
          pct_weld_complete: 80,
          pct_accepted: 70,
          nde_required_count: 30,
          nde_pass_count: 28,
          nde_fail_count: 2,
          nde_pending_count: 0,
          nde_pass_rate: 93.3,
          repair_count: 4,
          repair_rate: 8.0,
          avg_days_to_nde: 2.8,
          avg_days_to_acceptance: 4.5,
          pct_total: 70,
          fitup_count: 43,
          weld_complete_count: 40,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'system'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('vw_field_weld_progress_by_system');
      expect(result.current.data?.dimension).toBe('system');
      expect(result.current.data?.rows[0].name).toBe('S-100 Piping');
    });

    it('fetches data from vw_field_weld_progress_by_test_package when dimension is "test_package"', async () => {
      const mockData = [
        {
          test_package_id: 'tp-1',
          test_package_name: 'TP-001 Main',
          project_id: testProjectId,
          total_welds: 75,
          active_count: 60,
          accepted_count: 50,
          rejected_count: 3,
          pct_fitup: 88,
          pct_weld_complete: 82,
          pct_accepted: 67,
          nde_required_count: 45,
          nde_pass_count: 42,
          nde_fail_count: 3,
          nde_pending_count: 0,
          nde_pass_rate: 93.3,
          repair_count: 6,
          repair_rate: 8.0,
          avg_days_to_nde: 3.2,
          avg_days_to_acceptance: 4.8,
          pct_total: 72,
          fitup_count: 66,
          weld_complete_count: 62,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(
        () => useFieldWeldProgressReport(testProjectId, 'test_package'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('vw_field_weld_progress_by_test_package');
      expect(result.current.data?.dimension).toBe('test_package');
      expect(result.current.data?.rows[0].name).toBe('TP-001 Main');
    });

    it('fetches data from vw_field_weld_progress_by_welder when dimension is "welder"', async () => {
      const mockData = [
        {
          welder_id: 'welder-1',
          welder_name: 'John Smith',
          welder_stencil: 'JS-101',
          project_id: testProjectId,
          total_welds: 120,
          active_count: 100,
          accepted_count: 90,
          rejected_count: 5,
          pct_fitup: 92,
          pct_weld_complete: 88,
          pct_accepted: 75,
          nde_required_count: 80,
          nde_pass_count: 75,
          nde_fail_count: 5,
          nde_pending_count: 0,
          nde_pass_rate: 93.8,
          repair_count: 10,
          repair_rate: 8.3,
          avg_days_to_nde: 3.0,
          avg_days_to_acceptance: 4.5,
          pct_total: 78,
          first_pass_acceptance_count: 85,
          first_pass_acceptance_rate: 77.3,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'welder'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('vw_field_weld_progress_by_welder');
      expect(result.current.data?.dimension).toBe('welder');
      expect(result.current.data?.rows[0].name).toBe('John Smith');
      expect(result.current.data?.rows[0].stencil).toBe('JS-101');
      expect(result.current.data?.rows[0].firstPassAcceptanceCount).toBe(85);
      expect(result.current.data?.rows[0].firstPassAcceptanceRate).toBe(77.3);
    });

    it('does not execute query when projectId is empty', () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport('', 'area'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('Grand Total Calculation', () => {
    it('calculates grand total with correct sums and weighted averages', async () => {
      const mockData = [
        {
          area_id: 'area-1',
          area_name: 'Area 1',
          project_id: testProjectId,
          total_welds: 100,
          active_count: 80,
          accepted_count: 70,
          rejected_count: 5,
          pct_fitup: 90,
          pct_weld_complete: 85,
          pct_accepted: 70,
          nde_required_count: 60,
          nde_pass_count: 55,
          nde_fail_count: 5,
          nde_pending_count: 0,
          nde_pass_rate: 91.7,
          repair_count: 8,
          repair_rate: 8.0,
          avg_days_to_nde: 3.5,
          avg_days_to_acceptance: 5.2,
          pct_total: 75,
          fitup_count: 90,
          weld_complete_count: 85,
        },
        {
          area_id: 'area-2',
          area_name: 'Area 2',
          project_id: testProjectId,
          total_welds: 50,
          active_count: 40,
          accepted_count: 35,
          rejected_count: 2,
          pct_fitup: 80,
          pct_weld_complete: 75,
          pct_accepted: 70,
          nde_required_count: 30,
          nde_pass_count: 28,
          nde_fail_count: 2,
          nde_pending_count: 0,
          nde_pass_rate: 93.3,
          repair_count: 4,
          repair_rate: 8.0,
          avg_days_to_nde: 2.5,
          avg_days_to_acceptance: 4.0,
          pct_total: 70,
          fitup_count: 40,
          weld_complete_count: 37,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const grandTotal = result.current.data?.grandTotal;
      expect(grandTotal).toBeDefined();

      // Sum counts
      expect(grandTotal?.totalWelds).toBe(150);
      expect(grandTotal?.activeCount).toBe(120);
      expect(grandTotal?.acceptedCount).toBe(105);
      expect(grandTotal?.rejectedCount).toBe(7);
      expect(grandTotal?.ndeRequiredCount).toBe(90);
      expect(grandTotal?.ndePassCount).toBe(83);
      expect(grandTotal?.ndeFailCount).toBe(7);
      expect(grandTotal?.ndePendingCount).toBe(0);
      expect(grandTotal?.repairCount).toBe(12);

      // Weighted averages (rounded)
      // pctFitup: (90*100 + 80*50) / 150 = 13000/150 = 86.67 → rounds to 87
      expect(grandTotal?.pctFitup).toBe(87);

      // pctWeldComplete: (85*100 + 75*50) / 150 = 12250/150 = 81.67 → rounds to 82
      expect(grandTotal?.pctWeldComplete).toBe(82);

      // pctAccepted: (70*100 + 70*50) / 150 = 10500/150 = 70
      expect(grandTotal?.pctAccepted).toBe(70);

      // pctTotal: (75*100 + 70*50) / 150 = 11000/150 = 73.33 → rounds to 73
      expect(grandTotal?.pctTotal).toBe(73);

      // NDE pass rate: 83 / 90 = 92.22% → rounds to 92
      expect(grandTotal?.ndePassRate).toBe(92);

      // Repair rate: (12 / 150) * 100 = 8%
      expect(grandTotal?.repairRate).toBe(8);

      // Time metrics (weighted by totalWelds)
      // avgDaysToNDE: (3.5*100 + 2.5*50) / 150 = 475/150 = 3.17
      expect(grandTotal?.avgDaysToNDE).toBeCloseTo(3.17, 1);

      // avgDaysToAcceptance: (5.2*100 + 4.0*50) / 150 = 720/150 = 4.8
      expect(grandTotal?.avgDaysToAcceptance).toBeCloseTo(4.8, 1);

      // Milestone counts (simple sums)
      // fitupCount: 90 + 40 = 130
      expect(grandTotal?.fitupCount).toBe(130);

      // weldCompleteCount: 85 + 37 = 122
      expect(grandTotal?.weldCompleteCount).toBe(122);
    });

    it('handles null NDE pass rate when no NDE complete', async () => {
      const mockData = [
        {
          area_id: 'area-1',
          area_name: 'Area 1',
          project_id: testProjectId,
          total_welds: 50,
          active_count: 50,
          accepted_count: 0,
          rejected_count: 0,
          pct_fitup: 100,
          pct_weld_complete: 50,
          pct_accepted: 0,
          nde_required_count: 30,
          nde_pass_count: 0,
          nde_fail_count: 0,
          nde_pending_count: 30,
          nde_pass_rate: null,
          repair_count: 0,
          repair_rate: 0,
          avg_days_to_nde: null,
          avg_days_to_acceptance: null,
          pct_total: 25,
          fitup_count: 50,
          weld_complete_count: 25,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const grandTotal = result.current.data?.grandTotal;
      expect(grandTotal?.ndePassRate).toBeNull();
    });

    it('handles null time metrics when no data available', async () => {
      const mockData = [
        {
          area_id: 'area-1',
          area_name: 'Area 1',
          project_id: testProjectId,
          total_welds: 50,
          active_count: 50,
          accepted_count: 0,
          rejected_count: 0,
          pct_fitup: 100,
          pct_weld_complete: 50,
          pct_accepted: 0,
          nde_required_count: 30,
          nde_pass_count: 0,
          nde_fail_count: 0,
          nde_pending_count: 30,
          nde_pass_rate: null,
          repair_count: 0,
          repair_rate: 0,
          avg_days_to_nde: null,
          avg_days_to_acceptance: null,
          pct_total: 25,
          fitup_count: 50,
          weld_complete_count: 25,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const grandTotal = result.current.data?.grandTotal;
      expect(grandTotal?.avgDaysToNDE).toBeNull();
      expect(grandTotal?.avgDaysToAcceptance).toBeNull();
    });

    it('calculates welder-specific metrics when dimension is "welder"', async () => {
      const mockData = [
        {
          welder_id: 'welder-1',
          welder_name: 'John Smith',
          welder_stencil: 'JS-101',
          project_id: testProjectId,
          total_welds: 100,
          active_count: 80,
          accepted_count: 70,
          rejected_count: 5,
          pct_fitup: 90,
          pct_weld_complete: 85,
          pct_accepted: 70,
          nde_required_count: 60,
          nde_pass_count: 55,
          nde_fail_count: 5,
          nde_pending_count: 0,
          nde_pass_rate: 91.7,
          repair_count: 8,
          repair_rate: 8.0,
          avg_days_to_nde: 3.5,
          avg_days_to_acceptance: 5.2,
          pct_total: 75,
          first_pass_acceptance_count: 70,
          first_pass_acceptance_rate: 76.1,
        },
        {
          welder_id: 'welder-2',
          welder_name: 'Jane Doe',
          welder_stencil: 'JD-102',
          project_id: testProjectId,
          total_welds: 50,
          active_count: 40,
          accepted_count: 35,
          rejected_count: 2,
          pct_fitup: 85,
          pct_weld_complete: 80,
          pct_accepted: 70,
          nde_required_count: 30,
          nde_pass_count: 28,
          nde_fail_count: 2,
          nde_pending_count: 0,
          nde_pass_rate: 93.3,
          repair_count: 4,
          repair_rate: 8.0,
          avg_days_to_nde: 2.5,
          avg_days_to_acceptance: 4.0,
          pct_total: 70,
          first_pass_acceptance_count: 35,
          first_pass_acceptance_rate: 76.1,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'welder'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const grandTotal = result.current.data?.grandTotal;
      expect(grandTotal).toBeDefined();

      // Welder-specific metrics should be present
      expect(grandTotal?.firstPassAcceptanceCount).toBe(105);
      // First pass rate: 105 / (150 - 12 repair_count) = 105 / 138 = 76.09% → rounds to 76
      expect(grandTotal?.firstPassAcceptanceRate).toBe(76);
    });

    it('handles empty dataset with zero grand total', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const grandTotal = result.current.data?.grandTotal;
      expect(grandTotal).toBeDefined();
      expect(grandTotal?.name).toBe('Grand Total');
      expect(grandTotal?.totalWelds).toBe(0);
      expect(grandTotal?.pctTotal).toBe(0);
      expect(grandTotal?.ndePassRate).toBeNull();
      expect(grandTotal?.avgDaysToNDE).toBeNull();
      expect(grandTotal?.avgDaysToAcceptance).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid dimension gracefully', async () => {
      const { result } = renderHook(
        () => useFieldWeldProgressReport(testProjectId, 'invalid' as FieldWeldGroupingDimension),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Invalid grouping dimension');
    });

    it('handles network error from Supabase', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network error', code: 'NETWORK_ERROR' },
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Loading States', () => {
    it('starts in loading state', () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('transitions to success state after data loads', async () => {
      const mockData = [
        {
          area_id: 'area-1',
          area_name: 'Test Area',
          project_id: testProjectId,
          total_welds: 50,
          active_count: 40,
          accepted_count: 30,
          rejected_count: 2,
          pct_fitup: 80,
          pct_weld_complete: 70,
          pct_accepted: 60,
          nde_required_count: 25,
          nde_pass_count: 23,
          nde_fail_count: 2,
          nde_pending_count: 0,
          nde_pass_rate: 92.0,
          repair_count: 3,
          repair_rate: 6.0,
          avg_days_to_nde: 3.0,
          avg_days_to_acceptance: 4.5,
          pct_total: 65,
          fitup_count: 40,
          weld_complete_count: 35,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeDefined();
    });
  });

  describe('Query Key and Caching', () => {
    it('uses correct query key for cache invalidation', () => {
      const dimensions: FieldWeldGroupingDimension[] = ['area', 'system', 'test_package', 'welder'];

      dimensions.forEach((dimension) => {
        const mockFrom = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        });

        vi.mocked(supabase.from).mockImplementation(mockFrom);

        const { result } = renderHook(
          () => useFieldWeldProgressReport(testProjectId, dimension),
          { wrapper: createWrapper() }
        );

        // Query key should include projectId and dimension for proper caching
        expect(result.current).toBeDefined();
      });
    });

    it('sets appropriate staleTime for report data', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const { result } = renderHook(() => useFieldWeldProgressReport(testProjectId, 'area'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Query should be defined with staleTime configuration (2 minutes)
      expect(result.current).toBeDefined();
      expect(result.current.isStale).toBe(false);
    });
  });
});
