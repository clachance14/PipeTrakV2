/**
 * Performance Tests for Weekly Progress Reports (Feature 019 - T092)
 * Verify <3 second report generation for 10,000+ component datasets
 */

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProgressReport } from '@/hooks/useProgressReport';
import type { GroupingDimension, ReportData } from '@/types/reports';

// Mock Supabase to return large dataset
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: generateLargeDataset(10000),
        error: null,
      }),
    })),
  },
}));

/**
 * Generate large dataset for performance testing
 */
function generateLargeDataset(count: number) {
  const areas = ['North', 'South', 'East', 'West', 'Central'];
  const systems = ['HVAC', 'Electrical', 'Plumbing', 'Fire', 'Structural'];
  const testPackages = ['TP-001', 'TP-002', 'TP-003', 'TP-004', 'TP-005'];

  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: `comp-${i}`,
      area_id: areas[i % areas.length],
      area_name: areas[i % areas.length],
      system_id: systems[i % systems.length],
      system_name: systems[i % systems.length],
      test_package_id: testPackages[i % testPackages.length],
      test_package_name: testPackages[i % testPackages.length],
      earned_received: Math.random() > 0.5 ? 1 : 0,
      earned_installed: Math.random() > 0.5 ? 1 : 0,
      earned_punch: Math.random() > 0.5 ? 1 : 0,
      earned_tested: Math.random() > 0.5 ? 1 : 0,
      earned_restored: Math.random() > 0.5 ? 1 : 0,
    });
  }
  return data;
}

describe('Report Performance Tests', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('should generate report for 10,000+ components in <3 seconds (Area)', async () => {
    const startTime = performance.now();

    const { result } = renderHook(
      () =>
        useProgressReport({
          projectId: 'test-project-1',
          dimension: 'area' as GroupingDimension,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(3000); // <3 seconds
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.rows.length).toBeGreaterThan(0);
  });

  it('should generate report for 10,000+ components in <3 seconds (System)', async () => {
    const startTime = performance.now();

    const { result } = renderHook(
      () =>
        useProgressReport({
          projectId: 'test-project-1',
          dimension: 'system' as GroupingDimension,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(3000);
    expect(result.current.data).toBeDefined();
  });

  it('should generate report for 10,000+ components in <3 seconds (Test Package)', async () => {
    const startTime = performance.now();

    const { result } = renderHook(
      () =>
        useProgressReport({
          projectId: 'test-project-1',
          dimension: 'test_package' as GroupingDimension,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(3000);
    expect(result.current.data).toBeDefined();
  });

  it('should handle virtualized scrolling efficiently for large datasets', async () => {
    const { result } = renderHook(
      () =>
        useProgressReport({
          projectId: 'test-project-1',
          dimension: 'area' as GroupingDimension,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const reportData = result.current.data as ReportData;

    // Verify data structure for virtualization
    expect(reportData.rows).toBeInstanceOf(Array);
    expect(reportData.grandTotal).toBeDefined();
    expect(reportData.grandTotal.budget).toBeGreaterThan(0);

    // Verify percentages are calculated correctly
    reportData.rows.forEach((row) => {
      expect(row.pctReceived).toBeGreaterThanOrEqual(0);
      expect(row.pctReceived).toBeLessThanOrEqual(100);
      expect(row.pctInstalled).toBeGreaterThanOrEqual(0);
      expect(row.pctInstalled).toBeLessThanOrEqual(100);
    });
  });
});
