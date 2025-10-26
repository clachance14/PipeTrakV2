/**
 * useNetworkStatus Hook
 * Feature: 015-mobile-milestone-updates
 * Purpose: Detect online/offline network status with event listeners
 */

import { useState, useEffect } from 'react'

/**
 * Hook to monitor network status (navigator.onLine)
 * Automatically listens to 'online' and 'offline' events
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
