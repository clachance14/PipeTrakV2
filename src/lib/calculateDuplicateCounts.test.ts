import { describe, it, expect } from 'vitest'
import { calculateDuplicateCounts } from './calculateDuplicateCounts'
import type { IdentityKey } from '@/types/drawing-table.types'

describe('calculateDuplicateCounts', () => {
  it('returns empty Map for empty array', () => {
    const result = calculateDuplicateCounts([])
    expect(result.size).toBe(0)
  })
})
