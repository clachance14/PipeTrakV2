/**
 * Offline Queue Management
 * Feature: 015-mobile-milestone-updates
 * Purpose: Manage milestone updates when offline using localStorage
 */

const STORAGE_KEY = 'pipetrak:offline-queue'
const MAX_QUEUE_SIZE = 50
const MAX_FAILED_SIZE = 10
const MAX_RETRIES = 3

export interface QueuedUpdate {
  id: string
  component_id: string
  milestone_name: string
  value: boolean | number
  timestamp: number
  retry_count: number
  user_id: string
}

export interface FailedUpdate {
  update: QueuedUpdate
  error_message: string
  failed_at: number
}

export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface OfflineQueue {
  updates: QueuedUpdate[]
  last_sync_attempt: number | null
  sync_status: SyncStatus
  failed_updates: FailedUpdate[]
}

/**
 * Initialize queue from localStorage or return default empty queue
 */
export function initQueue(): OfflineQueue {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return {
        updates: [],
        last_sync_attempt: null,
        sync_status: 'idle',
        failed_updates: []
      }
    }
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to parse queue from localStorage:', error)
    return {
      updates: [],
      last_sync_attempt: null,
      sync_status: 'idle',
      failed_updates: []
    }
  }
}

/**
 * Save queue to localStorage
 */
export function saveQueue(queue: OfflineQueue): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      throw new Error('Browser storage full - please clear browser data or sync updates')
    }
    throw error
  }
}

/**
 * Enqueue a new update (or update existing if duplicate)
 * Throws error if queue is full or value is invalid
 */
export function enqueueUpdate(payload: {
  component_id: string
  milestone_name: string
  value: boolean | number
  user_id: string
}): QueuedUpdate {
  // Validate partial milestone value range
  if (typeof payload.value === 'number') {
    if (payload.value < 0 || payload.value > 100) {
      throw new Error('Invalid milestone value: must be 0-100')
    }
  }

  const queue = initQueue()

  // Check for duplicate (component_id + milestone_name)
  const duplicate = queue.updates.find(
    u => u.component_id === payload.component_id && u.milestone_name === payload.milestone_name
  )

  if (duplicate) {
    // Update existing entry instead of creating duplicate
    duplicate.value = payload.value
    duplicate.timestamp = Date.now()
    saveQueue(queue)
    return duplicate
  }

  // Enforce 50-entry limit
  if (queue.updates.length >= MAX_QUEUE_SIZE) {
    throw new Error('Update queue full (50/50) - please reconnect to sync pending updates')
  }

  // Create new entry
  const queuedUpdate: QueuedUpdate = {
    id: crypto.randomUUID(),
    component_id: payload.component_id,
    milestone_name: payload.milestone_name,
    value: payload.value,
    timestamp: Date.now(),
    retry_count: 0,
    user_id: payload.user_id
  }

  queue.updates.push(queuedUpdate)
  saveQueue(queue)
  
  return queuedUpdate
}

/**
 * Remove update from queue (after successful sync)
 */
export function dequeueUpdate(id: string): void {
  const queue = initQueue()
  queue.updates = queue.updates.filter(u => u.id !== id)
  saveQueue(queue)
}

/**
 * Increment retry count for failed update
 * Moves to failed_updates if max retries exceeded
 */
export function incrementRetry(id: string): number {
  const queue = initQueue()
  const update = queue.updates.find(u => u.id === id)
  
  if (!update) {
    throw new Error(`Update ${id} not found in queue`)
  }

  update.retry_count += 1

  // Move to failed_updates if max retries exhausted
  if (update.retry_count > MAX_RETRIES) {
    queue.failed_updates.push({
      update,
      error_message: 'Max retries exhausted',
      failed_at: Date.now()
    })
    queue.updates = queue.updates.filter(u => u.id !== id)

    // Keep only last 10 failed updates (FIFO)
    if (queue.failed_updates.length > MAX_FAILED_SIZE) {
      queue.failed_updates.shift()
    }
  }

  saveQueue(queue)
  return update.retry_count
}

/**
 * Clear all updates from queue (used after successful sync or auth error)
 */
export function clearQueue(): void {
  const queue = initQueue()
  queue.updates = []
  queue.sync_status = 'idle'
  saveQueue(queue)
}

/**
 * Get queue size
 */
export function getQueueSize(): number {
  const queue = initQueue()
  return queue.updates.length
}

/**
 * Move failed updates back to active queue for manual retry
 */
export function retryFailedUpdates(): void {
  const queue = initQueue()
  
  // Move failed updates back to active queue with reset retry count
  queue.failed_updates.forEach(failed => {
    failed.update.retry_count = 0
    queue.updates.push(failed.update)
  })
  
  queue.failed_updates = []
  queue.sync_status = 'idle'
  saveQueue(queue)
}
