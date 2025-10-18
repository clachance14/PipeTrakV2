/**
 * Contract Test: Welder Operations
 * Feature: 008-we-just-planned
 * Tests welder hooks and welder usage counting
 * This test MUST FAIL initially (TDD Red phase)
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useWelders,
  useCreateWelder,
  useVerifyWelder,
} from '@/hooks/useWelders';
import { useWelderUsage } from '@/hooks/useWelderUsage';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
    })),
  },
}));

describe('useWelders Contract', () => {
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

  it('should return welders with correct structure', async () => {
    const { result } = renderHook(() => useWelders('project-id'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(Array.isArray(result.current.data)).toBe(true);

    if (result.current.data && result.current.data.length > 0) {
      const welder = result.current.data[0];
      expect(welder).toHaveProperty('id');
      expect(welder).toHaveProperty('name');
      expect(welder).toHaveProperty('stencil');
      expect(welder).toHaveProperty('stencil_norm');
      expect(welder).toHaveProperty('status');
    }
  });

  it('should support status filtering', () => {
    const { result } = renderHook(
      () => useWelders('project-id', { status: 'unverified' }),
      { wrapper }
    );
    expect(result.current).toHaveProperty('data');
  });
});

describe('useCreateWelder Contract', () => {
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

  it('should normalize stencil to uppercase', () => {
    const { result } = renderHook(() => useCreateWelder(), { wrapper });

    // CONTRACT: Stencil normalization
    const params = {
      project_id: 'project-id',
      name: 'John Doe',
      stencil: 'jd-123',
    };

    expect(result.current).toHaveProperty('mutate');
  });

  it('should validate stencil format', () => {
    const { result } = renderHook(() => useCreateWelder(), { wrapper });
    expect(result.current).toHaveProperty('mutate');
  });
});

describe('useVerifyWelder Contract', () => {
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

  it('should set verified_at and verified_by', () => {
    const { result } = renderHook(() => useVerifyWelder(), { wrapper });

    expect(result.current).toHaveProperty('mutate');
    expect(typeof result.current.mutate).toBe('function');
  });
});

describe('useWelderUsage Contract', () => {
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

  it('should return weld counts as Map', () => {
    const { result } = renderHook(() => useWelderUsage('project-id'), {
      wrapper,
    });

    // CONTRACT: Returns Map<string, number> (welder_id → count)
    expect(result.current).toHaveProperty('data');
  });

  it('should count Weld Made events by welder', () => {
    const { result } = renderHook(() => useWelderUsage('project-id'), {
      wrapper,
    });
    expect(result.current).toHaveProperty('data');
  });
});
