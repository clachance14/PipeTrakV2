import { describe, it, expect } from 'vitest'
import { calculateDuplicateCounts } from './calculateDuplicateCounts'
import type { IdentityKey } from '@/types/drawing-table.types'

describe('calculateDuplicateCounts', () => {
  it('returns empty Map for empty array', () => {
    const result = calculateDuplicateCounts([])
    expect(result.size).toBe(0)
  })

  it('returns count of 1 for single component', () => {
    const components = [{
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1
      }
    }]

    const result = calculateDuplicateCounts(components)
    expect(result.size).toBe(1)
    expect(result.get('P-001|VBALU-001|2')).toBe(1)
  })
})
