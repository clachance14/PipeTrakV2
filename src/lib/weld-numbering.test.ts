import { describe, it, expect } from 'vitest'
import {
  detectWeldPattern,
  parseWeldNumber,
  findNextWeldNumber,
  formatWeldNumber,
  type WeldPattern,
} from './weld-numbering'

describe('weld-numbering', () => {
  describe('detectWeldPattern', () => {
    it('should detect FW-## pattern with 2-digit padding', () => {
      const weldIds = ['FW-01', 'FW-02', 'FW-03']
      const pattern = detectWeldPattern(weldIds)

      expect(pattern).toEqual({
        prefix: 'FW-',
        paddingLength: 2,
        hasPrefix: true,
      })
    })

    it('should detect W-### pattern with 3-digit padding', () => {
      const weldIds = ['W-001', 'W-002', 'W-050']
      const pattern = detectWeldPattern(weldIds)

      expect(pattern).toEqual({
        prefix: 'W-',
        paddingLength: 3,
        hasPrefix: true,
      })
    })

    it('should detect numeric-only pattern (no prefix)', () => {
      const weldIds = ['1', '2', '3']
      const pattern = detectWeldPattern(weldIds)

      expect(pattern).toEqual({
        prefix: '',
        paddingLength: 0,
        hasPrefix: false,
      })
    })

    it('should detect numeric pattern with padding', () => {
      const weldIds = ['001', '002', '010']
      const pattern = detectWeldPattern(weldIds)

      expect(pattern).toEqual({
        prefix: '',
        paddingLength: 3,
        hasPrefix: false,
      })
    })

    it('should use most common pattern when formats are mixed', () => {
      const weldIds = ['FW-01', 'FW-02', 'FW-03', 'W-001', 'W-002']
      const pattern = detectWeldPattern(weldIds)

      // FW-## appears 3 times, W-### appears 2 times
      expect(pattern).toEqual({
        prefix: 'FW-',
        paddingLength: 2,
        hasPrefix: true,
      })
    })

    it('should return default pattern for empty array', () => {
      const weldIds: string[] = []
      const pattern = detectWeldPattern(weldIds)

      expect(pattern).toEqual({
        prefix: 'W-',
        paddingLength: 3,
        hasPrefix: true,
      })
    })

    it('should handle single weld ID', () => {
      const weldIds = ['FW-001']
      const pattern = detectWeldPattern(weldIds)

      expect(pattern).toEqual({
        prefix: 'FW-',
        paddingLength: 3,
        hasPrefix: true,
      })
    })
  })

  describe('parseWeldNumber', () => {
    it('should extract number from weld ID with prefix', () => {
      const pattern: WeldPattern = {
        prefix: 'FW-',
        paddingLength: 2,
        hasPrefix: true,
      }

      expect(parseWeldNumber('FW-01', pattern)).toBe(1)
      expect(parseWeldNumber('FW-05', pattern)).toBe(5)
      expect(parseWeldNumber('FW-99', pattern)).toBe(99)
    })

    it('should extract number from numeric-only weld ID', () => {
      const pattern: WeldPattern = {
        prefix: '',
        paddingLength: 0,
        hasPrefix: false,
      }

      expect(parseWeldNumber('1', pattern)).toBe(1)
      expect(parseWeldNumber('42', pattern)).toBe(42)
      expect(parseWeldNumber('999', pattern)).toBe(999)
    })

    it('should handle leading zeros in numeric portion', () => {
      const pattern: WeldPattern = {
        prefix: 'W-',
        paddingLength: 3,
        hasPrefix: true,
      }

      expect(parseWeldNumber('W-001', pattern)).toBe(1)
      expect(parseWeldNumber('W-050', pattern)).toBe(50)
      expect(parseWeldNumber('W-100', pattern)).toBe(100)
    })

    it('should return null for invalid format', () => {
      const pattern: WeldPattern = {
        prefix: 'FW-',
        paddingLength: 2,
        hasPrefix: true,
      }

      expect(parseWeldNumber('W-01', pattern)).toBeNull()
      expect(parseWeldNumber('ABC', pattern)).toBeNull()
      expect(parseWeldNumber('', pattern)).toBeNull()
    })
  })

  describe('formatWeldNumber', () => {
    it('should format number with prefix and padding', () => {
      const pattern: WeldPattern = {
        prefix: 'FW-',
        paddingLength: 2,
        hasPrefix: true,
      }

      expect(formatWeldNumber(1, pattern)).toBe('FW-01')
      expect(formatWeldNumber(5, pattern)).toBe('FW-05')
      expect(formatWeldNumber(99, pattern)).toBe('FW-99')
    })

    it('should handle numbers exceeding padding length', () => {
      const pattern: WeldPattern = {
        prefix: 'FW-',
        paddingLength: 2,
        hasPrefix: true,
      }

      expect(formatWeldNumber(100, pattern)).toBe('FW-100')
      expect(formatWeldNumber(999, pattern)).toBe('FW-999')
    })

    it('should format numeric-only pattern without padding', () => {
      const pattern: WeldPattern = {
        prefix: '',
        paddingLength: 0,
        hasPrefix: false,
      }

      expect(formatWeldNumber(1, pattern)).toBe('1')
      expect(formatWeldNumber(42, pattern)).toBe('42')
      expect(formatWeldNumber(999, pattern)).toBe('999')
    })

    it('should format numeric-only pattern with padding', () => {
      const pattern: WeldPattern = {
        prefix: '',
        paddingLength: 3,
        hasPrefix: false,
      }

      expect(formatWeldNumber(1, pattern)).toBe('001')
      expect(formatWeldNumber(50, pattern)).toBe('050')
      expect(formatWeldNumber(100, pattern)).toBe('100')
    })

    it('should format W-### pattern correctly', () => {
      const pattern: WeldPattern = {
        prefix: 'W-',
        paddingLength: 3,
        hasPrefix: true,
      }

      expect(formatWeldNumber(1, pattern)).toBe('W-001')
      expect(formatWeldNumber(50, pattern)).toBe('W-050')
      expect(formatWeldNumber(999, pattern)).toBe('W-999')
    })
  })

  describe('findNextWeldNumber', () => {
    it('should continue FW-## pattern and increment', () => {
      const existingWeldIds = ['FW-01', 'FW-02', 'FW-03']
      expect(findNextWeldNumber(existingWeldIds)).toBe('FW-04')
    })

    it('should continue numeric pattern and increment', () => {
      const existingWeldIds = ['1', '2', '3']
      expect(findNextWeldNumber(existingWeldIds)).toBe('4')
    })

    it('should fill gaps in sequence', () => {
      const existingWeldIds = ['FW-01', 'FW-03', 'FW-05']
      expect(findNextWeldNumber(existingWeldIds)).toBe('FW-02')
    })

    it('should fill the first gap when multiple gaps exist', () => {
      const existingWeldIds = ['1', '3', '5', '7']
      expect(findNextWeldNumber(existingWeldIds)).toBe('2')
    })

    it('should preserve leading zeros when filling gaps', () => {
      const existingWeldIds = ['W-001', 'W-003', 'W-010']
      expect(findNextWeldNumber(existingWeldIds)).toBe('W-002')
    })

    it('should increment when no gaps exist', () => {
      const existingWeldIds = ['W-001', 'W-002', 'W-003']
      expect(findNextWeldNumber(existingWeldIds)).toBe('W-004')
    })

    it('should return W-001 for empty project', () => {
      const existingWeldIds: string[] = []
      expect(findNextWeldNumber(existingWeldIds)).toBe('W-001')
    })

    it('should return W-002 when only W-001 exists', () => {
      const existingWeldIds = ['W-001']
      expect(findNextWeldNumber(existingWeldIds)).toBe('W-002')
    })

    it('should handle large numbers correctly', () => {
      const existingWeldIds = ['FW-098', 'FW-099', 'FW-100']
      expect(findNextWeldNumber(existingWeldIds)).toBe('FW-101')
    })

    it('should handle unsorted input correctly', () => {
      const existingWeldIds = ['FW-05', 'FW-01', 'FW-03', 'FW-02']
      expect(findNextWeldNumber(existingWeldIds)).toBe('FW-04')
    })

    it('should use majority pattern when formats are mixed', () => {
      const existingWeldIds = ['FW-01', 'FW-02', 'FW-03', 'W-001', 'W-002']
      expect(findNextWeldNumber(existingWeldIds)).toBe('FW-04')
    })

    it('should handle numeric pattern with leading zeros', () => {
      const existingWeldIds = ['001', '002', '004']
      expect(findNextWeldNumber(existingWeldIds)).toBe('003')
    })

    it('should handle single digit to double digit transition', () => {
      const existingWeldIds = ['FW-08', 'FW-09']
      expect(findNextWeldNumber(existingWeldIds)).toBe('FW-10')
    })
  })
})
