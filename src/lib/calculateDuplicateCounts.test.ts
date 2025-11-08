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

  it('returns count of 2 for two identical components', () => {
    const components = [
      {
        identity_key: {
          drawing_norm: 'P-001',
          commodity_code: 'G4G-1412-05AA-001-6-6',
          size: '6',
          seq: 1
        }
      },
      {
        identity_key: {
          drawing_norm: 'P-001',
          commodity_code: 'G4G-1412-05AA-001-6-6',
          size: '6',
          seq: 2
        }
      }
    ]

    const result = calculateDuplicateCounts(components)
    expect(result.get('P-001|G4G-1412-05AA-001-6-6|6')).toBe(2)
  })

  it('counts components separately across different drawings', () => {
    const components = [
      {
        identity_key: {
          drawing_norm: 'P-001',
          commodity_code: 'VBALU-001',
          size: '2',
          seq: 1
        }
      },
      {
        identity_key: {
          drawing_norm: 'P-002',
          commodity_code: 'VBALU-001',
          size: '2',
          seq: 1
        }
      }
    ]

    const result = calculateDuplicateCounts(components)
    expect(result.get('P-001|VBALU-001|2')).toBe(1)
    expect(result.get('P-002|VBALU-001|2')).toBe(1)
    expect(result.size).toBe(2)
  })

  it('handles NOSIZE components correctly', () => {
    const components = [
      {
        identity_key: {
          drawing_norm: 'P-001',
          commodity_code: 'EQUIP-001',
          size: 'NOSIZE',
          seq: 1
        }
      },
      {
        identity_key: {
          drawing_norm: 'P-001',
          commodity_code: 'EQUIP-001',
          size: 'NOSIZE',
          seq: 2
        }
      }
    ]

    const result = calculateDuplicateCounts(components)
    expect(result.get('P-001|EQUIP-001|NOSIZE')).toBe(2)
  })
})
