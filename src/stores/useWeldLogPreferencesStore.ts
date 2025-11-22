/**
 * Zustand store for Weld Log preferences
 * Manages sort and filter state with localStorage persistence
 * Feature: Persistent Weld Log Sort and Filters
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SortColumn =
  | 'weld_id'
  | 'drawing'
  | 'welder'
  | 'date_welded'
  | 'weld_type'
  | 'size'
  | 'nde_result'
  | 'progress'

interface WeldLogPreferencesStore {
  // Sort state
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'
  setSortColumn: (column: SortColumn) => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  toggleSort: (column: SortColumn) => void

  // Filter state
  drawingFilter: string
  welderFilter: string
  packageFilter: string
  systemFilter: string
  searchTerm: string

  // Filter actions
  setDrawingFilter: (value: string) => void
  setWelderFilter: (value: string) => void
  setPackageFilter: (value: string) => void
  setSystemFilter: (value: string) => void
  setSearchTerm: (value: string) => void
  clearAllFilters: () => void
}

/**
 * Global weld log preferences store
 * Persists to localStorage for cross-session consistency
 */
export const useWeldLogPreferencesStore = create<WeldLogPreferencesStore>()(
  persist(
    (set) => ({
      // Default sort: weld_id ascending
      sortColumn: 'weld_id',
      sortDirection: 'asc',

      // Default filters: all
      drawingFilter: 'all',
      welderFilter: 'all',
      packageFilter: 'all',
      systemFilter: 'all',
      searchTerm: '',

      // Sort actions
      setSortColumn: (column: SortColumn) => {
        set({ sortColumn: column })
      },

      setSortDirection: (direction: 'asc' | 'desc') => {
        set({ sortDirection: direction })
      },

      toggleSort: (column: SortColumn) => {
        set((state) => {
          if (state.sortColumn === column) {
            // Same column - flip direction
            return { sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' }
          } else {
            // New column - set to asc
            return { sortColumn: column, sortDirection: 'asc' }
          }
        })
      },

      // Filter actions
      setDrawingFilter: (value: string) => {
        set({ drawingFilter: value })
      },

      setWelderFilter: (value: string) => {
        set({ welderFilter: value })
      },

      setPackageFilter: (value: string) => {
        set({ packageFilter: value })
      },

      setSystemFilter: (value: string) => {
        set({ systemFilter: value })
      },

      setSearchTerm: (value: string) => {
        set({ searchTerm: value })
      },

      clearAllFilters: () => {
        set({
          drawingFilter: 'all',
          welderFilter: 'all',
          packageFilter: 'all',
          systemFilter: 'all',
          searchTerm: '',
        })
      },
    }),
    {
      name: 'pipetrak:weld-log-preferences', // localStorage key
    }
  )
)
