/**
 * useOfflineQueue Hook
 * Feature: 015-mobile-milestone-updates
 * Purpose: React state wrapper for offline queue operations
 */

import { useState, useEffect } from 'react'
import {
  initQueue,
  enqueueUpdate,
  dequeueUpdate,
  getQueueSize,
  type QueuedUpdate,
  type OfflineQueue
} from '@/lib/offline-queue'

/**
 * Hook to manage offline queue state
 * Provides queue operations with React state updates
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineQueue>(initQueue())
  const [queueSize, setQueueSize] = useState(getQueueSize())

  // Refresh queue state
  const refreshQueue = () => {
    const updated = initQueue()
    setQueue(updated)
    setQueueSize(updated.updates.length)
  }

  // Enqueue update
  const enqueue = (payload: {
    component_id: string
    milestone_name: string
    value: boolean | number
    user_id: string
  }): QueuedUpdate => {
    const update = enqueueUpdate(payload)
    refreshQueue()
    return update
  }

  // Dequeue update
  const dequeue = (id: string): void => {
    dequeueUpdate(id)
    refreshQueue()
  }

  // Listen for storage events (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pipetrak:offline-queue') {
        refreshQueue()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return {
    queue,
    queueSize,
    enqueue,
    dequeue,
    refreshQueue
  }
}
