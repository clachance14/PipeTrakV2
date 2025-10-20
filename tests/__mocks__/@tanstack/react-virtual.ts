/**
 * Mock for @tanstack/react-virtual
 *
 * The real virtualizer requires accurate DOM measurements (getBoundingClientRect, scrollHeight, etc.)
 * which don't work in jsdom. This mock always renders all items for testing purposes.
 *
 * Usage: Import this mock in test files that use virtualized lists
 */

import { vi } from 'vitest'

export function useVirtualizer({ count, estimateSize, getScrollElement }: any) {
  // Default size if estimateSize is not a function
  const defaultSize = 60

  // Calculate size for a given index
  const getSizeForIndex = (index: number) => {
    if (typeof estimateSize === 'function') {
      return estimateSize(index)
    }
    if (typeof estimateSize === 'number') {
      return estimateSize
    }
    return defaultSize
  }

  // Calculate total size
  const getTotalSize = () => {
    let total = 0
    for (let i = 0; i < count; i++) {
      total += getSizeForIndex(i)
    }
    return total
  }

  // Generate virtual items for all rows (not just visible ones)
  // In real virtualizer, this would only return visible items
  const getVirtualItems = () => {
    const items = []
    let currentStart = 0

    for (let i = 0; i < count; i++) {
      const size = getSizeForIndex(i)
      items.push({
        key: i,
        index: i,
        start: currentStart,
        size: size,
        end: currentStart + size,
        lane: 0,
      })
      currentStart += size
    }

    return items
  }

  return {
    getTotalSize,
    getVirtualItems,
    scrollToIndex: vi.fn(),
    scrollToOffset: vi.fn(),
    measure: vi.fn(),
    getScrollElement,
    scrollRect: null,
    scrollOffset: 0,
    measureElement: vi.fn(),
    options: {
      count,
      estimateSize,
      getScrollElement,
    },
  }
}
