/**
 * Zustand store for sidebar collapse state
 * Replaces useSidebarState hook to provide shared state across components
 * Persisted to localStorage for cross-session consistency
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarStore {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggle: () => void
  setCollapsed: (value: boolean) => void
  toggleMobile: () => void
  setMobileOpen: (value: boolean) => void
}

/**
 * Global sidebar state store
 * Used by both Sidebar and Layout components to sync collapse state
 */
export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,

      toggle: () => {
        set((state) => ({ isCollapsed: !state.isCollapsed }))
      },

      setCollapsed: (value: boolean) => {
        set({ isCollapsed: value })
      },

      toggleMobile: () => {
        set((state) => ({ isMobileOpen: !state.isMobileOpen }))
      },

      setMobileOpen: (value: boolean) => {
        set({ isMobileOpen: value })
      },
    }),
    {
      name: 'pipetrak:sidebar-collapsed', // localStorage key
    }
  )
)
