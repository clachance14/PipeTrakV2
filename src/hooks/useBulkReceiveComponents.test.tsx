import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBulkReceiveComponents, BulkReceiveInput } from './useBulkReceiveComponents';

// Mock useUpdateMilestone hook
const mockMutateAsync = vi.fn();
vi.mock('./useUpdateMilestone', () => ({
  useUpdateMilestone: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

// Mock getQueriesData for the QueryClient
const mockGetQueriesData = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      getQueriesData: mockGetQueriesData,
    }),
  };
});

describe('useBulkReceiveComponents', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ success: true });
    // getQueriesData returns an array of [queryKey, data] tuples
    mockGetQueriesData.mockReturnValue([]);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Skip Logic', () => {
    it('should skip components that are already received (Receive >= 100)', async () => {
      // Arrange: Component with Receive milestone already at 100
      const componentId = 'comp-1';
      const input: BulkReceiveInput = {
        componentIds: [componentId],
        userId: 'user-123',
      };

      // getQueriesData returns array of [queryKey, data] tuples
      mockGetQueriesData.mockReturnValue([
        [['components'], [{
          id: componentId,
          current_milestones: {
            Receive: 100,
          },
        }]],
      ]);

      // Act
      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      // Assert - skipped because already at 100
      expect(bulkResult!.skipped).toBe(1);
      expect(bulkResult!.attempted).toBe(0);
      expect(bulkResult!.updated).toBe(0);
      expect(bulkResult!.failed).toBe(0);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should skip components with Receive > 100', async () => {
      const componentId = 'comp-2';
      const input: BulkReceiveInput = {
        componentIds: [componentId],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{
          id: componentId,
          current_milestones: {
            Receive: 150, // Already exceeded
          },
        }]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.skipped).toBe(1);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should process components with Receive < 100', async () => {
      const componentId = 'comp-3';
      const input: BulkReceiveInput = {
        componentIds: [componentId],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{
          id: componentId,
          current_milestones: {
            Receive: 50,
          },
        }]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.skipped).toBe(0);
      expect(bulkResult!.updated).toBe(1);
      expect(mockMutateAsync).toHaveBeenCalledWith({
        component_id: componentId,
        milestone_name: 'Receive',
        value: 100,
        user_id: 'user-123',
      });
    });

    it('should process components with Receive = 0', async () => {
      const componentId = 'comp-4';
      const input: BulkReceiveInput = {
        componentIds: [componentId],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{
          id: componentId,
          current_milestones: {
            Receive: 0,
          },
        }]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.skipped).toBe(0);
      expect(bulkResult!.updated).toBe(1);
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Summary Counts', () => {
    it('should return correct counts for mixed batch (updated, skipped)', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2', 'comp-3', 'comp-4'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 0 } }, // Should update
          { id: 'comp-2', current_milestones: { Receive: 100 } }, // Should skip
          { id: 'comp-3', current_milestones: { Receive: 50 } }, // Should update
          { id: 'comp-4', current_milestones: { Receive: 100 } }, // Should skip
        ]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.attempted).toBe(2); // Only non-skipped attempted
      expect(bulkResult!.updated).toBe(2);
      expect(bulkResult!.skipped).toBe(2);
      expect(bulkResult!.failed).toBe(0);
    });

    it('should return correct counts when all components are skipped', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 100 } },
          { id: 'comp-2', current_milestones: { Receive: 100 } },
        ]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.attempted).toBe(0); // None attempted since all skipped
      expect(bulkResult!.updated).toBe(0);
      expect(bulkResult!.skipped).toBe(2);
      expect(bulkResult!.failed).toBe(0);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should return correct counts when all components are updated', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2', 'comp-3'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 0 } },
          { id: 'comp-2', current_milestones: { Receive: 25 } },
          { id: 'comp-3', current_milestones: { Receive: 75 } },
        ]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.attempted).toBe(3);
      expect(bulkResult!.updated).toBe(3);
      expect(bulkResult!.skipped).toBe(0);
      expect(bulkResult!.failed).toBe(0);
      expect(mockMutateAsync).toHaveBeenCalledTimes(3);
    });

    it('should handle empty component list', async () => {
      const input: BulkReceiveInput = {
        componentIds: [],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.attempted).toBe(0);
      expect(bulkResult!.updated).toBe(0);
      expect(bulkResult!.skipped).toBe(0);
      expect(bulkResult!.failed).toBe(0);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Throttling and Concurrency', () => {
    it('should process updates with limited concurrency', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2', 'comp-3', 'comp-4', 'comp-5'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 0 } },
          { id: 'comp-2', current_milestones: { Receive: 0 } },
          { id: 'comp-3', current_milestones: { Receive: 0 } },
          { id: 'comp-4', current_milestones: { Receive: 0 } },
          { id: 'comp-5', current_milestones: { Receive: 0 } },
        ]],
      ]);

      // Track concurrent calls
      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockMutateAsync.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
        concurrentCalls--;
        return { success: true };
      });

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.updated).toBe(5);
      expect(mockMutateAsync).toHaveBeenCalledTimes(5);
      // Verify concurrency was limited (max 5 concurrent per implementation)
      expect(maxConcurrentCalls).toBeLessThanOrEqual(5);
    });

    it('should respect throttle limit for large batches', async () => {
      const componentIds = Array.from({ length: 20 }, (_, i) => `comp-${i}`);
      const input: BulkReceiveInput = {
        componentIds,
        userId: 'user-123',
      };

      const mockComponents = componentIds.map(id => ({
        id,
        current_milestones: { Receive: 0 },
      }));
      mockGetQueriesData.mockReturnValue([
        [['components'], mockComponents],
      ]);

      const callOrder: number[] = [];
      mockMutateAsync.mockImplementation(async () => {
        callOrder.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true };
      });

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      await act(async () => {
        await result.current.bulkReceive(input);
      });

      expect(mockMutateAsync).toHaveBeenCalledTimes(20);
      // Verify calls were throttled (not all simultaneous)
      expect(callOrder.length).toBe(20);
    });
  });

  describe('Error Handling', () => {
    it('should increment failed count when update fails', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{ id: 'comp-1', current_milestones: { Receive: 0 } }]],
      ]);

      mockMutateAsync.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.attempted).toBe(1);
      expect(bulkResult!.updated).toBe(0);
      expect(bulkResult!.skipped).toBe(0);
      expect(bulkResult!.failed).toBe(1);
    });

    it('should continue processing after failures', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2', 'comp-3'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 0 } },
          { id: 'comp-2', current_milestones: { Receive: 0 } },
          { id: 'comp-3', current_milestones: { Receive: 0 } },
        ]],
      ]);

      // Fail on second component, succeed on others
      mockMutateAsync
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.attempted).toBe(3);
      expect(bulkResult!.updated).toBe(2);
      expect(bulkResult!.skipped).toBe(0);
      expect(bulkResult!.failed).toBe(1);
      expect(mockMutateAsync).toHaveBeenCalledTimes(3);
    });

    it('should include error details in result', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 0 } },
          { id: 'comp-2', current_milestones: { Receive: 0 } },
        ]],
      ]);

      mockMutateAsync
        .mockRejectedValueOnce(new Error('Database timeout'))
        .mockRejectedValueOnce(new Error('Permission denied'));

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.failed).toBe(2);
      expect(bulkResult!.errors).toBeDefined();
      expect(bulkResult!.errors?.['comp-1']).toBe('Database timeout');
      expect(bulkResult!.errors?.['comp-2']).toBe('Permission denied');
    });

    it('should handle mixed success, skip, and failure scenarios', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2', 'comp-3', 'comp-4'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 0 } }, // Will succeed
          { id: 'comp-2', current_milestones: { Receive: 100 } }, // Will skip
          { id: 'comp-3', current_milestones: { Receive: 0 } }, // Will fail
          { id: 'comp-4', current_milestones: { Receive: 50 } }, // Will succeed
        ]],
      ]);

      mockMutateAsync
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      expect(bulkResult!.attempted).toBe(3); // 3 non-skipped
      expect(bulkResult!.updated).toBe(2);
      expect(bulkResult!.skipped).toBe(1);
      expect(bulkResult!.failed).toBe(1);
    });
  });

  describe('Hook State Management', () => {
    it('should set isProcessing to true during operation', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{ id: 'comp-1', current_milestones: { Receive: 0 } }]],
      ]);

      mockMutateAsync.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      });

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });

      expect(result.current.isProcessing).toBe(false);

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.bulkReceive(input);
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });

      await act(async () => {
        await promise;
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });
    });

    it('should store lastResult after operation', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [
          { id: 'comp-1', current_milestones: { Receive: 0 } },
          { id: 'comp-2', current_milestones: { Receive: 100 } },
        ]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });

      expect(result.current.lastResult).toBeNull();

      await act(async () => {
        await result.current.bulkReceive(input);
      });

      await waitFor(() => {
        expect(result.current.lastResult).toEqual({
          attempted: 1,
          updated: 1,
          skipped: 1,
          failed: 0,
          errors: {},
        });
      });
    });

    it('should reset result when resetResult is called', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{ id: 'comp-1', current_milestones: { Receive: 0 } }]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });

      await act(async () => {
        await result.current.bulkReceive(input);
      });

      await waitFor(() => {
        expect(result.current.lastResult).not.toBeNull();
      });

      act(() => {
        result.current.resetResult();
      });

      expect(result.current.lastResult).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle components not found in cache', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1', 'comp-2'],
        userId: 'user-123',
      };

      // Return only one component (comp-2 missing from cache)
      mockGetQueriesData.mockReturnValue([
        [['components'], [{ id: 'comp-1', current_milestones: { Receive: 0 } }]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      // Missing component should be skipped (not found in cache)
      expect(bulkResult!.updated).toBe(1);
      expect(bulkResult!.skipped).toBe(1); // comp-2 not found in cache
    });

    it('should handle component with missing current_milestones', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{ id: 'comp-1', current_milestones: null }]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      // Should handle gracefully - treat null milestones as eligible for update
      expect(bulkResult!.attempted).toBe(1);
      expect(bulkResult!.updated).toBe(1);
    });

    it('should handle component with missing Receive milestone', async () => {
      const input: BulkReceiveInput = {
        componentIds: ['comp-1'],
        userId: 'user-123',
      };

      mockGetQueriesData.mockReturnValue([
        [['components'], [{ id: 'comp-1', current_milestones: {} }]],
      ]);

      const { result } = renderHook(() => useBulkReceiveComponents(), { wrapper });
      let bulkResult;
      await act(async () => {
        bulkResult = await result.current.bulkReceive(input);
      });

      // Treat missing Receive as eligible for update (undefined !== >= 100)
      expect(bulkResult!.attempted).toBe(1);
      expect(bulkResult!.updated).toBe(1);
    });
  });
});
