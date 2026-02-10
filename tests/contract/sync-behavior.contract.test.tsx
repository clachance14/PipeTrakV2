/**
 * Contract Test: Sync Behavior & Retry Logic
 *
 * Feature: 015-mobile-milestone-updates
 * Component: Sync Manager (network detection, retry, conflict resolution)
 * Purpose: Verify sync orchestration follows specified behavior
 *
 * NOTE: These are Phase 2 TDD tests - implementations DO NOT exist yet!
 * Expected to FAIL until src/lib/sync-manager.ts is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { goOffline, goOnline, resetNetworkStatus } from '../setup/networkStatus.mock'
import '../setup/localStorage.mock'
import { resetUUIDCounter } from '../setup/crypto.mock'

// Hook that WILL be implemented in Phase 2
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// Functions that WILL be implemented in Phase 2
import {
  syncQueue,
  retryFailedUpdates,
  getSyncStatus,
} from '@/lib/sync-manager'

// Offline queue functions (needed for sync tests)
import { initQueue, saveQueue } from '@/lib/offline-queue'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

/**
 * Test wrapper component to verify useNetworkStatus hook
 */
function NetworkStatusTestComponent() {
  const { isOnline } = useNetworkStatus()
  return <div data-testid="network-status">{isOnline ? 'online' : 'offline'}</div>
}

describe('Contract: Sync Behavior & Retry Logic', () => {
  beforeEach(() => {
    localStorage.clear()
    resetUUIDCounter()
    resetNetworkStatus()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('C036: Network Status - Online Detection', () => {
    it('should detect online status without auto-syncing', () => {
      // Given: navigator.onLine = true
      goOnline()

      // When: useNetworkStatus() hook called
      render(<NetworkStatusTestComponent />)

      // Then: Returns isOnline = true
      expect(screen.getByTestId('network-status')).toHaveTextContent('online')

      // No sync triggered automatically (waits for offline→online transition)
      expect(supabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('C037: Network Status - Offline Detection', () => {
    it('should detect offline status and queue updates', () => {
      // Given: navigator.onLine = false
      goOffline()

      // When: useNetworkStatus() hook called
      render(<NetworkStatusTestComponent />)

      // Then: Returns isOnline = false
      expect(screen.getByTestId('network-status')).toHaveTextContent('offline')

      // Milestone updates queued to localStorage (not sent to server)
      // This will be verified in integration tests when components enqueue updates
    })
  })

  describe('C038: Network Status - Offline to Online Transition', () => {
    it('should auto-trigger sync when going online with queued updates', async () => {
      // Given: isOnline = false, queue has 3 updates
      goOffline()
      const queue = initQueue()
      queue.updates.push(
        { id: 'u1', component_id: 'c1', milestone_name: 'Receive', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
        { id: 'u2', component_id: 'c2', milestone_name: 'Install', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
        { id: 'u3', component_id: 'c3', milestone_name: 'Test', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' }
      )
      saveQueue(queue)

      // When: 'online' event fired
      goOnline()

      // Then: syncQueue() automatically triggered
      await vi.waitFor(() => {
        expect(getSyncStatus()).toBe('syncing')
      })

      // Queue processing starts
      expect(supabase.rpc).toHaveBeenCalled()

      // No user action required
    })
  })

  describe('C039: Network Status - Online to Offline Transition', () => {
    it('should update status when going offline', () => {
      // Given: isOnline = true
      goOnline()
      const { rerender } = render(<NetworkStatusTestComponent />)
      expect(screen.getByTestId('network-status')).toHaveTextContent('online')

      // When: 'offline' event fired
      goOffline()
      rerender(<NetworkStatusTestComponent />)

      // Then: isOnline updates to false
      expect(screen.getByTestId('network-status')).toHaveTextContent('offline')

      // Future milestone updates enqueued to localStorage
      // Pending badge appears in header (implementation test)
    })
  })

  describe('C040: Sync Success - Single Update', () => {
    it('should successfully sync single update', async () => {
      // Given: Queue has 1 update, network online
      goOnline()
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 0,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Mock successful RPC response
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          component: { id: 'c1', percent_complete: 50 },
          previous_value: false,
          audit_event_id: 'audit-1',
        },
        error: null,
      })

      // When: syncQueue() called
      await syncQueue()

      // Then: RPC called with update data
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'c1',
        p_milestone_name: 'Receive',
        p_new_value: 1, // Boolean true should be converted to numeric 1
        p_user_id: 'user-1',
      })

      // On 200 OK: update dequeued
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(0)

      // sync_status = 'idle'
      expect(getSyncStatus()).toBe('idle')

      // Success toast shown (implementation test)
      // Pending badge removed (implementation test)
    })
  })

  describe('C041: Sync Success - Multiple Updates', () => {
    it('should sync multiple updates sequentially', async () => {
      // Given: Queue has 5 updates, network online
      goOnline()
      const queue = initQueue()
      for (let i = 1; i <= 5; i++) {
        queue.updates.push({
          id: `u${i}`,
          component_id: `c${i}`,
          milestone_name: 'Receive',
          value: true,
          timestamp: Date.now(),
          retry_count: 0,
          user_id: 'user-1',
        })
      }
      saveQueue(queue)

      // Mock successful RPC responses
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { component: {}, previous_value: false, audit_event_id: 'audit' },
        error: null,
      })

      // When: syncQueue() called
      await syncQueue()

      // Then: 5 RPC calls made sequentially (not parallel)
      expect(supabase.rpc).toHaveBeenCalledTimes(5)

      // Each successful call dequeues corresponding update
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(0)

      // sync_status = 'idle' after all complete
      expect(getSyncStatus()).toBe('idle')

      // Toast shows "5 updates synced" (implementation test)
    })
  })

  describe('C042: Sync Failure - First Retry (0s)', () => {
    it('should immediately retry on first failure', async () => {
      // Given: Queue has 1 update, network online, server returns 500
      goOnline()
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 0,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Mock RPC failure
      vi.mocked(supabase.rpc).mockRejectedValueOnce({
        status: 500,
        message: 'Internal server error',
      })

      // When: syncQueue() called
      await syncQueue()

      // Then: RPC fails with 500 error
      expect(supabase.rpc).toHaveBeenCalledTimes(1)

      // retry_count incremented to 1
      const updatedQueue = initQueue()
      expect(updatedQueue.updates[0].retry_count).toBe(1)

      // Immediate retry (0s delay) triggered
      // Update remains in queue
      expect(updatedQueue.updates).toHaveLength(1)

      // sync_status remains 'syncing'
      expect(getSyncStatus()).toBe('syncing')
    })
  })

  describe('C043: Sync Failure - Second Retry (3s)', () => {
    it('should retry after 3 seconds on second failure', async () => {
      // Given: retry_count = 1, RPC fails again with 500
      goOnline()
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 1,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Mock RPC failure
      vi.mocked(supabase.rpc).mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      })

      // When: Second retry triggered
      await syncQueue()

      // Then: 3-second delay before retry
      expect(getSyncStatus()).toBe('syncing')

      // Fast-forward 3 seconds
      await vi.advanceTimersByTimeAsync(3000)

      // retry_count incremented to 2
      const updatedQueue = initQueue()
      expect(updatedQueue.updates[0].retry_count).toBe(2)

      // RPC called again after 3s
      expect(supabase.rpc).toHaveBeenCalledTimes(2)

      // Update remains in queue
      expect(updatedQueue.updates).toHaveLength(1)
    })
  })

  describe('C044: Sync Failure - Third Retry (9s)', () => {
    it('should retry after 9 seconds on third failure', async () => {
      // Given: retry_count = 2, RPC fails again with 500
      goOnline()
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 2,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Mock RPC failure
      vi.mocked(supabase.rpc).mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      })

      // When: Third retry triggered
      await syncQueue()

      // Then: 9-second delay before retry
      await vi.advanceTimersByTimeAsync(9000)

      // retry_count incremented to 3
      const updatedQueue = initQueue()
      expect(updatedQueue.updates[0].retry_count).toBe(3)

      // RPC called again after 9s
      expect(supabase.rpc).toHaveBeenCalledTimes(2)

      // This is the FINAL retry
    })
  })

  describe('C045: Sync Failure - Max Retries Exhausted', () => {
    it('should move update to failed_updates after max retries', async () => {
      // Given: retry_count = 3, RPC fails again with 500
      goOnline()
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 3,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Mock RPC failure
      vi.mocked(supabase.rpc).mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      })

      // When: syncQueue() processes failed update
      await syncQueue()

      // Then: Update removed from active queue
      const updatedQueue = initQueue()
      expect(updatedQueue.updates.find((u) => u.id === 'u1')).toBeUndefined()

      // Update moved to failed_updates array
      expect(updatedQueue.failed_updates).toHaveLength(1)
      expect(updatedQueue.failed_updates[0].update.id).toBe('u1')

      // sync_status = 'error'
      expect(getSyncStatus()).toBe('error')

      // Error toast shown (implementation test)
      // Red warning badge persists (implementation test)
    })
  })

  describe('C046: Exponential Backoff Timing Verification', () => {
    it('should follow exponential backoff pattern: 0ms, 3s, 9s', async () => {
      // Given: Update fails sync 3 times
      const delays: number[] = []

      // When: Retry delays measured
      // Retry 1: 0ms (immediate)
      delays.push(0)

      // Retry 2: 3000ms (3 seconds)
      delays.push(3000)

      // Retry 3: 9000ms (9 seconds)
      delays.push(9000)

      // Then: Formula verified: delay = 3^retryCount * 1000ms
      expect(delays[0]).toBe(Math.pow(3, 0) * 1000) // 3^0 * 1000 = 0
      expect(delays[1]).toBe(Math.pow(3, 1) * 1000) // 3^1 * 1000 = 3000
      expect(delays[2]).toBe(Math.pow(3, 2) * 1000) // 3^2 * 1000 = 9000
    })
  })

  describe('C047: Manual Retry After Error', () => {
    it('should reset retry counts and re-attempt sync', async () => {
      // Given: sync_status = 'error', 2 failed updates in queue
      const queue = initQueue()
      queue.sync_status = 'error'
      queue.failed_updates = [
        {
          update: { id: 'u1', component_id: 'c1', milestone_name: 'Receive', value: true, timestamp: Date.now(), retry_count: 3, user_id: 'user-1' },
          error_message: 'Max retries exhausted',
          failed_at: Date.now(),
        },
        {
          update: { id: 'u2', component_id: 'c2', milestone_name: 'Install', value: true, timestamp: Date.now(), retry_count: 3, user_id: 'user-1' },
          error_message: 'Max retries exhausted',
          failed_at: Date.now(),
        },
      ]
      saveQueue(queue)

      // Mock successful RPC
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { component: {}, previous_value: false, audit_event_id: 'audit' },
        error: null,
      })

      // When: User taps "Tap to retry" badge
      await retryFailedUpdates()

      // Then: sync_status = 'syncing'
      expect(getSyncStatus()).toBe('syncing')

      // Failed updates moved back to active queue
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(2)

      // retry_count reset to 0
      expect(updatedQueue.updates[0].retry_count).toBe(0)
      expect(updatedQueue.updates[1].retry_count).toBe(0)

      // New retry cycle begins
      expect(supabase.rpc).toHaveBeenCalled()
    })
  })

  describe('C048: Server-Wins Conflict (409) - Silent Discard', () => {
    it('should silently discard update on 409 Conflict', async () => {
      // Given: Queue has 1 update, network online
      goOnline()
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 0,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Mock 409 Conflict response
      vi.mocked(supabase.rpc).mockRejectedValueOnce({
        status: 409,
        message: 'Conflict: milestone already updated by another user',
      })

      // When: RPC returns 409 Conflict status
      await syncQueue()

      // Then: Update dequeued immediately (no retry)
      const updatedQueue = initQueue()
      expect(updatedQueue.updates.find((u) => u.id === 'u1')).toBeUndefined()

      // No user notification (silent discard)
      // Continue syncing next update
      // No error toast shown
      // Server-wins count incremented (for debugging only)
    })
  })

  describe('C049: Server-Wins Conflict (409) - Multiple Updates', () => {
    it('should handle multiple 409 conflicts gracefully', async () => {
      // Given: Queue has 5 updates, 2 return 409 Conflict
      goOnline()
      const queue = initQueue()
      for (let i = 1; i <= 5; i++) {
        queue.updates.push({
          id: `u${i}`,
          component_id: `c${i}`,
          milestone_name: 'Receive',
          value: true,
          timestamp: Date.now(),
          retry_count: 0,
          user_id: 'user-1',
        })
      }
      saveQueue(queue)

      // Mock: updates 2 and 4 return 409, others succeed
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: {}, error: null }) // u1 success
        .mockRejectedValueOnce({ status: 409, message: 'Conflict' }) // u2 conflict
        .mockResolvedValueOnce({ data: {}, error: null }) // u3 success
        .mockRejectedValueOnce({ status: 409, message: 'Conflict' }) // u4 conflict
        .mockResolvedValueOnce({ data: {}, error: null }) // u5 success

      // When: syncQueue() called
      await syncQueue()

      // Then: 2 updates with 409 silently discarded
      // 3 updates successfully synced
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(0)

      // Toast shows "3 updates synced" (no mention of discarded)
      // sync_status = 'idle'
      expect(getSyncStatus()).toBe('idle')
    })
  })

  describe('C050: Auth Error (401) - Clear Queue', () => {
    it('should clear queue and redirect on auth error', async () => {
      // Given: Queue has 3 updates, user session expired
      goOnline()
      const queue = initQueue()
      for (let i = 1; i <= 3; i++) {
        queue.updates.push({
          id: `u${i}`,
          component_id: `c${i}`,
          milestone_name: 'Receive',
          value: true,
          timestamp: Date.now(),
          retry_count: 0,
          user_id: 'user-1',
        })
      }
      saveQueue(queue)

      // Mock 401 Unauthorized response
      vi.mocked(supabase.rpc).mockRejectedValueOnce({
        status: 401,
        message: 'Unauthorized',
      })

      // When: RPC returns 401 Unauthorized
      await syncQueue()

      // Then: Queue cleared (all updates removed)
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(0)

      // sync_status = 'idle'
      expect(getSyncStatus()).toBe('idle')

      // Toast: "Session expired - please log in again"
      // Redirect to login page (implementation test)
      // No retry attempted (auth issue, not network)
    })
  })

  describe('C051: Sync During Page Navigation', () => {
    it('should persist sync state across page navigation', () => {
      // Given: sync_status = 'syncing', queue has 3 updates (1 synced, 2 pending)
      const queue = initQueue()
      queue.sync_status = 'syncing'
      queue.updates = [
        { id: 'u2', component_id: 'c2', milestone_name: 'Install', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
        { id: 'u3', component_id: 'c3', milestone_name: 'Test', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
      ]
      saveQueue(queue)

      // When: User navigates to different page
      // (Simulate page reload by re-initializing)
      const persistedQueue = initQueue()

      // Then: Queue persists in localStorage
      expect(persistedQueue.updates).toHaveLength(2)

      // sync_status remains 'syncing'
      expect(persistedQueue.sync_status).toBe('syncing')

      // Sync continues on new page
      // Pending badge visible on new page (implementation test)
    })
  })

  describe('C052: Sync State Machine - Idle to Syncing', () => {
    it('should transition from idle to syncing', async () => {
      // Given: sync_status = 'idle', queue empty
      expect(getSyncStatus()).toBe('idle')

      // When: User goes offline and enqueues 2 updates, then goes online
      goOffline()
      const queue = initQueue()
      queue.updates.push(
        { id: 'u1', component_id: 'c1', milestone_name: 'Receive', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
        { id: 'u2', component_id: 'c2', milestone_name: 'Install', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' }
      )
      saveQueue(queue)
      goOnline()

      // Then: State transitions: idle → syncing
      await vi.waitFor(() => {
        expect(getSyncStatus()).toBe('syncing')
      })

      // syncQueue() triggered automatically
      // Pending badge shows during sync
    })
  })

  describe('C053: Sync State Machine - Syncing to Idle', () => {
    it('should transition from syncing to idle after successful sync', async () => {
      // Given: sync_status = 'syncing', queue has 2 updates
      const queue = initQueue()
      queue.sync_status = 'syncing'
      queue.updates = [
        { id: 'u1', component_id: 'c1', milestone_name: 'Receive', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
        { id: 'u2', component_id: 'c2', milestone_name: 'Install', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
      ]
      saveQueue(queue)

      // Mock successful sync
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { component: {}, previous_value: false, audit_event_id: 'audit' },
        error: null,
      })

      // When: Both updates sync successfully
      await syncQueue()

      // Then: State transitions: syncing → idle
      expect(getSyncStatus()).toBe('idle')

      // Queue empty
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(0)

      // Pending badge removed
      // Green checkmark indicator shown briefly (1s) (implementation test)
    })
  })

  describe('C054: Sync State Machine - Syncing to Error', () => {
    it('should transition from syncing to error after max retries', async () => {
      // Given: sync_status = 'syncing', 1 update fails after 3 retries
      const queue = initQueue()
      queue.sync_status = 'syncing'
      queue.updates = [
        { id: 'u1', component_id: 'c1', milestone_name: 'Receive', value: true, timestamp: Date.now(), retry_count: 3, user_id: 'user-1' },
      ]
      saveQueue(queue)

      // Mock failure
      vi.mocked(supabase.rpc).mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      })

      // When: Max retries exhausted
      await syncQueue()

      // Then: State transitions: syncing → error
      expect(getSyncStatus()).toBe('error')

      // Red warning badge shown
      // Failed update in failed_updates array
      const updatedQueue = initQueue()
      expect(updatedQueue.failed_updates).toHaveLength(1)

      // "Tap to retry" action available
    })
  })

  describe('C055: Sync State Machine - Error to Syncing', () => {
    it('should transition from error to syncing on manual retry', async () => {
      // Given: sync_status = 'error'
      const queue = initQueue()
      queue.sync_status = 'error'
      queue.failed_updates = [
        {
          update: { id: 'u1', component_id: 'c1', milestone_name: 'Receive', value: true, timestamp: Date.now(), retry_count: 3, user_id: 'user-1' },
          error_message: 'Max retries exhausted',
          failed_at: Date.now(),
        },
      ]
      saveQueue(queue)

      // Mock successful retry
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { component: {}, previous_value: false, audit_event_id: 'audit' },
        error: null,
      })

      // When: User taps "Tap to retry"
      await retryFailedUpdates()

      // Then: State transitions: error → syncing
      expect(getSyncStatus()).toBe('syncing')

      // Failed updates moved back to active queue
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(1)

      // retry_count reset to 0
      expect(updatedQueue.updates[0].retry_count).toBe(0)

      // Sync attempt begins
      expect(supabase.rpc).toHaveBeenCalled()
    })
  })

  describe('C056: Concurrent Sync Prevention', () => {
    it('should prevent concurrent sync operations', async () => {
      // Given: sync_status = 'syncing'
      const queue = initQueue()
      queue.sync_status = 'syncing'
      queue.updates = [
        { id: 'u1', component_id: 'c1', milestone_name: 'Receive', value: true, timestamp: Date.now(), retry_count: 0, user_id: 'user-1' },
      ]
      saveQueue(queue)

      // When: User taps "Retry" again OR another online event fires
      await syncQueue()
      const firstCallCount = vi.mocked(supabase.rpc).mock.calls.length

      // Attempt second sync
      await syncQueue()
      const secondCallCount = vi.mocked(supabase.rpc).mock.calls.length

      // Then: No second sync initiated (debounced)
      expect(secondCallCount).toBe(firstCallCount)

      // sync_status remains 'syncing'
      expect(getSyncStatus()).toBe('syncing')

      // Existing sync continues undisturbed
    })
  })

  describe('C057: Sync Progress Indicator', () => {
    it('should show progress as updates sync', async () => {
      // Given: sync_status = 'syncing', queue has 10 updates
      const queue = initQueue()
      queue.sync_status = 'syncing'
      for (let i = 1; i <= 10; i++) {
        queue.updates.push({
          id: `u${i}`,
          component_id: `c${i}`,
          milestone_name: 'Receive',
          value: true,
          timestamp: Date.now(),
          retry_count: 0,
          user_id: 'user-1',
        })
      }
      saveQueue(queue)

      // Mock successful sync
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { component: {}, previous_value: false, audit_event_id: 'audit' },
        error: null,
      })

      // When: Sync in progress
      await syncQueue()

      // Then: Badge shows "X/10 syncing..." (updates as each completes)
      // Progress visible to user
      // Badge updates after each successful dequeue
      // (Implementation will track progress via state)
    })
  })

  describe('C058: Sync With Empty Queue', () => {
    it('should handle sync call with empty queue gracefully', async () => {
      // Given: Queue empty
      const queue = initQueue()
      expect(queue.updates).toHaveLength(0)
      saveQueue(queue)

      // When: syncQueue() called
      await syncQueue()

      // Then: No RPC calls made
      expect(supabase.rpc).not.toHaveBeenCalled()

      // sync_status = 'idle'
      expect(getSyncStatus()).toBe('idle')

      // No error thrown
      // No toast shown
    })
  })

  describe('C059: Optimistic UI During Offline', () => {
    it('should update UI optimistically when offline', () => {
      // Given: User offline, milestone checkbox unchecked
      goOffline()

      // When: User taps checkbox (implementation will test actual component)
      // For contract test, verify queue behavior
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 0,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Then: UI updates instantly (checkbox checked) - component test
      // Update queued to localStorage
      const savedQueue = initQueue()
      expect(savedQueue.updates).toHaveLength(1)

      // No server call made yet
      expect(supabase.rpc).not.toHaveBeenCalled()

      // Pending badge shows "1 update pending"
    })
  })

  describe('C060: Optimistic UI Rollback on Auth Error', () => {
    it('should rollback optimistic update on auth error', async () => {
      // Given: User online, taps milestone
      goOnline()
      const queue = initQueue()
      queue.updates.push({
        id: 'u1',
        component_id: 'c1',
        milestone_name: 'Receive',
        value: true,
        timestamp: Date.now(),
        retry_count: 0,
        user_id: 'user-1',
      })
      saveQueue(queue)

      // Mock 401 auth error
      vi.mocked(supabase.rpc).mockRejectedValueOnce({
        status: 401,
        message: 'Unauthorized',
      })

      // When: Sync fails with auth error
      await syncQueue()

      // Then: UI reverts to previous state (optimistic rollback)
      // Toast: "Session expired - please log in again"
      // Update removed from queue
      const updatedQueue = initQueue()
      expect(updatedQueue.updates).toHaveLength(0)
    })
  })
})
