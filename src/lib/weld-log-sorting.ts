/**
 * Shared sorting logic for Weld Log
 * Used by both WeldLogTable component and PDF exports
 */

import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

export type SortColumn =
  | 'weld_id'
  | 'drawing'
  | 'welder'
  | 'date_welded'
  | 'weld_type'
  | 'size'
  | 'nde_result'
  | 'progress'

/**
 * Natural sort comparator for strings with embedded numbers
 * Handles weld IDs like: 1, 2, 10, 100 (not 1, 10, 100, 2)
 * Also handles: W-1, W-2, W-10 and mixed formats
 */
export function naturalSort(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g
  const aParts = a.match(regex) || []
  const bParts = b.match(regex) || []

  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i]!
    const bPart = bParts[i]!

    // Check if both parts are numbers
    const aNum = parseInt(aPart, 10)
    const bNum = parseInt(bPart, 10)

    if (!isNaN(aNum) && !isNaN(bNum)) {
      // Both are numbers - compare numerically
      if (aNum !== bNum) {
        return aNum - bNum
      }
    } else {
      // At least one is not a number - compare as strings
      const result = aPart.localeCompare(bPart)
      if (result !== 0) {
        return result
      }
    }
  }

  // If all parts are equal, compare by length
  return aParts.length - bParts.length
}

/**
 * Sort field welds by the specified column and direction
 *
 * @param welds - Array of enriched field welds to sort
 * @param sortColumn - Column to sort by
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of welds
 */
export function sortFieldWelds(
  welds: EnrichedFieldWeld[],
  sortColumn: SortColumn,
  sortDirection: 'asc' | 'desc'
): EnrichedFieldWeld[] {
  // Special handling for date_welded: exclude null dates from sort
  if (sortColumn === 'date_welded') {
    const weldsWithDates = welds.filter(w => w.date_welded !== null)
    const weldsWithoutDates = welds.filter(w => w.date_welded === null)

    // Sort only welds with dates
    const sorted = [...weldsWithDates].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1
      const dateA = a.date_welded!
      const dateB = b.date_welded!
      return multiplier * dateA.localeCompare(dateB)
    })

    // Sort welds without dates by weld_id (natural sort), then append
    const sortedWithoutDates = [...weldsWithoutDates].sort((a, b) =>
      naturalSort(a.identityDisplay, b.identityDisplay)
    )
    return [...sorted, ...sortedWithoutDates]
  }

  // Standard sorting for all other columns
  return [...welds].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1

    switch (sortColumn) {
      case 'weld_id':
        return multiplier * naturalSort(a.identityDisplay, b.identityDisplay)
      case 'drawing':
        return multiplier * naturalSort(a.drawing.drawing_no_norm, b.drawing.drawing_no_norm)
      case 'welder': {
        const welderA = a.welder?.stencil || 'zzz'
        const welderB = b.welder?.stencil || 'zzz'
        return multiplier * welderA.localeCompare(welderB)
      }
      case 'weld_type':
        return multiplier * a.weld_type.localeCompare(b.weld_type)
      case 'size': {
        const sizeA = a.weld_size || 'zzz'
        const sizeB = b.weld_size || 'zzz'
        return multiplier * sizeA.localeCompare(sizeB)
      }
      case 'nde_result': {
        const ndeA = a.nde_result || 'zzz'
        const ndeB = b.nde_result || 'zzz'
        return multiplier * ndeA.localeCompare(ndeB)
      }
      case 'progress':
        return multiplier * (a.component.percent_complete - b.component.percent_complete)
      default:
        return 0
    }
  })
}
