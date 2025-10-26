/**
 * useMobileDetection Hook
 * Feature: 015-mobile-milestone-updates
 * Purpose: Detect mobile viewport (≤1024px) with resize listener
 */

import { useState, useEffect } from 'react'
import { MOBILE_BREAKPOINT } from '@/lib/responsive-utils'

/**
 * Hook to detect mobile viewport (≤1024px)
 * Automatically listens to window resize events
 */
export function useMobileDetection(): boolean {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isMobile
}
