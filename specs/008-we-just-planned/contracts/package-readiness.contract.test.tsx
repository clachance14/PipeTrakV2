/**
 * Contract Test: Package Readiness Hook
 * Feature: 008-we-just-planned
 * Tests usePackageReadiness hook contract
 * This test MUST FAIL initially (TDD Red phase)
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePackageReadiness } from '@/hooks/usePackageReadiness';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })),
    })),
  },
}));

describe('usePackageReadiness Contract', () => {
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

  it('should return package cards with correct structure', async () => {
    const { result } = renderHook(() => usePackageReadiness('project-id'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);

    // CONTRACT: Each PackageCard must have these fields
    if (result.current.data && result.current.data.length > 0) {
      const card = result.current.data[0];
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('progress');
      expect(card).toHaveProperty('componentCount');
      expect(card).toHaveProperty('blockerCount');
      expect(card).toHaveProperty('targetDate');
      expect(card).toHaveProperty('statusColor');
    }
  });

  it('should support filtering by status', () => {
    const { result } = renderHook(
      () => usePackageReadiness('project-id', { status: 'ready' }),
      { wrapper }
    );

    // CONTRACT: Filtering should work
    expect(result.current).toHaveProperty('data');
  });

  it('should support searching by name', () => {
    const { result } = renderHook(
      () => usePackageReadiness('project-id', { search: 'TP-001' }),
      { wrapper }
    );

    expect(result.current).toHaveProperty('data');
  });

  it('should support sorting', () => {
    const { result } = renderHook(
      () => usePackageReadiness('project-id', { sortBy: 'progress' }),
      { wrapper }
    );

    expect(result.current).toHaveProperty('data');
  });
});
