import { renderHook, act } from '@testing-library/react'
import {
  useComponentPreferencesStore,
  type SortRule,
} from './useComponentPreferencesStore'

describe('useComponentPreferencesStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset store to defaults
    const { result } = renderHook(() => useComponentPreferencesStore())
    act(() => {
      result.current.resetToDefaults()
    })
  })

  describe('Initial state', () => {
    it('starts with default sort rules', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      expect(result.current.sortRules).toEqual([
        { field: 'identity_key', direction: 'asc' },
      ])
    })

    it('starts with default visible columns', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      expect(result.current.visibleColumns).toContain('selection')
      expect(result.current.visibleColumns).toContain('identity_key')
      expect(result.current.visibleColumns).toContain('component_type')
      expect(result.current.visibleColumns).toContain('percent_complete')
      expect(result.current.visibleColumns).toContain('milestones')
      expect(result.current.visibleColumns).toContain('area')
      expect(result.current.visibleColumns).toContain('system')
      expect(result.current.visibleColumns).toContain('test_package')
      expect(result.current.visibleColumns).toContain('drawing')
      expect(result.current.visibleColumns).toContain('actions')
    })

    it('starts with comfortable density', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      expect(result.current.density).toBe('comfortable')
    })

    it('starts with built-in views', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      expect(result.current.savedViews).toHaveLength(3)
      expect(result.current.savedViews[0]?.id).toBe('default')
      expect(result.current.savedViews[1]?.id).toBe('by-area')
      expect(result.current.savedViews[2]?.id).toBe('needs-work')
    })

    it('starts with default view active', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      expect(result.current.activeViewId).toBe('default')
    })
  })

  describe('Sort rules', () => {
    it('adds a new sort rule', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.addSortRule('area', 'desc')
      })

      expect(result.current.sortRules).toHaveLength(2)
      expect(result.current.sortRules[1]).toEqual({
        field: 'area',
        direction: 'desc',
      })
    })

    it('replaces existing sort rule for same field', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.addSortRule('identity_key', 'desc')
      })

      expect(result.current.sortRules).toHaveLength(1)
      expect(result.current.sortRules[0]).toEqual({
        field: 'identity_key',
        direction: 'desc',
      })
    })

    it('clears active view when adding sort rule', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.loadView('by-area')
      })

      expect(result.current.activeViewId).toBe('by-area')

      act(() => {
        result.current.addSortRule('system', 'asc')
      })

      expect(result.current.activeViewId).toBeNull()
    })

    it('removes a sort rule', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.addSortRule('area', 'asc')
        result.current.addSortRule('system', 'desc')
      })

      expect(result.current.sortRules).toHaveLength(3)

      act(() => {
        result.current.removeSortRule('area')
      })

      expect(result.current.sortRules).toHaveLength(2)
      expect(result.current.sortRules.find((r) => r.field === 'area')).toBeUndefined()
    })

    it('clears all sort rules', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.addSortRule('area', 'asc')
        result.current.addSortRule('system', 'desc')
      })

      expect(result.current.sortRules.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearSortRules()
      })

      expect(result.current.sortRules).toEqual([])
    })

    it('sets sort rules directly', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      const newRules: SortRule[] = [
        { field: 'area', direction: 'asc' },
        { field: 'percent_complete', direction: 'desc' },
      ]

      act(() => {
        result.current.setSortRules(newRules)
      })

      expect(result.current.sortRules).toEqual(newRules)
    })
  })

  describe('Column visibility', () => {
    it('toggles column visibility off', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      expect(result.current.visibleColumns).toContain('area')

      act(() => {
        result.current.toggleColumn('area')
      })

      expect(result.current.visibleColumns).not.toContain('area')
    })

    it('toggles column visibility on', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.toggleColumn('area')
      })

      expect(result.current.visibleColumns).not.toContain('area')

      act(() => {
        result.current.toggleColumn('area')
      })

      expect(result.current.visibleColumns).toContain('area')
    })

    it('sets visible columns directly', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      const newColumns = ['identity_key', 'component_type', 'percent_complete']

      act(() => {
        result.current.setVisibleColumns(newColumns)
      })

      expect(result.current.visibleColumns).toEqual(newColumns)
    })

    it('shows all columns', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.setVisibleColumns(['identity_key'])
      })

      expect(result.current.visibleColumns).toHaveLength(1)

      act(() => {
        result.current.showAllColumns()
      })

      expect(result.current.visibleColumns).toHaveLength(11)
      expect(result.current.visibleColumns).toContain('selection')
      expect(result.current.visibleColumns).toContain('identity_key')
      expect(result.current.visibleColumns).toContain('footage')
      expect(result.current.visibleColumns).toContain('actions')
    })

    it('clears active view when toggling column', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.loadView('by-area')
      })

      expect(result.current.activeViewId).toBe('by-area')

      act(() => {
        result.current.toggleColumn('area')
      })

      expect(result.current.activeViewId).toBeNull()
    })
  })

  describe('Density', () => {
    it('changes density to compact', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.setDensity('compact')
      })

      expect(result.current.density).toBe('compact')
    })

    it('changes density to comfortable', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.setDensity('compact')
        result.current.setDensity('comfortable')
      })

      expect(result.current.density).toBe('comfortable')
    })

    it('persists density changes', () => {
      const { result: result1 } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result1.current.setDensity('compact')
      })

      // Simulate new session
      const { result: result2 } = renderHook(() => useComponentPreferencesStore())

      expect(result2.current.density).toBe('compact')
    })
  })

  describe('Saved views', () => {
    it('saves a new view', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.addSortRule('area', 'asc')
        result.current.setVisibleColumns(['identity_key', 'area'])
        result.current.saveView('My Custom View')
      })

      expect(result.current.savedViews).toHaveLength(4)
      const customView = result.current.savedViews.find((v) =>
        v.id.startsWith('custom-')
      )
      expect(customView?.name).toBe('My Custom View')
      expect(customView?.sortRules).toEqual([
        { field: 'identity_key', direction: 'asc' },
        { field: 'area', direction: 'asc' },
      ])
      expect(customView?.visibleColumns).toEqual(['identity_key', 'area'])
    })

    it('sets saved view as active', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.saveView('My View')
      })

      const customView = result.current.savedViews.find((v) =>
        v.id.startsWith('custom-')
      )

      expect(result.current.activeViewId).toBe(customView?.id)
    })

    it('loads a saved view', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.loadView('by-area')
      })

      expect(result.current.activeViewId).toBe('by-area')
      expect(result.current.sortRules).toEqual([
        { field: 'area', direction: 'asc' },
        { field: 'percent_complete', direction: 'desc' },
      ])
    })

    it('deletes a custom view', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.saveView('To Delete')
      })

      const customView = result.current.savedViews.find((v) =>
        v.id.startsWith('custom-')
      )

      expect(result.current.savedViews).toHaveLength(4)

      act(() => {
        result.current.deleteView(customView?.id ?? '')
      })

      expect(result.current.savedViews).toHaveLength(3)
    })

    it('cannot delete built-in views', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.deleteView('default')
        result.current.deleteView('by-area')
        result.current.deleteView('needs-work')
      })

      expect(result.current.savedViews).toHaveLength(3)
      expect(result.current.savedViews.find((v) => v.id === 'default')).toBeDefined()
      expect(result.current.savedViews.find((v) => v.id === 'by-area')).toBeDefined()
      expect(result.current.savedViews.find((v) => v.id === 'needs-work')).toBeDefined()
    })

    it('clears active view when deleting active view', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.saveView('Active View')
      })

      const customView = result.current.savedViews.find((v) =>
        v.id.startsWith('custom-')
      )

      expect(result.current.activeViewId).toBe(customView?.id)

      act(() => {
        result.current.deleteView(customView?.id ?? '')
      })

      expect(result.current.activeViewId).toBeNull()
    })

    it('preserves active view when deleting different view', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.loadView('by-area')
        result.current.saveView('Other View')
      })

      const customView = result.current.savedViews.find((v) =>
        v.id.startsWith('custom-')
      )

      // loadView sets active view, but saveView also sets active view to the new one
      // So we need to load by-area again
      act(() => {
        result.current.loadView('by-area')
      })

      expect(result.current.activeViewId).toBe('by-area')

      act(() => {
        result.current.deleteView(customView?.id ?? '')
      })

      expect(result.current.activeViewId).toBe('by-area')
    })
  })

  describe('Reset to defaults', () => {
    it('resets all state to defaults', () => {
      const { result } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result.current.addSortRule('area', 'desc')
        result.current.setVisibleColumns(['identity_key'])
        result.current.setDensity('compact')
        result.current.saveView('Custom View')
      })

      expect(result.current.sortRules).not.toEqual([
        { field: 'identity_key', direction: 'asc' },
      ])
      expect(result.current.visibleColumns).toHaveLength(1)
      expect(result.current.density).toBe('compact')
      expect(result.current.savedViews).toHaveLength(4)

      act(() => {
        result.current.resetToDefaults()
      })

      expect(result.current.sortRules).toEqual([
        { field: 'identity_key', direction: 'asc' },
      ])
      expect(result.current.visibleColumns).toHaveLength(11)
      expect(result.current.density).toBe('comfortable')
      expect(result.current.savedViews).toHaveLength(3)
      expect(result.current.activeViewId).toBe('default')
    })
  })

  describe('localStorage persistence', () => {
    it('persists sort rules across sessions', () => {
      const { result: result1 } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result1.current.addSortRule('area', 'desc')
      })

      // Simulate new session
      const { result: result2 } = renderHook(() => useComponentPreferencesStore())

      expect(result2.current.sortRules).toHaveLength(2)
      expect(result2.current.sortRules[1]).toEqual({
        field: 'area',
        direction: 'desc',
      })
    })

    it('persists column visibility across sessions', () => {
      const { result: result1 } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result1.current.setVisibleColumns(['identity_key', 'component_type'])
      })

      // Simulate new session
      const { result: result2 } = renderHook(() => useComponentPreferencesStore())

      expect(result2.current.visibleColumns).toEqual([
        'identity_key',
        'component_type',
      ])
    })

    it('persists saved views across sessions', () => {
      const { result: result1 } = renderHook(() => useComponentPreferencesStore())

      act(() => {
        result1.current.saveView('Persisted View')
      })

      // Simulate new session
      const { result: result2 } = renderHook(() => useComponentPreferencesStore())

      expect(result2.current.savedViews).toHaveLength(4)
      expect(
        result2.current.savedViews.find((v) => v.name === 'Persisted View')
      ).toBeDefined()
    })
  })
})
