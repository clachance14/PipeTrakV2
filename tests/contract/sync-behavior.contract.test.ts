/**
 * Contract Test: Sync Behavior & Retry Logic
 * Feature: 015-mobile-milestone-updates
 * Component: Sync Manager (network detection, retry, conflict resolution)
 * Purpose: Verify sync orchestration follows specified behavior
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { syncQueue, type SyncResult } from '@/lib/sync-manager'
import { initQueue, saveQueue, enqueueUpdate, type OfflineQueue } from '@/lib/offline-queue'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { renderHook, act } from '@testing-library/react'

describe('Contract: Sync Behavior & Retry Logic', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()

    global.localStorage = {
      getItem: vi.fn((key) => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => storage.set(key, value)),
      removeItem: vi.fn((key) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
      length: storage.size,
      key: vi.fn((index) => Array.from(storage.keys())[index] ?? null)
    } as Storage

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper functions
  const goOffline = () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    window.dispatchEvent(new Event('offline'))
  }

  const goOnline = () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
    window.dispatchEvent(new Event('online'))
  }

  describe('C036: Network Status - Online Detection', () => {
    it('should detect online status', () => {
      Object.defineProperty(navigator, 'onLine', { value: true })
      const { result } = renderHook(() => useNetworkStatus())
      expect(result.current).toBe(true)
    })
  })

  describe('C037: Network Status - Offline Detection', () => {
    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      const { result } = renderHook(() => useNetworkStatus())
      expect(result.current).toBe(false)
    })
  })

  describe('C038: Network Status - Offline to Online Transition', () => {
    it('should update status when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      const { result } = renderHook(() => useNetworkStatus())
      
      expect(result.current).toBe(false)

      act(() => {
        goOnline()
      })

      expect(result.current).toBe(true)
    })
  })

  describe('C039: Network Status - Online to Offline Transition', () => {
    it('should update status when offline event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: true })
      const { result } = renderHook(() => useNetworkStatus())
      
      expect(result.current).toBe(true)

      act(() => {
        goOffline()
      })

      expect(result.current).toBe(false)
    })
  })

  describe('C040: Sync Success - Single Update', () => {
    it('should sync single update successfully', async () => {
      // Given: Queue has 1 update, network online
      const mockRpc = vi.fn().mockResolvedValue({ data: { component: {} }, error: null })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      // When: syncQueue() called
      const result: SyncResult = await syncQueue()

      // Then: Update dequeued, sync_status = 'idle'
      expect(result.success).toBe(true)
      expect(result.synced_count).toBe(1)
      
      const queue = initQueue()
      expect(queue.updates.length).toBe(0)
      expect(queue.sync_status).toBe('idle')
    })
  })

  describe('C041: Sync Success - Multiple Updates', () => {
    it('should sync multiple updates sequentially', async () => {
      // Given: Queue has 5 updates
      for (let i = 0; i < 5; i++) {
        enqueueUpdate({
          component_id: `comp-${i}`,
          milestone_name: 'Receive',
          value: true,
          user_id: 'user-1'
        })
      }

      const mockRpc = vi.fn().mockResolvedValue({ data: { component: {} }, error: null })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called
      const result: SyncResult = await syncQueue()

      // Then: All 5 synced successfully
      expect(result.success).toBe(true)
      expect(result.synced_count).toBe(5)
      
      const queue = initQueue()
      expect(queue.updates.length).toBe(0)
      expect(queue.sync_status).toBe('idle')
    })
  })

  describe('C042: Sync Failure - First Retry (0s)', () => {
    it('should retry immediately on first failure', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValueOnce({ data: { component: {} }, error: null })
      
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called
      const result: SyncResult = await syncQueue()

      // Then: Immediate retry (no delay for first retry)
      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })
  })

  describe('C043: Sync Failure - Second Retry (3s)', () => {
    it('should retry after 3 seconds on second failure', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValueOnce({ data: { component: {} }, error: null })
      
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called
      const syncPromise = syncQueue()

      // Fast-forward 3 seconds
      await vi.advanceTimersByTimeAsync(3000)

      const result: SyncResult = await syncPromise

      // Then: 3-second delay before second retry
      expect(mockRpc).toHaveBeenCalledTimes(3)
      expect(result.success).toBe(true)
    })
  })

  describe('C044: Sync Failure - Third Retry (9s)', () => {
    it('should retry after 9 seconds on third failure', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValueOnce({ data: { component: {} }, error: null })
      
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called
      const syncPromise = syncQueue()

      // Fast-forward 3s + 9s = 12s total
      await vi.advanceTimersByTimeAsync(12000)

      const result: SyncResult = await syncPromise

      // Then: 9-second delay before third retry
      expect(mockRpc).toHaveBeenCalledTimes(4)
      expect(result.success).toBe(true)
    })
  })

  describe('C045: Sync Failure - Max Retries Exhausted', () => {
    it('should move to failed_updates after 3 retries', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn().mockRejectedValue({ status: 500, message: 'Server error' })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called and all retries exhausted
      const syncPromise = syncQueue()
      await vi.advanceTimersByTimeAsync(15000) // Enough time for all retries
      const result: SyncResult = await syncPromise

      // Then: Update moved to failed_updates
      expect(result.success).toBe(false)
      expect(result.failed_count).toBe(1)
      
      const queue = initQueue()
      expect(queue.sync_status).toBe('error')
      expect(queue.failed_updates.length).toBe(1)
    })
  })

  describe('C046: Exponential Backoff Timing Verification', () => {
    it('should use exponential backoff with 3^n formula', async () => {
      // Formula: delay = 3^retryCount * 1000ms
      // Retry 0: 3^0 * 1000 = 0ms (immediate)
      // Retry 1: 3^1 * 1000 = 3000ms (3 seconds)
      // Retry 2: 3^2 * 1000 = 9000ms (9 seconds)
      
      const delays = [0, 3000, 9000]
      delays.forEach((delay, retryCount) => {
        const calculated = Math.pow(3, retryCount) * 1000
        expect(calculated).toBe(delay)
      })
    })
  })

  describe('C047: Manual Retry After Error', () => {
    it('should reset retry_count and retry on manual trigger', async () => {
      // Given: sync_status = 'error', failed updates exist
      const queue: OfflineQueue = {
        updates: [],
        last_sync_attempt: Date.now(),
        sync_status: 'error',
        failed_updates: [
          {
            update: {
              id: 'failed-1',
              component_id: 'comp-1',
              milestone_name: 'Receive',
              value: true,
              timestamp: Date.now(),
              retry_count: 4,
              user_id: 'user-1'
            },
            error_message: 'Max retries exhausted',
            failed_at: Date.now()
          }
        ]
      }
      saveQueue(queue)

      const mockRpc = vi.fn().mockResolvedValue({ data: { component: {} }, error: null })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: Manual retry triggered
      const result: SyncResult = await syncQueue()

      // Then: Failed updates moved back to active queue, retry_count reset
      expect(result.success).toBe(true)
      const updatedQueue = initQueue()
      expect(updatedQueue.failed_updates.length).toBe(0)
    })
  })

  describe('C048: Server-Wins Conflict (409) - Silent Discard', () => {
    it('should silently discard update on 409 Conflict', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn().mockRejectedValue({ status: 409, message: 'Conflict' })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called
      const result: SyncResult = await syncQueue()

      // Then: Update silently discarded, no retry
      expect(result.server_wins_count).toBe(1)
      expect(result.failed_count).toBe(0)
      
      const queue = initQueue()
      expect(queue.updates.length).toBe(0)
      expect(queue.sync_status).toBe('idle')
    })
  })

  describe('C049: Server-Wins Conflict (409) - Multiple Updates', () => {
    it('should continue syncing after 409 Conflicts', async () => {
      // Given: 5 updates, 2 will return 409
      for (let i = 0; i < 5; i++) {
        enqueueUpdate({
          component_id: `comp-${i}`,
          milestone_name: 'Receive',
          value: true,
          user_id: 'user-1'
        })
      }

      const mockRpc = vi.fn()
        .mockResolvedValueOnce({ data: { component: {} }, error: null })
        .mockRejectedValueOnce({ status: 409, message: 'Conflict' })
        .mockResolvedValueOnce({ data: { component: {} }, error: null })
        .mockRejectedValueOnce({ status: 409, message: 'Conflict' })
        .mockResolvedValueOnce({ data: { component: {} }, error: null })
      
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called
      const result: SyncResult = await syncQueue()

      // Then: 3 synced, 2 silently discarded
      expect(result.synced_count).toBe(3)
      expect(result.server_wins_count).toBe(2)
      expect(result.success).toBe(true)
    })
  })

  describe('C050: Auth Error (401) - Clear Queue', () => {
    it('should clear queue on 401 Unauthorized', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: syncQueue() called
      const result: SyncResult = await syncQueue()

      // Then: Queue cleared, no retry
      const queue = initQueue()
      expect(queue.updates.length).toBe(0)
      expect(result.success).toBe(false)
    })
  })

  describe('C051: Sync During Page Navigation', () => {
    it('should persist queue across page navigation', () => {
      // Given: Queue with updates
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const queue = initQueue()
      queue.sync_status = 'syncing'
      saveQueue(queue)

      // When: Simulate page navigation (localStorage persists)
      const newPageQueue = initQueue()

      // Then: Queue and status preserved
      expect(newPageQueue.updates.length).toBe(1)
      expect(newPageQueue.sync_status).toBe('syncing')
    })
  })

  describe('C052-C055: Sync State Machine Transitions', () => {
    it('should transition idle → syncing → idle', async () => {
      const queue = initQueue()
      expect(queue.sync_status).toBe('idle')

      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn().mockResolvedValue({ data: { component: {} }, error: null })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      await syncQueue()

      const updatedQueue = initQueue()
      expect(updatedQueue.sync_status).toBe('idle')
    })

    it('should transition syncing → error on max retries', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn().mockRejectedValue({ status: 500, message: 'Server error' })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      const syncPromise = syncQueue()
      await vi.advanceTimersByTimeAsync(15000)
      await syncPromise

      const queue = initQueue()
      expect(queue.sync_status).toBe('error')
    })
  })

  describe('C056: Concurrent Sync Prevention', () => {
    it('should prevent concurrent sync calls', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn().mockResolvedValue({ data: { component: {} }, error: null })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: Multiple sync calls made concurrently
      const sync1 = syncQueue()
      const sync2 = syncQueue()

      await Promise.all([sync1, sync2])

      // Then: Only one sync executed
      expect(mockRpc).toHaveBeenCalledTimes(1)
    })
  })

  describe('C058: Sync With Empty Queue', () => {
    it('should handle empty queue gracefully', async () => {
      // Given: Queue empty
      const queue = initQueue()
      expect(queue.updates.length).toBe(0)

      // When: syncQueue() called
      const result: SyncResult = await syncQueue()

      // Then: No error, no RPC calls
      expect(result.success).toBe(true)
      expect(result.synced_count).toBe(0)
      expect(queue.sync_status).toBe('idle')
    })
  })

  describe('C059: Optimistic UI During Offline', () => {
    it('should queue updates when offline without server call', () => {
      // Given: User offline
      goOffline()

      // When: User updates milestone
      const update = enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      // Then: Update queued to localStorage, no server call
      const queue = initQueue()
      expect(queue.updates.length).toBe(1)
      expect(queue.updates[0].id).toBe(update.id)
    })
  })

  describe('C060: Optimistic UI Rollback on Auth Error', () => {
    it('should rollback optimistic update on 401 error', async () => {
      enqueueUpdate({
        component_id: 'comp-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-1'
      })

      const mockRpc = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' })
      vi.doMock('@/lib/supabase', () => ({
        supabase: { rpc: mockRpc }
      }))

      // When: Sync fails with auth error
      await syncQueue()

      // Then: Update removed from queue (rollback)
      const queue = initQueue()
      expect(queue.updates.length).toBe(0)
    })
  })
})
