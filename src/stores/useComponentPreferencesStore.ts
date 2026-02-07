/**
 * Zustand store for Component List preferences
 * Manages multi-sort, column visibility, density, and saved views with localStorage persistence
 * Feature: Component List Advanced Preferences
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SortRule {
  field: string
  direction: 'asc' | 'desc'
}

export interface SavedView {
  id: string
  name: string
  sortRules: SortRule[]
  visibleColumns: string[]
  filters?: Record<string, unknown>
}

interface ComponentPreferencesStore {
  // Multi-sort state
  sortRules: SortRule[]

  // Column visibility
  visibleColumns: string[]

  // Density
  density: 'compact' | 'comfortable'

  // Saved views
  savedViews: SavedView[]
  activeViewId: string | null

  // Sort actions
  addSortRule: (field: string, direction: 'asc' | 'desc') => void
  removeSortRule: (field: string) => void
  clearSortRules: () => void
  setSortRules: (rules: SortRule[]) => void

  // Column actions
  toggleColumn: (columnId: string) => void
  setVisibleColumns: (columns: string[]) => void
  showAllColumns: () => void

  // Density actions
  setDensity: (density: 'compact' | 'comfortable') => void

  // View actions
  saveView: (name: string) => void
  loadView: (viewId: string) => void
  deleteView: (viewId: string) => void

  // Reset
  resetToDefaults: () => void
}

const DEFAULT_SORT_RULES: SortRule[] = [
  { field: 'identity_key', direction: 'asc' },
]

const DEFAULT_VISIBLE_COLUMNS = [
  'selection',
  'identity_key',
  'component_type',
  'footage',
  'percent_complete',
  'milestones',
  'area',
  'system',
  'test_package',
  'drawing',
  'actions',
]

const DEFAULT_DENSITY: 'compact' | 'comfortable' = 'comfortable'

const BUILT_IN_VIEWS: SavedView[] = [
  {
    id: 'default',
    name: 'Default',
    sortRules: [{ field: 'identity_key', direction: 'asc' }],
    visibleColumns: DEFAULT_VISIBLE_COLUMNS,
  },
  {
    id: 'by-area',
    name: 'By Area',
    sortRules: [
      { field: 'area', direction: 'asc' },
      { field: 'percent_complete', direction: 'desc' },
    ],
    visibleColumns: DEFAULT_VISIBLE_COLUMNS,
  },
  {
    id: 'needs-work',
    name: 'Needs Work',
    sortRules: [{ field: 'percent_complete', direction: 'asc' }],
    visibleColumns: DEFAULT_VISIBLE_COLUMNS,
    filters: { progress_max: 99 },
  },
]

/**
 * Global component list preferences store
 * Persists to localStorage for cross-session consistency
 */
export const useComponentPreferencesStore = create<ComponentPreferencesStore>()(
  persist(
    (set, get) => ({
      // Default state
      sortRules: DEFAULT_SORT_RULES,
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      density: DEFAULT_DENSITY,
      savedViews: BUILT_IN_VIEWS,
      activeViewId: 'default',

      // Sort actions
      addSortRule: (field: string, direction: 'asc' | 'desc') => {
        set((state) => {
          // Remove existing rule for this field if present
          const filtered = state.sortRules.filter((rule) => rule.field !== field)
          return {
            sortRules: [...filtered, { field, direction }],
            activeViewId: null, // Clear active view on manual changes
          }
        })
      },

      removeSortRule: (field: string) => {
        set((state) => ({
          sortRules: state.sortRules.filter((rule) => rule.field !== field),
          activeViewId: null,
        }))
      },

      clearSortRules: () => {
        set({ sortRules: [], activeViewId: null })
      },

      setSortRules: (rules: SortRule[]) => {
        set({ sortRules: rules, activeViewId: null })
      },

      // Column actions
      toggleColumn: (columnId: string) => {
        set((state) => {
          const isVisible = state.visibleColumns.includes(columnId)
          return {
            visibleColumns: isVisible
              ? state.visibleColumns.filter((col) => col !== columnId)
              : [...state.visibleColumns, columnId],
            activeViewId: null,
          }
        })
      },

      setVisibleColumns: (columns: string[]) => {
        set({ visibleColumns: columns, activeViewId: null })
      },

      showAllColumns: () => {
        set({ visibleColumns: DEFAULT_VISIBLE_COLUMNS, activeViewId: null })
      },

      // Density actions
      setDensity: (density: 'compact' | 'comfortable') => {
        set({ density })
      },

      // View actions
      saveView: (name: string) => {
        const state = get()
        const newView: SavedView = {
          id: `custom-${Date.now()}`,
          name,
          sortRules: state.sortRules,
          visibleColumns: state.visibleColumns,
        }

        set((state) => ({
          savedViews: [...state.savedViews, newView],
          activeViewId: newView.id,
        }))
      },

      loadView: (viewId: string) => {
        const state = get()
        const view = state.savedViews.find((v) => v.id === viewId)

        if (view) {
          set({
            sortRules: view.sortRules,
            visibleColumns: view.visibleColumns,
            activeViewId: viewId,
          })
        }
      },

      deleteView: (viewId: string) => {
        // Prevent deleting built-in views
        const isBuiltIn = BUILT_IN_VIEWS.some((view) => view.id === viewId)
        if (isBuiltIn) {
          return
        }

        set((state) => ({
          savedViews: state.savedViews.filter((v) => v.id !== viewId),
          activeViewId: state.activeViewId === viewId ? null : state.activeViewId,
        }))
      },

      // Reset
      resetToDefaults: () => {
        set({
          sortRules: DEFAULT_SORT_RULES,
          visibleColumns: DEFAULT_VISIBLE_COLUMNS,
          density: DEFAULT_DENSITY,
          savedViews: BUILT_IN_VIEWS,
          activeViewId: 'default',
        })
      },
    }),
    {
      name: 'pipetrak:component-preferences', // localStorage key
    }
  )
)
