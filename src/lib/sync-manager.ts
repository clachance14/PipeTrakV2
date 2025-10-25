/**
 * Sync Manager
 * Feature: 015-mobile-milestone-updates
 * Purpose: Orchestrate offline queue sync with exponential backoff and conflict resolution
 */

import { supabase } from '@/lib/supabase'
import {
  initQueue,
  saveQueue,
  dequeueUpdate,
  incrementRetry,
  clearQueue,
  retryFailedUpdates,
  type QueuedUpdate,
  type OfflineQueue
} from './offline-queue'

export interface SyncResult {
  success: boolean
  synced_count: number
  failed_count: number
  server_wins_count: number
  errors: SyncError[]
}

export interface SyncError {
  update_id: string
  component_id: string
  milestone_name: string
  error_message: string
  http_status: number | null
}

// Prevent concurrent sync operations
let isSyncing = false

/**
 * Sync all queued updates with exponential backoff retry
 * Formula: delay = 3^retryCount * 1000ms (0s, 3s, 9s)
 */
export async function syncQueue(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (isSyncing) {
    console.warn('[Sync] Already syncing, skipping')
    return {
      success: true,
      synced_count: 0,
      failed_count: 0,
      server_wins_count: 0,
      errors: []
    }
  }

  isSyncing = true

  try {
    const queue = initQueue()

    // Empty queue - nothing to sync
    if (queue.updates.length === 0) {
      queue.sync_status = 'idle'
      saveQueue(queue)
      return {
        success: true,
        synced_count: 0,
        failed_count: 0,
        server_wins_count: 0,
        errors: []
      }
    }

    // Start syncing
    queue.sync_status = 'syncing'
    queue.last_sync_attempt = Date.now()
    saveQueue(queue)

    const result: SyncResult = {
      success: true,
      synced_count: 0,
      failed_count: 0,
      server_wins_count: 0,
      errors: []
    }

    // Process each update sequentially (not parallel)
    for (const update of [...queue.updates]) {
      try {
        await syncSingleUpdate(update)
        
        // Success: dequeue and increment counter
        dequeueUpdate(update.id)
        result.synced_count++
      } catch (error: any) {
        // Handle different error types
        const handled = await handleSyncError(update, error, result)
        
        if (!handled) {
          // Unhandled error - mark as failed
          result.failed_count++
          result.success = false
        }
      }
    }

    // Update final sync status
    const finalQueue = initQueue()
    if (result.failed_count > 0) {
      finalQueue.sync_status = 'error'
    } else {
      finalQueue.sync_status = 'idle'
    }
    saveQueue(finalQueue)

    return result
  } finally {
    isSyncing = false
  }
}

/**
 * Sync a single update with exponential backoff retry
 */
async function syncSingleUpdate(update: QueuedUpdate, retryCount: number = 0): Promise<void> {
  // Apply exponential backoff delay (3^n * 1000ms)
  if (retryCount > 0) {
    const delay = Math.pow(3, retryCount) * 1000
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  // Call Supabase RPC
  const { data, error } = await supabase.rpc('update_component_milestone', {
    p_component_id: update.component_id,
    p_milestone_name: update.milestone_name,
    p_new_value: update.value,
    p_user_id: update.user_id
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Handle sync errors with retry logic and conflict resolution
 * Returns true if error was handled, false if it should be treated as failed
 */
async function handleSyncError(
  update: QueuedUpdate,
  error: any,
  result: SyncResult
): Promise<boolean> {
  const status = error.status || error.code

  // 409 Conflict - Server-wins (silent discard)
  if (status === 409) {
    dequeueUpdate(update.id)
    result.server_wins_count++
    return true
  }

  // 401 Unauthorized - Clear queue and redirect to login
  if (status === 401) {
    clearQueue()
    result.errors.push({
      update_id: update.id,
      component_id: update.component_id,
      milestone_name: update.milestone_name,
      error_message: 'Session expired - please log in again',
      http_status: 401
    })
    return true
  }

  // 500 Server Error or network error - Retry with exponential backoff
  if (status === 500 || !status) {
    const newRetryCount = incrementRetry(update.id)

    // Check if still in queue (incrementRetry moves to failed_updates after max retries)
    const queue = initQueue()
    const stillInQueue = queue.updates.find(u => u.id === update.id)

    if (stillInQueue && newRetryCount <= 3) {
      // Retry with exponential backoff
      try {
        await syncSingleUpdate(update, newRetryCount)
        
        // Success after retry - dequeue
        dequeueUpdate(update.id)
        result.synced_count++
        return true
      } catch (retryError) {
        // Recursive retry handling
        return await handleSyncError(update, retryError, result)
      }
    } else {
      // Max retries exhausted - already moved to failed_updates
      result.errors.push({
        update_id: update.id,
        component_id: update.component_id,
        milestone_name: update.milestone_name,
        error_message: error.message || 'Max retries exhausted',
        http_status: status
      })
      return false
    }
  }

  // Unknown error - treat as failed
  result.errors.push({
    update_id: update.id,
    component_id: update.component_id,
    milestone_name: update.milestone_name,
    error_message: error.message || 'Unknown error',
    http_status: status
  })
  return false
}

/**
 * Manual retry of failed updates
 */
export async function retrySync(): Promise<SyncResult> {
  // Move failed updates back to active queue
  retryFailedUpdates()
  
  // Trigger sync
  return await syncQueue()
}

/**
 * Get current sync status
 */
export function getSyncStatus(): { 
  status: 'idle' | 'syncing' | 'error'
  pendingCount: number
  failedCount: number
} {
  const queue = initQueue()
  return {
    status: queue.sync_status,
    pendingCount: queue.updates.length,
    failedCount: queue.failed_updates.length
  }
}
