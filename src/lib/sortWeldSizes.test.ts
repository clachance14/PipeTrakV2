import { describe, it, expect } from 'vitest'
import { sortWeldSizes } from './sortWeldSizes'

describe('sortWeldSizes', () => {
  it('sorts whole numbers numerically, not alphabetically', () => {
    const input = ['10"', '2"', '1"', '20"']
    const result = sortWeldSizes(input)
    expect(result).toEqual(['1"', '2"', '10"', '20"'])
  })

  it('handles fractions like 1/2', () => {
    const input = ['2"', '1/2"', '1"', '3/4"']
    const result = sortWeldSizes(input)
    expect(result).toEqual(['1/2"', '3/4"', '1"', '2"'])
  })

  it('handles mixed fractions and whole numbers', () => {
    const input = ['10"', '1/2"', '2"', '1-1/2"', '3/4"', '1"']
    const result = sortWeldSizes(input)
    // 1/2=0.5, 3/4=0.75, 1=1, 1-1/2=1.5, 2=2, 10=10
    expect(result).toEqual(['1/2"', '3/4"', '1"', '1-1/2"', '2"', '10"'])
  })

  it('returns empty array for empty input', () => {
    expect(sortWeldSizes([])).toEqual([])
  })

  it('handles single item', () => {
    expect(sortWeldSizes(['2"'])).toEqual(['2"'])
  })

  it('does not mutate the original array', () => {
    const input = ['2"', '1"']
    sortWeldSizes(input)
    expect(input).toEqual(['2"', '1"'])
  })

  it('handles sizes without quotes', () => {
    const input = ['10', '2', '1']
    const result = sortWeldSizes(input)
    expect(result).toEqual(['1', '2', '10'])
  })

  it('handles non-numeric strings by placing them at start', () => {
    const input = ['2"', 'NPS', '1"']
    const result = sortWeldSizes(input)
    // 'NPS' parses to 0, so it comes first
    expect(result).toEqual(['NPS', '1"', '2"'])
  })
})
