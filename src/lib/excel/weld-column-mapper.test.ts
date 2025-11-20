/**
 * Unit Tests for Field Weld Column Mapper
 */

import { describe, it, expect } from 'vitest'
import {
  mapFieldWeldColumns,
  reorderRow,
  getMappingStats,
  FIELD_WELD_REQUIRED_HEADERS,
  FIELD_WELD_SYNONYMS,
} from './weld-column-mapper'

describe('mapFieldWeldColumns', () => {
  it('should map exact header matches', () => {
    const sourceHeaders = [
      'Weld ID Number',
      'Drawing / Isometric Number',
      'Weld Type',
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(13)
    expect(result.missingRequired).toHaveLength(0)
    expect(result.mappings[0]?.confidence).toBe('exact')
    expect(result.mappings[0]?.targetName).toBe('Weld ID Number')
  })

  it('should map case-insensitive header matches', () => {
    const sourceHeaders = [
      'weld id number',
      'drawing / isometric number',
      'weld type',
      'spec',
      'weld size',
      'schedule',
      'base metal',
      'x-ray %',
      'welder stencil',
      'date welded',
      'type of nde performed',
      'nde result',
      'comments',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(13)
    expect(result.missingRequired).toHaveLength(0)
  })

  it('should map synonym header matches (Weld # → Weld ID Number)', () => {
    const sourceHeaders = [
      'Weld #', // Synonym for "Weld ID Number"
      'Drawing / Isometric Number',
      'Weld Type',
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(13)
    expect(result.missingRequired).toHaveLength(0)

    const weldIdMapping = result.mappings.find(
      (m) => m.targetName === 'Weld ID Number'
    )
    expect(weldIdMapping?.sourceName).toBe('Weld #')
    expect(weldIdMapping?.confidence).toBe('synonym')
  })

  it('should map real DK RAIL CAR LOADING file headers', () => {
    // Headers from actual file
    const sourceHeaders = [
      'Weld #',
      'Welder Stencil',
      'Date Welded',
      'Drawing / Isometric Number',
      'Tie-in Number',
      'Package Number',
      'Test Pressure',
      'Hydro Complete',
      'Restored Date',
      'SPEC',
      'X-RAY %',
      'Weld Size',
      'Schedule',
      'SYSTEM',
      'Weld Type',
      'Base Metal',
      'Optional info',
      'PMI Required',
      'PWHT',
      'DATE OF PWHT',
      'Type of NDE Performed',
      'NDE Result',
      'NDE A.S.',
      'DATE',
      'PMI',
      'Turned over to Client',
      'Comments',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(13)
    expect(result.missingRequired).toHaveLength(0)
    expect(result.unmapped.length).toBeGreaterThan(0) // Extra columns

    // Verify key mappings
    expect(
      result.mappings.find((m) => m.targetName === 'Weld ID Number')
        ?.sourceName
    ).toBe('Weld #')
    expect(
      result.mappings.find(
        (m) => m.targetName === 'Drawing / Isometric Number'
      )?.sourceName
    ).toBe('Drawing / Isometric Number')
    expect(
      result.mappings.find((m) => m.targetName === 'Weld Type')?.sourceName
    ).toBe('Weld Type')
  })

  it('should normalize slash spacing variations (Drawing/Isometric vs Drawing / Isometric)', () => {
    // The actual Excel file has no space after slash
    const sourceHeaders = [
      'Weld #',
      'Drawing/Isometric Number', // NO SPACE after slash
      'Weld Type',
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(13)
    expect(result.missingRequired).toHaveLength(0)

    // Should match despite slash spacing difference
    const drawingMapping = result.mappings.find(
      (m) => m.targetName === 'Drawing / Isometric Number'
    )
    expect(drawingMapping).toBeDefined()
    expect(drawingMapping?.sourceName).toBe('Drawing/Isometric Number')
    expect(drawingMapping?.confidence).toBe('exact')
  })

  it('should identify missing required columns', () => {
    const sourceHeaders = [
      'Weld #',
      'Drawing / Isometric Number',
      // Missing: Weld Type
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.missingRequired).toContain('Weld Type')
    expect(result.mappings).toHaveLength(12)
  })

  it('should handle completely mismatched headers', () => {
    const sourceHeaders = [
      'Invalid Header 1',
      'Invalid Header 2',
      'Invalid Header 3',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(0)
    expect(result.missingRequired).toHaveLength(
      FIELD_WELD_REQUIRED_HEADERS.length
    )
    expect(result.unmapped).toHaveLength(3)
  })

  it('should ignore empty and whitespace-only headers', () => {
    const sourceHeaders = [
      'Weld #',
      '',
      '   ',
      'Drawing / Isometric Number',
      'Weld Type',
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
      '', // Trailing empty
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(13)
    expect(result.missingRequired).toHaveLength(0)
    expect(result.unmapped).toHaveLength(0) // Empty headers not counted as unmapped
  })

  it('should handle different column order', () => {
    const sourceHeaders = [
      'Comments', // Last column first
      'Weld Type',
      'Drawing / Isometric Number',
      'SPEC',
      'Weld #', // First column last-ish
      'Base Metal',
      'Schedule',
      'Weld Size',
      'X-RAY %',
      'Date Welded',
      'Welder Stencil',
      'NDE Result',
      'Type of NDE Performed',
    ]

    const result = mapFieldWeldColumns(sourceHeaders)

    expect(result.mappings).toHaveLength(13)
    expect(result.missingRequired).toHaveLength(0)

    // Verify each column is mapped despite different order
    for (const header of FIELD_WELD_REQUIRED_HEADERS) {
      const mapping = result.mappings.find((m) => m.targetName === header)
      expect(mapping).toBeDefined()
    }
  })

  it('should map all documented synonyms', () => {
    // Test a few key synonyms
    const testCases = [
      { sourceHeader: 'WLD #', expectedTarget: 'Weld ID Number' },
      { sourceHeader: 'ISO', expectedTarget: 'Drawing / Isometric Number' },
      { sourceHeader: 'Type', expectedTarget: 'Weld Type' },
      { sourceHeader: 'Material', expectedTarget: 'Base Metal' },
      { sourceHeader: 'XRay', expectedTarget: 'X-RAY %' },
      { sourceHeader: 'Stencil', expectedTarget: 'Welder Stencil' },
      { sourceHeader: 'NDE', expectedTarget: 'Type of NDE Performed' },
      { sourceHeader: 'Status', expectedTarget: 'NDE Result' },
    ]

    for (const { sourceHeader, expectedTarget } of testCases) {
      // Create minimal header array with this synonym
      const sourceHeaders = Object.keys(FIELD_WELD_SYNONYMS).map((target) =>
        target === expectedTarget ? sourceHeader : target
      )

      const result = mapFieldWeldColumns(sourceHeaders)
      const mapping = result.mappings.find((m) => m.targetName === expectedTarget)

      expect(mapping).toBeDefined()
      expect(mapping?.sourceName).toBe(sourceHeader)
    }
  })
})

describe('reorderRow', () => {
  it('should reorder row data based on column mappings', () => {
    // Simulate DK RAIL CAR file structure (different order)
    const sourceRow = [
      '1', // Weld # (index 0)
      'K-07', // Welder Stencil (index 1)
      '', // Date Welded (index 2)
      'N - 26C06', // Drawing (index 3)
      '', // Tie-in Number (index 4)
      '', // Package Number (index 5)
      '', // Test Pressure (index 6)
      '', // Hydro Complete (index 7)
      '', // Restored Date (index 8)
      'PU-34', // SPEC (index 9)
      '5%', // X-RAY % (index 10)
      '1"', // Weld Size (index 11)
      'XS', // Schedule (index 12)
      '', // SYSTEM (index 13)
      'SW', // Weld Type (index 14)
      'C/S', // Base Metal (index 15)
      // ... more columns
    ]

    const mappings = mapFieldWeldColumns([
      'Weld #',
      'Welder Stencil',
      'Date Welded',
      'Drawing / Isometric Number',
      'Tie-in Number',
      'Package Number',
      'Test Pressure',
      'Hydro Complete',
      'Restored Date',
      'SPEC',
      'X-RAY %',
      'Weld Size',
      'Schedule',
      'SYSTEM',
      'Weld Type',
      'Base Metal',
    ]).mappings

    const reordered = reorderRow(sourceRow, mappings)

    // Expected order: FIELD_WELD_REQUIRED_HEADERS
    expect(reordered[0]).toBe('1') // Weld ID Number
    expect(reordered[1]).toBe('N - 26C06') // Drawing
    expect(reordered[2]).toBe('SW') // Weld Type
    expect(reordered[3]).toBe('PU-34') // SPEC
    expect(reordered[4]).toBe('1"') // Weld Size
    expect(reordered[5]).toBe('XS') // Schedule
    expect(reordered[6]).toBe('C/S') // Base Metal
    expect(reordered[7]).toBe('5%') // X-RAY %
    expect(reordered[8]).toBe('K-07') // Welder Stencil
    expect(reordered[9]).toBe('') // Date Welded
  })

  it('should handle missing columns with empty strings', () => {
    const sourceRow = ['1', 'N - 26C06', 'SW']

    // Only 3 columns mapped
    const mappings = [
      {
        sourceIndex: 0,
        sourceName: 'Weld #',
        targetName: 'Weld ID Number',
        confidence: 'synonym' as const,
      },
      {
        sourceIndex: 1,
        sourceName: 'Drawing / Isometric Number',
        targetName: 'Drawing / Isometric Number',
        confidence: 'exact' as const,
      },
      {
        sourceIndex: 2,
        sourceName: 'Weld Type',
        targetName: 'Weld Type',
        confidence: 'exact' as const,
      },
    ]

    const reordered = reorderRow(sourceRow, mappings)

    expect(reordered).toHaveLength(13) // All required columns
    expect(reordered[0]).toBe('1')
    expect(reordered[1]).toBe('N - 26C06')
    expect(reordered[2]).toBe('SW')
    expect(reordered[3]).toBe('') // Missing SPEC
    expect(reordered[4]).toBe('') // Missing Weld Size
    // ... etc
  })

  it('should handle null and undefined values', () => {
    const sourceRow = ['1', null, undefined, 'N - 26C06']

    const mappings = mapFieldWeldColumns([
      'Weld #',
      'Extra',
      'Another',
      'Drawing / Isometric Number',
      'Weld Type',
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
    ]).mappings

    const reordered = reorderRow(sourceRow, mappings)

    expect(reordered[1]).toBe('N - 26C06')
    // Null/undefined should become empty strings
    reordered.forEach((value) => {
      expect(typeof value).toBe('string')
    })
  })
})

describe('getMappingStats', () => {
  it('should generate stats for successful mapping', () => {
    const result = mapFieldWeldColumns([
      'Weld #', // synonym
      'Drawing / Isometric Number', // exact
      'weld type', // case-insensitive
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
    ])

    const stats = getMappingStats(result)

    expect(stats).toContain('Mapped 13/13')
    expect(stats).toContain('exact')
    expect(stats).toContain('synonym')
  })

  it('should report missing columns', () => {
    const result = mapFieldWeldColumns([
      'Weld #',
      'Drawing / Isometric Number',
      // Missing 11 columns
    ])

    const stats = getMappingStats(result)

    expect(stats).toContain('Mapped 2/13')
    expect(stats).toContain('Missing:')
  })

  it('should report ignored unmapped columns', () => {
    const result = mapFieldWeldColumns([
      'Weld #',
      'Drawing / Isometric Number',
      'Weld Type',
      'SPEC',
      'Weld Size',
      'Schedule',
      'Base Metal',
      'X-RAY %',
      'Welder Stencil',
      'Date Welded',
      'Type of NDE Performed',
      'NDE Result',
      'Comments',
      'Extra Column 1',
      'Extra Column 2',
      'Extra Column 3',
    ])

    const stats = getMappingStats(result)

    expect(stats).toContain('Ignored 3 unmapped columns')
  })
})

describe('FIELD_WELD_SYNONYMS', () => {
  it('should have synonyms for all required headers', () => {
    for (const header of FIELD_WELD_REQUIRED_HEADERS) {
      expect(FIELD_WELD_SYNONYMS[header]).toBeDefined()
      expect(FIELD_WELD_SYNONYMS[header]?.length).toBeGreaterThan(0)
    }
  })

  it('should have no duplicate synonyms within same header', () => {
    for (const [header, synonyms] of Object.entries(FIELD_WELD_SYNONYMS)) {
      const normalized = synonyms.map((s) =>
        s.toLowerCase().replace(/[^a-z0-9]/g, '')
      )
      const unique = new Set(normalized)
      expect(unique.size).toBe(
        normalized.length,
        `Duplicate synonyms found in ${header}`
      )
    }
  })
})
