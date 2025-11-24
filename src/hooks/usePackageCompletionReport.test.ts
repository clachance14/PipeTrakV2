/**
 * Tests for usePackageCompletionReport hook
 * Feature 030: Test Package Workflow - Component list grouped by drawing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { usePackageCompletionReport } from './usePackageCompletionReport';
import type { PackageComponent } from '@/types/package.types';
import type { Database } from '@/types/database.types';

type FieldWeldRow = Database['public']['Tables']['field_welds']['Row'];

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock usePackageComponents hook
vi.mock('./usePackages', () => ({
  usePackageComponents: vi.fn(),
}));

import { supabase } from '@/lib/supabase';
import { usePackageComponents } from './usePackages';

describe('usePackageCompletionReport', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  // Helper to create standard mock for supabase.from with table-specific behavior
  const createMockFrom = (fieldWelds: FieldWeldRow[], workflowStages = [{ stage_order: 1, status: 'completed' }]) => {
    return vi.fn((table: string) => {
      if (table === 'test_packages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'package-1', name: 'Test Package', test_type: 'Hydrostatic', target_date: null },
            error: null,
          }),
        };
      } else if (table === 'package_workflow_stages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: workflowStages,
            error: null,
          }),
        };
      } else if (table === 'field_welds') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: fieldWelds,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    });
  };

  const mockPackageComponents: PackageComponent[] = [
    {
      id: 'comp-1',
      drawing_id: 'dwg-1',
      drawing_no_norm: 'P-001',
      component_type: 'field_weld',
      identity_key: { weld_number: 'W-001' },
      identityDisplay: 'W-001',
      percent_complete: 100,
    },
    {
      id: 'comp-2',
      drawing_id: 'dwg-1',
      drawing_no_norm: 'P-001',
      component_type: 'support',
      identity_key: { commodity_code: 'HGR', size: '4"', seq: 1 },
      identityDisplay: 'HGR 4"',
      percent_complete: 50,
    },
    {
      id: 'comp-3',
      drawing_id: 'dwg-1',
      drawing_no_norm: 'P-001',
      component_type: 'support',
      identity_key: { commodity_code: 'HGR', size: '4"', seq: 2 },
      identityDisplay: 'HGR 4" (2)',
      percent_complete: 50,
    },
    {
      id: 'comp-4',
      drawing_id: 'dwg-2',
      drawing_no_norm: 'P-002',
      component_type: 'field_weld',
      identity_key: { weld_number: 'W-002' },
      identityDisplay: 'W-002',
      percent_complete: 75,
    },
    {
      id: 'comp-5',
      drawing_id: 'dwg-2',
      drawing_no_norm: 'P-002',
      component_type: 'support',
      identity_key: { commodity_code: 'CLR', size: '2"', seq: 1 },
      identityDisplay: 'CLR 2"',
      percent_complete: 100,
    },
  ];

  const mockFieldWelds: FieldWeldRow[] = [
    {
      id: 'weld-1',
      component_id: 'comp-1',
      project_id: 'proj-1',
      weld_type: 'BW',
      weld_size: '4"',
      nde_required: true,
      nde_type: 'RT',
      nde_result: 'PASS',
      nde_date: '2025-11-20',
      nde_notes: null,
      status: 'complete',
      welder_id: 'welder-1',
      date_welded: '2025-11-15',
      created_by: 'user-1',
      created_at: '2025-11-10T00:00:00Z',
      updated_at: '2025-11-20T00:00:00Z',
      base_metal: null,
      schedule: null,
      spec: null,
      notes: null,
      is_repair: false,
      is_unplanned: false,
      original_weld_id: null,
      xray_percentage: null,
    },
    {
      id: 'weld-2',
      component_id: 'comp-4',
      project_id: 'proj-1',
      weld_type: 'SW',
      weld_size: '2"',
      nde_required: true,
      nde_type: 'UT',
      nde_result: 'PENDING',
      nde_date: null,
      nde_notes: null,
      status: 'in_progress',
      welder_id: 'welder-2',
      date_welded: '2025-11-18',
      created_by: 'user-1',
      created_at: '2025-11-10T00:00:00Z',
      updated_at: '2025-11-18T00:00:00Z',
      base_metal: null,
      schedule: null,
      spec: null,
      notes: null,
      is_repair: false,
      is_unplanned: false,
      original_weld_id: null,
      xray_percentage: null,
    },
  ];

  it('should group components by drawing', async () => {
    vi.mocked(usePackageComponents).mockReturnValue({
      data: mockPackageComponents,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(supabase.from).mockImplementation(createMockFrom(mockFieldWelds) as any);

    const { result } = renderHook(
      () => usePackageCompletionReport('package-1', 'proj-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const report = result.current.data;
    const drawingGroups = report?.drawing_groups;
    expect(drawingGroups).toHaveLength(2);

    // Check first drawing group
    expect(drawingGroups?.[0].drawing_id).toBe('dwg-1');
    expect(drawingGroups?.[0].drawing_no_norm).toBe('P-001');
    expect(drawingGroups?.[0].component_count).toBe(3);
    expect(drawingGroups?.[0].components).toHaveLength(3);

    // Check second drawing group
    expect(drawingGroups?.[1].drawing_id).toBe('dwg-2');
    expect(drawingGroups?.[1].drawing_no_norm).toBe('P-002');
    expect(drawingGroups?.[1].component_count).toBe(2);
    expect(drawingGroups?.[1].components).toHaveLength(2);
  });

  it('should calculate unique supports count correctly', async () => {
    vi.mocked(usePackageComponents).mockReturnValue({
      data: mockPackageComponents,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(supabase.from).mockImplementation(createMockFrom(mockFieldWelds) as any);

    const { result } = renderHook(
      () => usePackageCompletionReport('package-1', 'proj-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const report = result.current.data;
    const drawingGroups = report?.drawing_groups;

    // Drawing 1: has 2 support components with SAME identity_key (HGR 4" with different seq)
    // Should count as 1 unique support
    expect(drawingGroups?.[0].unique_supports_count).toBe(1);

    // Drawing 2: has 1 support component (CLR 2")
    // Should count as 1 unique support
    expect(drawingGroups?.[1].unique_supports_count).toBe(1);
  });

  it('should include weld log entries for each drawing', async () => {
    vi.mocked(usePackageComponents).mockReturnValue({
      data: mockPackageComponents,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(supabase.from).mockImplementation(createMockFrom(mockFieldWelds) as any);

    const { result } = renderHook(
      () => usePackageCompletionReport('package-1', 'proj-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const report = result.current.data;
    const drawingGroups = report?.drawing_groups;

    // Drawing 1 should have 1 weld (weld-1 for comp-1)
    expect(drawingGroups?.[0].weld_log).toHaveLength(1);
    expect(drawingGroups?.[0].weld_log[0].id).toBe('weld-1');
    expect(drawingGroups?.[0].weld_log[0].weld_display_name).toBe('W-001');

    // Drawing 2 should have 1 weld (weld-2 for comp-4)
    expect(drawingGroups?.[1].weld_log).toHaveLength(1);
    expect(drawingGroups?.[1].weld_log[0].id).toBe('weld-2');
    expect(drawingGroups?.[1].weld_log[0].weld_display_name).toBe('W-002');
  });

  it('should calculate NDE summary statistics correctly', async () => {
    vi.mocked(usePackageComponents).mockReturnValue({
      data: mockPackageComponents,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    vi.mocked(supabase.from).mockImplementation(createMockFrom(mockFieldWelds) as any);

    const { result } = renderHook(
      () => usePackageCompletionReport('package-1', 'proj-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const report = result.current.data;
    const drawingGroups = report?.drawing_groups;

    // Drawing 1: 1 weld, nde_required=true, nde_result=PASS
    expect(drawingGroups?.[0].nde_summary).toEqual({
      total_welds: 1,
      nde_required_count: 1,
      nde_pass_count: 1,
      nde_fail_count: 0,
      nde_pending_count: 0,
    });

    // Drawing 2: 1 weld, nde_required=true, nde_result=PENDING
    expect(drawingGroups?.[1].nde_summary).toEqual({
      total_welds: 1,
      nde_required_count: 1,
      nde_pass_count: 0,
      nde_fail_count: 0,
      nde_pending_count: 1,
    });
  });

  it('should handle empty components gracefully', async () => {
    vi.mocked(usePackageComponents).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const mockFrom = vi.fn((table: string) => {
      if (table === 'test_packages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'package-1', name: 'Test Package', test_type: 'Hydrostatic', target_date: null },
            error: null,
          }),
        };
      } else if (table === 'package_workflow_stages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { result } = renderHook(
      () => usePackageCompletionReport('package-1', 'proj-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const report = result.current.data;
    expect(report?.drawing_groups).toEqual([]);
    expect(report?.component_summary).toEqual([]);
    expect(report?.support_summary).toEqual([]);
  });

  it('should handle components without field welds', async () => {
    // Only supports, no welds
    const componentsWithoutWelds: PackageComponent[] = [
      {
        id: 'comp-2',
        drawing_id: 'dwg-1',
        drawing_no_norm: 'P-001',
        component_type: 'support',
        identity_key: { commodity_code: 'HGR', size: '4"', seq: 1 },
        identityDisplay: 'HGR 4"',
        percent_complete: 50,
      },
    ];

    vi.mocked(usePackageComponents).mockReturnValue({
      data: componentsWithoutWelds,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const mockFrom = vi.fn((table: string) => {
      if (table === 'test_packages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'package-1', name: 'Test Package', test_type: 'Hydrostatic', target_date: null },
            error: null,
          }),
        };
      } else if (table === 'package_workflow_stages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { result } = renderHook(
      () => usePackageCompletionReport('package-1', 'proj-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const report = result.current.data;
    const drawingGroups = report?.drawing_groups;

    expect(drawingGroups).toHaveLength(1);
    expect(drawingGroups?.[0].weld_log).toHaveLength(0);
    expect(drawingGroups?.[0].nde_summary).toEqual({
      total_welds: 0,
      nde_required_count: 0,
      nde_pass_count: 0,
      nde_fail_count: 0,
      nde_pending_count: 0,
    });
  });

  it('should return empty report structure when packageId is undefined', async () => {
    const { result } = renderHook(
      () => usePackageCompletionReport(undefined, 'proj-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const report = result.current.data;
    expect(report?.drawing_groups).toEqual([]);
    expect(report?.package_id).toBe('');
    expect(report?.is_draft).toBe(true);
  });

  describe('Component Summary Calculation', () => {
    it('should calculate component summary with aggregated quantities', async () => {
      vi.mocked(usePackageComponents).mockReturnValue({
        data: mockPackageComponents,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const mockFrom = vi.fn((table: string) => {
        if (table === 'test_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'package-1', name: 'Test Package', test_type: 'Hydrostatic', target_date: null },
              error: null,
            }),
          };
        } else if (table === 'package_workflow_stages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ stage_order: 1, status: 'completed' }],
              error: null,
            }),
          };
        } else if (table === 'field_welds') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: mockFieldWelds,
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;
      expect(report?.component_summary).toBeDefined();
      expect(report?.component_summary).toHaveLength(4);

      // Should have: 2x field_weld (W-001, W-002), 2x support (HGR 4" qty 2, CLR 2" qty 1)
      const fieldWelds = report?.component_summary.filter(r => r.component_type === 'field_weld');
      expect(fieldWelds).toHaveLength(2);
      expect(fieldWelds?.[0].quantity).toBe(1);

      const supports = report?.component_summary.filter(r => r.component_type === 'support');
      expect(supports).toHaveLength(2); // HGR 4" (qty 2) and CLR 2" (qty 1)

      // HGR 4" should be aggregated (2 components with same commodity_code + size)
      const hgrSupport = supports?.find(s => s.identity_display.includes('HGR'));
      expect(hgrSupport?.quantity).toBe(2);
      expect(hgrSupport?.identity_display).toBe('HGR/4"');
    });

    it('should group components by drawing, type, and identity (excluding seq)', async () => {
      const componentsWithDuplicates: PackageComponent[] = [
        {
          id: 'comp-1',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'spool',
          identity_key: { line_no: '1', spool_no: 'A', seq: 1 },
          identityDisplay: '1-SPOOL-A',
          percent_complete: 100,
        },
        {
          id: 'comp-2',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'spool',
          identity_key: { line_no: '1', spool_no: 'A', seq: 2 },
          identityDisplay: '1-SPOOL-A (2)',
          percent_complete: 100,
        },
      ];

      vi.mocked(usePackageComponents).mockReturnValue({
        data: componentsWithDuplicates,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      vi.mocked(supabase.from).mockImplementation(createMockFrom([]) as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;

      // Should have 1 row with quantity = 2 (grouped by identity excluding seq)
      expect(report?.component_summary).toHaveLength(1);
      expect(report?.component_summary[0]).toEqual({
        drawing_no_norm: 'P-001',
        component_type: 'spool',
        identity_display: '1-SPOOL-A',
        quantity: 2,
      });
    });

    it('should sort component summary by drawing then component type', async () => {
      const mixedComponents: PackageComponent[] = [
        {
          id: 'comp-1',
          drawing_id: 'dwg-2',
          drawing_no_norm: 'P-002',
          component_type: 'valve',
          identity_key: { commodity_code: 'VLV-001', tag_no: 'V-100' },
          identityDisplay: 'V-100',
          percent_complete: 100,
        },
        {
          id: 'comp-2',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'spool',
          identity_key: { line_no: '1', spool_no: 'A' },
          identityDisplay: '1-SPOOL-A',
          percent_complete: 100,
        },
        {
          id: 'comp-3',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'field_weld',
          identity_key: { weld_number: 'W-001' },
          identityDisplay: 'W-001',
          percent_complete: 100,
        },
      ];

      vi.mocked(usePackageComponents).mockReturnValue({
        data: mixedComponents,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      vi.mocked(supabase.from).mockImplementation(createMockFrom([]) as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;

      // Should be sorted: P-001 (field_weld, then spool), then P-002 (valve)
      expect(report?.component_summary[0].drawing_no_norm).toBe('P-001');
      expect(report?.component_summary[0].component_type).toBe('field_weld');
      expect(report?.component_summary[1].drawing_no_norm).toBe('P-001');
      expect(report?.component_summary[1].component_type).toBe('spool');
      expect(report?.component_summary[2].drawing_no_norm).toBe('P-002');
      expect(report?.component_summary[2].component_type).toBe('valve');
    });

    it('should handle empty components in component summary', async () => {
      vi.mocked(usePackageComponents).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      vi.mocked(supabase.from).mockImplementation(createMockFrom([]) as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;
      expect(report?.component_summary).toEqual([]);
    });
  });

  describe('Support Summary Calculation', () => {
    it('should calculate support summary aggregated by commodity_code and size', async () => {
      const supportsWithDuplicates: PackageComponent[] = [
        {
          id: 'comp-1',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'support',
          identity_key: { commodity_code: 'CS-2', size: '2IN', seq: 1 },
          identityDisplay: 'CS-2 2IN',
          percent_complete: 100,
        },
        {
          id: 'comp-2',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'support',
          identity_key: { commodity_code: 'CS-2', size: '2IN', seq: 2 },
          identityDisplay: 'CS-2 2IN (2)',
          percent_complete: 100,
        },
        {
          id: 'comp-3',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'support',
          identity_key: { commodity_code: 'CS-2', size: '2IN', seq: 3 },
          identityDisplay: 'CS-2 2IN (3)',
          percent_complete: 100,
        },
        {
          id: 'comp-4',
          drawing_id: 'dwg-2',
          drawing_no_norm: 'P-002',
          component_type: 'support',
          identity_key: { commodity_code: 'CS-2', size: '4IN', seq: 1 },
          identityDisplay: 'CS-2 4IN',
          percent_complete: 100,
        },
        {
          id: 'comp-5',
          drawing_id: 'dwg-2',
          drawing_no_norm: 'P-002',
          component_type: 'support',
          identity_key: { commodity_code: 'HNGR-001', size: '2IN', seq: 1 },
          identityDisplay: 'HNGR-001 2IN',
          percent_complete: 100,
        },
      ];

      vi.mocked(usePackageComponents).mockReturnValue({
        data: supportsWithDuplicates,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      vi.mocked(supabase.from).mockImplementation(createMockFrom([]) as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;
      expect(report?.support_summary).toHaveLength(3);

      // CS-2 2IN: 3 instances
      const cs2_2in = report?.support_summary.find(s => s.commodity_code === 'CS-2' && s.size === '2IN');
      expect(cs2_2in?.quantity).toBe(3);

      // CS-2 4IN: 1 instance
      const cs2_4in = report?.support_summary.find(s => s.commodity_code === 'CS-2' && s.size === '4IN');
      expect(cs2_4in?.quantity).toBe(1);

      // HNGR-001 2IN: 1 instance
      const hngr = report?.support_summary.find(s => s.commodity_code === 'HNGR-001');
      expect(hngr?.quantity).toBe(1);
    });

    it('should sort support summary by commodity_code then size', async () => {
      const supports: PackageComponent[] = [
        {
          id: 'comp-1',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'support',
          identity_key: { commodity_code: 'HNGR-001', size: '2IN', seq: 1 },
          identityDisplay: 'HNGR-001 2IN',
          percent_complete: 100,
        },
        {
          id: 'comp-2',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'support',
          identity_key: { commodity_code: 'CS-2', size: '4IN', seq: 1 },
          identityDisplay: 'CS-2 4IN',
          percent_complete: 100,
        },
        {
          id: 'comp-3',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'support',
          identity_key: { commodity_code: 'CS-2', size: '2IN', seq: 1 },
          identityDisplay: 'CS-2 2IN',
          percent_complete: 100,
        },
      ];

      vi.mocked(usePackageComponents).mockReturnValue({
        data: supports,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      vi.mocked(supabase.from).mockImplementation(createMockFrom([]) as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;

      // Should be sorted: CS-2/2IN, CS-2/4IN, HNGR-001/2IN
      expect(report?.support_summary[0]).toEqual({
        commodity_code: 'CS-2',
        size: '2IN',
        quantity: 1,
      });
      expect(report?.support_summary[1]).toEqual({
        commodity_code: 'CS-2',
        size: '4IN',
        quantity: 1,
      });
      expect(report?.support_summary[2]).toEqual({
        commodity_code: 'HNGR-001',
        size: '2IN',
        quantity: 1,
      });
    });

    it('should return empty array when no supports exist', async () => {
      const componentsWithoutSupports: PackageComponent[] = [
        {
          id: 'comp-1',
          drawing_id: 'dwg-1',
          drawing_no_norm: 'P-001',
          component_type: 'spool',
          identity_key: { line_no: '1', spool_no: 'A' },
          identityDisplay: '1-SPOOL-A',
          percent_complete: 100,
        },
      ];

      vi.mocked(usePackageComponents).mockReturnValue({
        data: componentsWithoutSupports,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      vi.mocked(supabase.from).mockImplementation(createMockFrom([]) as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;
      expect(report?.support_summary).toEqual([]);
    });
  });

  describe('Workflow Status (Draft/Final)', () => {
    it('should return is_draft = true when any workflow stages are incomplete', async () => {
      vi.mocked(usePackageComponents).mockReturnValue({
        data: mockPackageComponents,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      // Mock field welds and workflow stages queries
      const mockFrom = vi.fn((table: string) => {
        if (table === 'test_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'package-1', name: 'Test Package', test_type: 'Hydrostatic', target_date: null },
              error: null,
            }),
          };
        } else if (table === 'field_welds') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: mockFieldWelds,
              error: null,
            }),
          };
        } else if (table === 'package_workflow_stages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { stage_order: 1, status: 'completed' },
                { stage_order: 2, status: 'completed' },
                { stage_order: 3, status: 'in_progress' }, // Incomplete
                { stage_order: 4, status: 'not_started' },
                { stage_order: 5, status: 'not_started' },
                { stage_order: 6, status: 'not_started' },
                { stage_order: 7, status: 'not_started' },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;
      expect(report?.is_draft).toBe(true);
    });

    it('should return is_draft = false when all workflow stages are completed', async () => {
      vi.mocked(usePackageComponents).mockReturnValue({
        data: mockPackageComponents,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const mockFrom = vi.fn((table: string) => {
        if (table === 'test_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'package-1', name: 'Test Package', test_type: 'Hydrostatic', target_date: null },
              error: null,
            }),
          };
        } else if (table === 'field_welds') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: mockFieldWelds,
              error: null,
            }),
          };
        } else if (table === 'package_workflow_stages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { stage_order: 1, status: 'completed' },
                { stage_order: 2, status: 'completed' },
                { stage_order: 3, status: 'completed' },
                { stage_order: 4, status: 'completed' },
                { stage_order: 5, status: 'completed' },
                { stage_order: 6, status: 'completed' },
                { stage_order: 7, status: 'completed' },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;
      expect(report?.is_draft).toBe(false);
    });

    it('should return is_draft = false when stages are completed or skipped', async () => {
      vi.mocked(usePackageComponents).mockReturnValue({
        data: mockPackageComponents,
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      const mockFrom = vi.fn((table: string) => {
        if (table === 'test_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'package-1', name: 'Test Package', test_type: 'Hydrostatic', target_date: null },
              error: null,
            }),
          };
        } else if (table === 'field_welds') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: mockFieldWelds,
              error: null,
            }),
          };
        } else if (table === 'package_workflow_stages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { stage_order: 1, status: 'completed' },
                { stage_order: 2, status: 'completed' },
                { stage_order: 3, status: 'completed' },
                { stage_order: 4, status: 'completed' },
                { stage_order: 5, status: 'skipped' }, // Coating not required
                { stage_order: 6, status: 'skipped' }, // Insulation not required
                { stage_order: 7, status: 'completed' },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { result } = renderHook(
        () => usePackageCompletionReport('package-1', 'proj-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data;
      expect(report?.is_draft).toBe(false);
    });
  });
});
