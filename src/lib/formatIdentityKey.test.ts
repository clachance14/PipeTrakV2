import { describe, it, expect } from 'vitest'
import { formatIdentityKey } from './formatIdentityKey'
import type { IdentityKey, ComponentType } from '@/types/drawing-table.types'

describe('formatIdentityKey', () => {
  describe('Non-instrument components', () => {
    it('formats component with size and seq', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'valve')
      expect(result).toBe('VBALU-001 2" (1)')
    })

    it('formats component with fractional size', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'EL90-150',
        size: '1X2',
        seq: 2
      }
      const result = formatIdentityKey(key, 'fitting')
      expect(result).toBe('EL90-150 1X2 (2)')
    })

    it('omits size when NOSIZE', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'SUPPORT-001',
        size: 'NOSIZE',
        seq: 1
      }
      const result = formatIdentityKey(key, 'support')
      expect(result).toBe('SUPPORT-001 (1)')
    })

    it('handles seq values greater than 1', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 42
      }
      const result = formatIdentityKey(key, 'valve')
      expect(result).toBe('VBALU-001 2" (42)')
    })
  })

  describe('Instrument components', () => {
    it('formats instrument without seq suffix', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'ME-55402',
        size: '1X2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'instrument')
      expect(result).toBe('ME-55402 1X2')
    })

    it('formats instrument with NOSIZE', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'ME-55402',
        size: 'NOSIZE',
        seq: 1
      }
      const result = formatIdentityKey(key, 'instrument')
      expect(result).toBe('ME-55402')
    })

    it('formats instrument with numeric size', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'PT-100',
        size: '2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'instrument')
      expect(result).toBe('PT-100 2"')
    })
  })

  describe('Edge cases', () => {
    it('handles empty size string as NOSIZE', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'MISC-001',
        size: '',
        seq: 1
      }
      const result = formatIdentityKey(key, 'misc_component')
      expect(result).toBe('MISC-001 (1)')
    })

    it('trims extra whitespace from result', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: 'NOSIZE',
        seq: 1
      }
      const result = formatIdentityKey(key, 'valve')
      expect(result).toBe('VBALU-001 (1)')
      expect(result).not.toContain('  ') // No double spaces
    })

    it('handles all component types correctly', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'TEST-001',
        size: '2',
        seq: 1
      }

      const nonInstrumentTypes: ComponentType[] = [
        'spool', 'field_weld', 'support', 'valve', 'fitting',
        'flange', 'tubing', 'hose', 'misc_component', 'threaded_pipe', 'pipe'
      ]

      nonInstrumentTypes.forEach(type => {
        const result = formatIdentityKey(key, type)
        expect(result).toBe('TEST-001 2" (1)')
      })

      const instrumentResult = formatIdentityKey(key, 'instrument')
      expect(instrumentResult).toBe('TEST-001 2"')
    })
  })

  describe('Size display formatting', () => {
    it('adds inch symbol for numeric sizes on non-instruments', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'valve')
      expect(result).toContain('2"')
    })

    it('adds inch symbol for numeric sizes on instruments', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'ME-55402',
        size: '1',
        seq: 1
      }
      const result = formatIdentityKey(key, 'instrument')
      expect(result).toContain('1"')
    })

    it('does not add inch symbol to fractional sizes', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '1X2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'valve')
      expect(result).toBe('VBALU-001 1X2 (1)')
      expect(result).not.toContain('"')
    })
  })

  describe('formatIdentityKey with totalCount', () => {
    it('shows "1 of 2" format when totalCount is 2', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'valve', 2)
      expect(result).toBe('VBALU-001 2" 1 of 2')
    })

    it('shows clean format when totalCount is 1', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'valve', 1)
      expect(result).toBe('VBALU-001 2"')
    })

    it('shows clean format when totalCount is undefined', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'valve')
      expect(result).toBe('VBALU-001 2"')
    })

    it('handles multiple instances with fractional size', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'EL90-150',
        size: '1X2',
        seq: 2
      }
      const result = formatIdentityKey(key, 'fitting', 3)
      expect(result).toBe('EL90-150 1X2 2 of 3')
    })

    it('handles NOSIZE with totalCount', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'SUPPORT-001',
        size: 'NOSIZE',
        seq: 1
      }
      const result = formatIdentityKey(key, 'support', 5)
      expect(result).toBe('SUPPORT-001 1 of 5')
    })

    it('ignores totalCount for instruments', () => {
      const key: IdentityKey = {
        drawing_norm: 'P-001',
        commodity_code: 'ME-55402',
        size: '1X2',
        seq: 1
      }
      const result = formatIdentityKey(key, 'instrument', 2)
      expect(result).toBe('ME-55402 1X2')
    })
  })
})
