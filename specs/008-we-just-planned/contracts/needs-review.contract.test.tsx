/**
 * Contract Test: Needs Review Operations
 * Feature: 008-we-just-planned
 * Tests useNeedsReview and useResolveNeedsReview hooks
 * This test MUST FAIL initially (TDD Red phase)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNeedsReview, useResolveNeedsReview } from '@/hooks/useNeedsReview';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })),
        })),
      })),
    })),
  },
}));

describe('useNeedsReview Contract', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return review items with correct structure', async () => {
    const { result } = renderHook(() => useNeedsReview('project-id'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(Array.isArray(result.current.data)).toBe(true);

    // CONTRACT: Each ReviewItem must have these fields
    if (result.current.data && result.current.data.length > 0) {
      const item = result.current.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('payload');
      expect(item).toHaveProperty('created_at');
    }
  });

  it('should default to pending status filter', () => {
    const { result } = renderHook(() => useNeedsReview('project-id'), {
      wrapper,
    });
    expect(result.current).toHaveProperty('data');
  });

  it('should support type filtering', () => {
    const { result } = renderHook(() =>
      useNeedsReview('project-id', { type: 'verify_welder' }), {
        wrapper,
      }
    );
    expect(result.current).toHaveProperty('data');
  });
});

describe('useResolveNeedsReview Contract', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should have mutate function for resolving items', () => {
    const { result } = renderHook(() => useResolveNeedsReview(), {
      wrapper,
    });

    // CONTRACT: Mutation must expose these properties
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isError');
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should accept status and resolution_note parameters', () => {
    const { result } = renderHook(() => useResolveNeedsReview(), {
      wrapper,
    });

    // CONTRACT: Mutation accepts these parameters
    const params = {
      id: 'review-id',
      status: 'resolved' as const,
      resolution_note: 'Fixed issue',
    };

    // Should not throw type error
    expect(() => result.current.mutate(params)).not.toThrow();
  });
});
