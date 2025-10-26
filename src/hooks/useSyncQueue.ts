/**
 * useSyncQueue Hook
 * Feature: 015-mobile-milestone-updates
 * Purpose: Orchestrate sync queue with automatic trigger on network online
 */

import { useState, useEffect, useCallback } from 'react'
import { syncQueue, retrySync, getSyncStatus, type SyncResult } from '@/lib/sync-manager'
import { useNetworkStatus } from './useNetworkStatus'

/**
 * Hook to manage sync queue operations
 * Automatically syncs when network comes online
 */
export function useSyncQueue() {
  const isOnline = useNetworkStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  // Sync function with state management
  const sync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true)
    try {
      const result = await syncQueue()
      setLastSyncResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Retry function
  const retry = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true)
    try {
      const result = await retrySync()
      setLastSyncResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // Auto-sync when network comes online
  useEffect(() => {
    if (isOnline) {
      const status = getSyncStatus()
      
      // Only sync if there are pending updates
      if (status.pendingCount > 0 || status.failedCount > 0) {
        sync()
      }
    }
  }, [isOnline, sync])

  return {
    isSyncing,
    lastSyncResult,
    sync,
    retry,
    status: getSyncStatus()
  }
}
