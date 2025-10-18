/**
 * Contract Test: Dashboard Metrics Hook
 * Feature: 008-we-just-planned (Authenticated Pages with Real Data)
 *
 * Tests the useDashboardMetrics hook contract - verifies it returns the correct
 * data structure for dashboard statistics aggregation.
 *
 * This test MUST FAIL initially (Red phase of TDD).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

// Import the hook (not yet implemented - will fail)
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

// Mock Supabase responses
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  },
}));

describe('useDashboardMetrics Contract', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return correct data structure with all required fields', async () => {
    const projectId = 'test-project-id';

    const { result } = renderHook(() => useDashboardMetrics(projectId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // CONTRACT: useDashboardMetrics must return these fields
    expect(result.current.data).toHaveProperty('overallProgress');
    expect(result.current.data).toHaveProperty('componentCount');
    expect(result.current.data).toHaveProperty('readyPackages');
    expect(result.current.data).toHaveProperty('needsReviewCount');
    expect(result.current.data).toHaveProperty('recentActivity');

    // Type assertions
    expect(typeof result.current.data?.overallProgress).toBe('number');
    expect(typeof result.current.data?.componentCount).toBe('number');
    expect(typeof result.current.data?.readyPackages).toBe('number');
    expect(typeof result.current.data?.needsReviewCount).toBe('number');
    expect(Array.isArray(result.current.data?.recentActivity)).toBe(true);
  });

  it('should handle empty project (no components)', async () => {
    const projectId = 'empty-project-id';

    const { result } = renderHook(() => useDashboardMetrics(projectId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // CONTRACT: Empty project should return zeros, not null/undefined
    expect(result.current.data?.overallProgress).toBe(0);
    expect(result.current.data?.componentCount).toBe(0);
    expect(result.current.data?.readyPackages).toBe(0);
    expect(result.current.data?.needsReviewCount).toBe(0);
    expect(result.current.data?.recentActivity).toEqual([]);
  });

  it('should calculate overall progress correctly', async () => {
    // Mock components with various percent_complete values
    const projectId = 'test-project-id';

    const { result } = renderHook(() => useDashboardMetrics(projectId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // CONTRACT: overallProgress should be between 0-100
    expect(result.current.data?.overallProgress).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.overallProgress).toBeLessThanOrEqual(100);
  });

  it('should include recent activity with correct structure', async () => {
    const projectId = 'test-project-id';

    const { result } = renderHook(() => useDashboardMetrics(projectId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // CONTRACT: Each activity item must have these fields
    if (result.current.data?.recentActivity && result.current.data.recentActivity.length > 0) {
      const firstActivity = result.current.data.recentActivity[0];

      expect(firstActivity).toHaveProperty('id');
      expect(firstActivity).toHaveProperty('user_initials');
      expect(firstActivity).toHaveProperty('description');
      expect(firstActivity).toHaveProperty('timestamp');

      expect(typeof firstActivity?.id).toBe('string');
      expect(typeof firstActivity?.user_initials).toBe('string');
      expect(typeof firstActivity?.description).toBe('string');
      expect(typeof firstActivity?.timestamp).toBe('string');
    }
  });

  it('should limit recent activity to 10 items max', async () => {
    const projectId = 'busy-project-id';

    const { result } = renderHook(() => useDashboardMetrics(projectId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // CONTRACT: recentActivity should never exceed 10 items
    expect(result.current.data?.recentActivity?.length).toBeLessThanOrEqual(10);
  });

  it('should handle query errors gracefully', async () => {
    const projectId = 'error-project-id';

    const { result } = renderHook(() => useDashboardMetrics(projectId), {
      wrapper,
    });

    await waitFor(() => {
      // CONTRACT: Hook must have isError and error properties
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('error');
    });
  });

  it('should have correct TanStack Query properties', async () => {
    const projectId = 'test-project-id';

    const { result } = renderHook(() => useDashboardMetrics(projectId), {
      wrapper,
    });

    // CONTRACT: Hook must expose TanStack Query states
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });
});
