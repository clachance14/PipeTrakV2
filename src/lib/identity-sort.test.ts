import { describe, it, expect } from 'vitest'
import { getSortableIdentity } from './identity-sort'
import { naturalCompare } from './natural-sort'

describe('getSortableIdentity', () => {
  describe('standard components with commodity_code', () => {
    it('extracts and pads line number for consistent sorting', () => {
      const key = { commodity_code: 'G4G-1450-10AA', size: '2', seq: 1 }
      const result = getSortableIdentity(key, 'support')

      // Line number 1450 should be padded to 6 digits
      expect(result).toBe('G4G-001450-10AA')
    })

    it('sorts line numbers correctly (1425 < 1430 < 1450)', () => {
      const components = [
        { key: { commodity_code: 'G4G-1450-10AA', size: '2', seq: 1 }, type: 'support' },
        { key: { commodity_code: 'G4G-1425-05AA', size: '2', seq: 1 }, type: 'support' },
        { key: { commodity_code: 'G4G-1430-05AB', size: '2', seq: 1 }, type: 'support' },
      ]

      const sorted = [...components].sort((a, b) =>
        naturalCompare(
          getSortableIdentity(a.key, a.type),
          getSortableIdentity(b.key, b.type)
        )
      )

      expect(sorted[0].key.commodity_code).toBe('G4G-1425-05AA')
      expect(sorted[1].key.commodity_code).toBe('G4G-1430-05AB')
      expect(sorted[2].key.commodity_code).toBe('G4G-1450-10AA')
    })

    it('sorts same line number by suffix naturally', () => {
      const components = [
        { key: { commodity_code: 'G4G-1450-10AB', size: '2', seq: 1 }, type: 'support' },
        { key: { commodity_code: 'G4G-1450-10AA', size: '2', seq: 1 }, type: 'support' },
        { key: { commodity_code: 'G4G-1450-05AA', size: '2', seq: 1 }, type: 'support' },
      ]

      const sorted = [...components].sort((a, b) =>
        naturalCompare(
          getSortableIdentity(a.key, a.type),
          getSortableIdentity(b.key, b.type)
        )
      )

      expect(sorted[0].key.commodity_code).toBe('G4G-1450-05AA')
      expect(sorted[1].key.commodity_code).toBe('G4G-1450-10AA')
      expect(sorted[2].key.commodity_code).toBe('G4G-1450-10AB')
    })

    it('handles complex suffixes like 05AA-001-2-2', () => {
      const key = { commodity_code: 'G4G-1425-05AA-001-2-2', size: '2', seq: 1 }
      const result = getSortableIdentity(key, 'support')

      expect(result).toBe('G4G-001425-05AA-001-2-2')
    })
  })

  describe('field welds', () => {
    it('sorts by weld_number', () => {
      const key = { weld_number: 'FW-001' }
      const result = getSortableIdentity(key, 'field_weld')

      expect(result).toBe('FW-001')
    })

    it('handles numeric weld numbers', () => {
      const components = [
        { key: { weld_number: 'FW-10' }, type: 'field_weld' },
        { key: { weld_number: 'FW-2' }, type: 'field_weld' },
        { key: { weld_number: 'FW-1' }, type: 'field_weld' },
      ]

      const sorted = [...components].sort((a, b) =>
        naturalCompare(
          getSortableIdentity(a.key, a.type),
          getSortableIdentity(b.key, b.type)
        )
      )

      expect(sorted[0].key.weld_number).toBe('FW-1')
      expect(sorted[1].key.weld_number).toBe('FW-2')
      expect(sorted[2].key.weld_number).toBe('FW-10')
    })
  })

  describe('spools', () => {
    it('sorts by spool_id', () => {
      const key = { spool_id: 'SP-001-A' }
      const result = getSortableIdentity(key, 'spool')

      expect(result).toBe('SP-001-A')
    })
  })

  describe('threaded pipe', () => {
    it('sorts by pipe_id', () => {
      const key = { pipe_id: 'V-26B02-2-PIPE-AGG' }
      const result = getSortableIdentity(key, 'threaded_pipe')

      expect(result).toBe('V-26B02-2-PIPE-AGG')
    })
  })

  describe('edge cases', () => {
    it('handles missing commodity_code gracefully', () => {
      const key = {}
      const result = getSortableIdentity(key, 'support')

      expect(result).toBe('')
    })

    it('handles malformed commodity_code without line number', () => {
      const key = { commodity_code: 'SIMPLE-CODE' }
      const result = getSortableIdentity(key, 'support')

      // Falls back to original
      expect(result).toBe('SIMPLE-CODE')
    })

    it('handles commodity_code with only prefix and number (no suffix)', () => {
      const key = { commodity_code: 'G4G-1450' }
      const result = getSortableIdentity(key, 'support')

      // Falls back to original since pattern requires suffix
      expect(result).toBe('G4G-1450')
    })

    it('handles lowercase prefix (case-insensitive)', () => {
      const key = { commodity_code: 'g4g-1450-10aa', size: '2', seq: 1 }
      const result = getSortableIdentity(key, 'support')

      // Pattern is case-insensitive, should pad line number
      expect(result).toBe('g4g-001450-10aa')
    })
  })
})
