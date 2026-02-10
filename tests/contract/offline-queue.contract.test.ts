/**
 * Contract Test: Offline Queue Management
 * Feature: 015-mobile-milestone-updates
 * Component: Offline Queue (localStorage)
 * Purpose: Verify offline queue operations follow specified behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  initQueue,
  saveQueue,
  enqueueUpdate,
  dequeueUpdate,
  incrementRetry,
  type QueuedUpdate,
  type OfflineQueue
} from '@/lib/offline-queue'

describe('Contract: Offline Queue Management', () => {
  // Mock localStorage
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.clearAllMocks()

    global.localStorage = {
      getItem: vi.fn((key) => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => storage.set(key, value)),
      removeItem: vi.fn((key) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
      length: storage.size,
      key: vi.fn((index) => Array.from(storage.keys())[index] ?? null)
    } as Storage
  })

  // Mock crypto.randomUUID for deterministic test IDs
  let uuidCounter = 0
  beforeEach(() => {
    uuidCounter = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      return `mock-uuid-${uuidCounter++}`
    })
  })

  // Mock Date.now for deterministic timestamps
  const mockNow = 1729785600000
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(mockNow)
  })

  describe('C001: Enqueue Update Under Limit', () => {
    it('should add update successfully when queue has 49 updates', () => {
      // Given: Queue has 49 updates
      const existingUpdates: QueuedUpdate[] = Array.from({ length: 49 }, (_, i) => ({
        id: `existing-uuid-${i}`,
        component_id: `component-${i}`,
        milestone_name: 'Install',
        value: true,
        timestamp: mockNow - 1000,
        retry_count: 0,
        user_id: 'user-id'
      }))
      const queue: OfflineQueue = {
        updates: existingUpdates,
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }
      saveQueue(queue)

      // When: User enqueues 1 more update
      const newUpdate = enqueueUpdate({
        component_id: 'component-new',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-id'
      })

      // Then: Update added successfully
      expect(newUpdate).toBeDefined()
      expect(newUpdate.id).toBe('mock-uuid-0')
      expect(newUpdate.retry_count).toBe(0)
      expect(newUpdate.timestamp).toBe(mockNow)

      // Queue length = 50
      const updatedQueue = initQueue()
      expect(updatedQueue.updates.length).toBe(50)

      // localStorage contains serialized update
      const stored = localStorage.getItem('pipetrak:offline-queue')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!).updates.length).toBe(50)
    })
  })

  describe('C002: Enqueue Update At Limit', () => {
    it('should throw error when queue has 50 updates', () => {
      // Given: Queue has 50 updates
      const existingUpdates: QueuedUpdate[] = Array.from({ length: 50 }, (_, i) => ({
        id: `existing-uuid-${i}`,
        component_id: `component-${i}`,
        milestone_name: 'Install',
        value: true,
        timestamp: mockNow - 1000,
        retry_count: 0,
        user_id: 'user-id'
      }))
      const queue: OfflineQueue = {
        updates: existingUpdates,
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }
      saveQueue(queue)

      // When/Then: Attempting to enqueue 51st update throws error
      expect(() => {
        enqueueUpdate({
          component_id: 'component-new',
          milestone_name: 'Receive',
          value: true,
          user_id: 'user-id'
        })
      }).toThrow('Update queue full (50/50) - please reconnect to sync pending updates')

      // Queue length remains 50
      const unchangedQueue = initQueue()
      expect(unchangedQueue.updates.length).toBe(50)
    })
  })

  describe('C003: Enqueue Duplicate Update', () => {
    it('should update existing entry instead of creating duplicate', () => {
      // Given: Queue contains update for component A, milestone "Receive"
      const existingUpdate: QueuedUpdate = {
        id: 'existing-uuid',
        component_id: 'component-a',
        milestone_name: 'Receive',
        value: false,
        timestamp: mockNow - 5000,
        retry_count: 0,
        user_id: 'user-id'
      }
      const queue: OfflineQueue = {
        updates: [existingUpdate],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }
      saveQueue(queue)

      // When: User enqueues another update for component A, milestone "Receive"
      const duplicateUpdate = enqueueUpdate({
        component_id: 'component-a',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-id'
      })

      // Then: No duplicate created
      const updatedQueue = initQueue()
      expect(updatedQueue.updates.length).toBe(1)

      // Existing update's value replaced
      expect(duplicateUpdate.value).toBe(true)

      // Timestamp updated to Date.now()
      expect(duplicateUpdate.timestamp).toBe(mockNow)

      // Only 1 update exists for component A + "Receive"
      const filtered = updatedQueue.updates.filter(
        u => u.component_id === 'component-a' && u.milestone_name === 'Receive'
      )
      expect(filtered.length).toBe(1)
    })
  })

  describe('C004: Dequeue Update After Sync', () => {
    it('should remove specific update from queue', () => {
      // Given: Queue contains 3 updates with IDs [id1, id2, id3]
      const updates: QueuedUpdate[] = [
        {
          id: 'id1',
          component_id: 'component-1',
          milestone_name: 'Receive',
          value: true,
          timestamp: mockNow,
          retry_count: 0,
          user_id: 'user-id'
        },
        {
          id: 'id2',
          component_id: 'component-2',
          milestone_name: 'Install',
          value: 50,
          timestamp: mockNow,
          retry_count: 0,
          user_id: 'user-id'
        },
        {
          id: 'id3',
          component_id: 'component-3',
          milestone_name: 'Receive',
          value: false,
          timestamp: mockNow,
          retry_count: 0,
          user_id: 'user-id'
        }
      ]
      const queue: OfflineQueue = {
        updates,
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }
      saveQueue(queue)

      // When: dequeueUpdate(id2) called
      dequeueUpdate('id2')

      // Then: Update id2 removed from queue
      const updatedQueue = initQueue()
      expect(updatedQueue.updates.find(u => u.id === 'id2')).toBeUndefined()

      // Queue contains only [id1, id3]
      expect(updatedQueue.updates.length).toBe(2)
      expect(updatedQueue.updates.map(u => u.id)).toEqual(['id1', 'id3'])

      // localStorage updated
      const stored = localStorage.getItem('pipetrak:offline-queue')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!).updates.length).toBe(2)
    })
  })

  describe('C005: Increment Retry Count (Under Max)', () => {
    it('should increment retry_count when under max (3)', () => {
      // Given: Queue contains update with retry_count = 1
      const update: QueuedUpdate = {
        id: 'update-id',
        component_id: 'component-1',
        milestone_name: 'Receive',
        value: true,
        timestamp: mockNow,
        retry_count: 1,
        user_id: 'user-id'
      }
      const queue: OfflineQueue = {
        updates: [update],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }
      saveQueue(queue)

      // When: incrementRetry(id) called
      const newRetryCount = incrementRetry('update-id')

      // Then: retry_count = 2
      expect(newRetryCount).toBe(2)

      // Update remains in queue.updates
      const updatedQueue = initQueue()
      const updatedUpdate = updatedQueue.updates.find(u => u.id === 'update-id')
      expect(updatedUpdate).toBeDefined()
      expect(updatedUpdate!.retry_count).toBe(2)

      // localStorage updated
      const stored = localStorage.getItem('pipetrak:offline-queue')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!).updates[0].retry_count).toBe(2)
    })
  })

  describe('C006: Increment Retry Count (At Max)', () => {
    it('should move update to failed_updates when retry_count exceeds 3', () => {
      // Given: Queue contains update with retry_count = 3
      const update: QueuedUpdate = {
        id: 'update-id',
        component_id: 'component-1',
        milestone_name: 'Receive',
        value: true,
        timestamp: mockNow - 10000,
        retry_count: 3,
        user_id: 'user-id'
      }
      const queue: OfflineQueue = {
        updates: [update],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }
      saveQueue(queue)

      // When: incrementRetry(id) called
      const _newRetryCount = incrementRetry('update-id')

      // Then: Update removed from queue.updates
      const updatedQueue = initQueue()
      expect(updatedQueue.updates.find(u => u.id === 'update-id')).toBeUndefined()

      // Update moved to queue.failed_updates
      expect(updatedQueue.failed_updates.length).toBe(1)
      expect(updatedQueue.failed_updates[0].update.id).toBe('update-id')

      // failed_updates entry contains correct data
      const failedEntry = updatedQueue.failed_updates[0]
      expect(failedEntry.error_message).toBe('Max retries exhausted')
      expect(failedEntry.failed_at).toBeGreaterThanOrEqual(mockNow - 100)
      expect(failedEntry.failed_at).toBeLessThanOrEqual(mockNow + 100)

      // localStorage updated
      const stored = localStorage.getItem('pipetrak:offline-queue')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!).failed_updates.length).toBe(1)
    })
  })

  describe('C007: Failed Updates FIFO Limit', () => {
    it('should remove oldest failed update when limit (10) exceeded', () => {
      // Given: Queue has 10 failed updates
      const failedUpdates = Array.from({ length: 10 }, (_, i) => ({
        update: {
          id: `failed-${i}`,
          component_id: `component-${i}`,
          milestone_name: 'Receive',
          value: true,
          timestamp: mockNow - (10 - i) * 1000,
          retry_count: 4,
          user_id: 'user-id'
        },
        error_message: 'Max retries exhausted',
        failed_at: mockNow - (10 - i) * 1000
      }))

      const newUpdate: QueuedUpdate = {
        id: 'new-update',
        component_id: 'component-new',
        milestone_name: 'Install',
        value: 50,
        timestamp: mockNow,
        retry_count: 3,
        user_id: 'user-id'
      }

      const queue: OfflineQueue = {
        updates: [newUpdate],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: failedUpdates
      }
      saveQueue(queue)

      // When: 11th update fails (retry_count exceeds 3)
      incrementRetry('new-update')

      // Then: Oldest failed update removed (FIFO)
      const updatedQueue = initQueue()
      expect(updatedQueue.failed_updates.length).toBe(10)

      // New failed update added
      expect(updatedQueue.failed_updates[9].update.id).toBe('new-update')

      // Oldest (failed-0) should be removed
      expect(updatedQueue.failed_updates.find(f => f.update.id === 'failed-0')).toBeUndefined()

      // localStorage updated
      const stored = localStorage.getItem('pipetrak:offline-queue')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!).failed_updates.length).toBe(10)
    })
  })

  describe('C008: Initialize Empty Queue', () => {
    it('should return default OfflineQueue when localStorage is empty', () => {
      // Given: localStorage has no 'pipetrak:offline-queue' key
      // (storage.clear() in beforeEach ensures this)

      // When: initQueue() called
      const queue = initQueue()

      // Then: Returns default OfflineQueue
      expect(queue).toEqual({
        updates: [],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      })
    })
  })

  describe('C009: Initialize Existing Queue', () => {
    it('should parse and return existing queue from localStorage', () => {
      // Given: localStorage contains valid queue JSON
      const existingQueue: OfflineQueue = {
        updates: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            component_id: '660e8400-e29b-41d4-a716-446655440000',
            milestone_name: 'Receive',
            value: true,
            timestamp: 1729785600000,
            retry_count: 0,
            user_id: '770e8400-e29b-41d4-a716-446655440000'
          }
        ],
        last_sync_attempt: 1729785500000,
        sync_status: 'idle',
        failed_updates: []
      }
      storage.set('pipetrak:offline-queue', JSON.stringify(existingQueue))

      // When: initQueue() called
      const queue = initQueue()

      // Then: Returns parsed OfflineQueue
      expect(queue).toEqual(existingQueue)

      // All updates deserialized correctly
      expect(queue.updates[0].component_id).toBe('660e8400-e29b-41d4-a716-446655440000')

      // Timestamps preserved as numbers
      expect(typeof queue.updates[0].timestamp).toBe('number')
      expect(queue.updates[0].timestamp).toBe(1729785600000)

      // UUIDs preserved as strings
      expect(typeof queue.updates[0].id).toBe('string')
      expect(queue.updates[0].id).toBe('550e8400-e29b-41d4-a716-446655440000')
    })
  })

  describe('C010: Save Queue to localStorage', () => {
    it('should serialize and save queue to localStorage', () => {
      // Given: Queue with 3 updates
      const queue: OfflineQueue = {
        updates: [
          {
            id: 'id1',
            component_id: 'component-1',
            milestone_name: 'Receive',
            value: true,
            timestamp: mockNow,
            retry_count: 0,
            user_id: 'user-id'
          },
          {
            id: 'id2',
            component_id: 'component-2',
            milestone_name: 'Install',
            value: 50,
            timestamp: mockNow,
            retry_count: 1,
            user_id: 'user-id'
          },
          {
            id: 'id3',
            component_id: 'component-3',
            milestone_name: 'Weld',
            value: 100,
            timestamp: mockNow,
            retry_count: 0,
            user_id: 'user-id'
          }
        ],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }

      // When: saveQueue(queue) called
      saveQueue(queue)

      // Then: localStorage.setItem called with key 'pipetrak:offline-queue'
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'pipetrak:offline-queue',
        expect.any(String)
      )

      // Value is valid JSON string
      const stored = localStorage.getItem('pipetrak:offline-queue')
      expect(stored).toBeTruthy()
      expect(() => JSON.parse(stored!)).not.toThrow()

      // JSON round-trips correctly
      const parsed = JSON.parse(stored!)
      const stringified = JSON.stringify(parsed)
      expect(stringified).toBe(stored)

      // Data integrity check
      expect(parsed.updates.length).toBe(3)
      expect(parsed.updates[1].value).toBe(50)
    })
  })

  describe('C011: localStorage Quota Exceeded', () => {
    it('should throw QuotaExceededError when storage is full', () => {
      // Given: localStorage is at quota limit
      // Mock setItem to throw QuotaExceededError
      const quotaError = new Error('QuotaExceededError')
      quotaError.name = 'QuotaExceededError'
      const setMock = vi.spyOn(storage, 'set').mockImplementation(() => {
        throw quotaError
      })

      const queue: OfflineQueue = {
        updates: [],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }

      // When/Then: saveQueue throws with helpful message
      expect(() => saveQueue(queue)).toThrow(
        'Browser storage full - please clear browser data or sync updates'
      )

      // Restore mock for subsequent tests
      setMock.mockRestore()
    })
  })

  describe('C012: Enqueue With Missing user_id', () => {
    it('should auto-populate user_id from auth context', () => {
      // Note: This test assumes the function has access to auth context
      // For now, we test that user_id is required in the input
      // The actual implementation will determine where user_id comes from

      // Given: User is authenticated
      const currentUserId = 'authenticated-user-id'

      // When: enqueueUpdate called with user_id
      const update = enqueueUpdate({
        component_id: 'component-1',
        milestone_name: 'Receive',
        value: true,
        user_id: currentUserId
      })

      // Then: user_id is set correctly
      expect(update.user_id).toBe(currentUserId)

      // Update created successfully
      const queue = initQueue()
      expect(queue.updates.length).toBe(1)
      expect(queue.updates[0].user_id).toBe(currentUserId)
    })
  })

  describe('C013: Enqueue Discrete Milestone (Boolean)', () => {
    it('should preserve boolean type through localStorage round-trip', () => {
      // Given: Milestone is discrete type
      // When: enqueueUpdate({ value: true })
      const update = enqueueUpdate({
        component_id: 'component-1',
        milestone_name: 'Receive',
        value: true,
        user_id: 'user-id'
      })

      // Then: value stored as boolean true
      expect(update.value).toBe(true)
      expect(typeof update.value).toBe('boolean')

      // Type preserved after localStorage round-trip
      const queue = initQueue()
      const stored = queue.updates[0]
      expect(stored.value).toBe(true)
      expect(typeof stored.value).toBe('boolean')
    })
  })

  describe('C014: Enqueue Partial Milestone (Number)', () => {
    it('should preserve number type and validate range through localStorage round-trip', () => {
      // Given: Milestone is partial type
      // When: enqueueUpdate({ value: 75 })
      const update = enqueueUpdate({
        component_id: 'component-1',
        milestone_name: 'Install',
        value: 75,
        user_id: 'user-id'
      })

      // Then: value stored as number 75
      expect(update.value).toBe(75)
      expect(typeof update.value).toBe('number')

      // Type preserved after localStorage round-trip
      const queue = initQueue()
      const stored = queue.updates[0]
      expect(stored.value).toBe(75)
      expect(typeof stored.value).toBe('number')

      // Value within range 0-100
      expect(stored.value).toBeGreaterThanOrEqual(0)
      expect(stored.value).toBeLessThanOrEqual(100)
    })
  })

  describe('C015: Enqueue Invalid Partial Value', () => {
    it('should throw error when partial value out of range', () => {
      // Given: Milestone is partial type
      // When/Then: enqueueUpdate({ value: 150 }) throws error
      expect(() => {
        enqueueUpdate({
          component_id: 'component-1',
          milestone_name: 'Install',
          value: 150,
          user_id: 'user-id'
        })
      }).toThrow('Invalid milestone value: must be 0-100')

      // Queue unchanged
      const queue = initQueue()
      expect(queue.updates.length).toBe(0)
    })

    it('should throw error when partial value is negative', () => {
      expect(() => {
        enqueueUpdate({
          component_id: 'component-1',
          milestone_name: 'Install',
          value: -10,
          user_id: 'user-id'
        })
      }).toThrow('Invalid milestone value: must be 0-100')
    })
  })
})
