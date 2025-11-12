import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTemplateChanges } from './useTemplateChanges';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useTemplateChanges', () => {
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

  it('should fetch template changes for a component type', async () => {
    const mockChanges = [
      {
        id: 'change-1',
        project_id: 'project-123',
        component_type: 'Field Weld',
        changed_by: 'user-456',
        old_weights: [{ milestone_name: 'Weld Made', weight: 60 }],
        new_weights: [{ milestone_name: 'Weld Made', weight: 70 }],
        applied_to_existing: true,
        affected_component_count: 25,
        changed_at: '2025-11-11T10:00:00Z',
        users: {
          id: 'user-456',
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    ];

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: mockChanges,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    } as any);

    selectMock.mockReturnValue({ eq: eqMock, order: orderMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

    const { result } = renderHook(
      () => useTemplateChanges('project-123', 'Field Weld'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('project_template_changes');
    expect(selectMock).toHaveBeenCalledWith(
      '*, users:changed_by(id, name, email)'
    );
    expect(eqMock).toHaveBeenCalledWith('project_id', 'project-123');
    expect(eqMock).toHaveBeenCalledWith('component_type', 'Field Weld');
    expect(orderMock).toHaveBeenCalledWith('changed_at', { ascending: false });
    expect(result.current.data).toEqual(mockChanges);
  });

  it('should return empty array when no changes exist', async () => {
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    } as any);

    selectMock.mockReturnValue({ eq: eqMock, order: orderMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

    const { result } = renderHook(
      () => useTemplateChanges('project-123', 'Valve'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should handle database errors', async () => {
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    } as any);

    selectMock.mockReturnValue({ eq: eqMock, order: orderMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

    const { result } = renderHook(
      () => useTemplateChanges('project-123', 'Pipe'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should fetch latest change only when limit is 1', async () => {
    const mockChanges = [
      {
        id: 'change-2',
        project_id: 'project-123',
        component_type: 'Field Weld',
        changed_by: 'user-789',
        old_weights: [{ milestone_name: 'Weld Made', weight: 70 }],
        new_weights: [{ milestone_name: 'Weld Made', weight: 75 }],
        applied_to_existing: false,
        affected_component_count: 0,
        changed_at: '2025-11-11T12:00:00Z',
        users: {
          id: 'user-789',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      },
    ];

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue({
      data: mockChanges,
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
      limit: limitMock,
    } as any);

    selectMock.mockReturnValue({ eq: eqMock, order: orderMock, limit: limitMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock, limit: limitMock });
    orderMock.mockReturnValue({ limit: limitMock });

    const { result } = renderHook(
      () => useTemplateChanges('project-123', 'Field Weld', 1),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(limitMock).toHaveBeenCalledWith(1);
    expect(result.current.data).toEqual(mockChanges);
    expect(result.current.data).toHaveLength(1);
  });

  it('should use correct query key for caching', async () => {
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    } as any);

    selectMock.mockReturnValue({ eq: eqMock, order: orderMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

    const { result } = renderHook(
      () => useTemplateChanges('project-123', 'Spool'),
      { wrapper }
    );

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Query key should be ['templateChanges', projectId, componentType]
    expect(queryClient.getQueryData(['templateChanges', 'project-123', 'Spool'])).toBeDefined();
  });
});
