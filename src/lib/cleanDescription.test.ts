import { describe, it, expect } from 'vitest'
import { cleanDescription } from './cleanDescription'

describe('cleanDescription', () => {
  it('returns description as-is when present', () => {
    expect(cleanDescription('2" ABV VALVE, 600#, RFWN')).toBe('2" ABV VALVE, 600#, RFWN')
  })

  it('trims whitespace', () => {
    expect(cleanDescription('  2" PIPE SCH 40  ')).toBe('2" PIPE SCH 40')
  })

  it('returns null for null input', () => {
    expect(cleanDescription(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(cleanDescription('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(cleanDescription('   ')).toBeNull()
  })

  it('truncates at 80 characters with ellipsis', () => {
    const long = 'A'.repeat(100)
    const result = cleanDescription(long)
    expect(result?.length).toBe(83) // 80 + '...'
    expect(result?.endsWith('...')).toBe(true)
  })

  it('does not truncate strings at or under 80 chars', () => {
    const str = 'A'.repeat(80)
    expect(cleanDescription(str)).toBe(str)
  })
})
