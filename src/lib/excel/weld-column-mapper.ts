/**
 * Field Weld Column Mapper
 * Maps flexible Excel column headers to expected system headers
 * Handles synonyms and case-insensitive matching
 */

export interface ColumnMapping {
  sourceIndex: number
  sourceName: string
  targetName: string
  confidence: 'exact' | 'case-insensitive' | 'synonym'
}

export interface MappingResult {
  mappings: ColumnMapping[]
  missingRequired: string[]
  unmapped: string[]
}

// Expected Field Weld headers in order
export const FIELD_WELD_REQUIRED_HEADERS = [
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
] as const

// Synonym dictionary for flexible column matching
export const FIELD_WELD_SYNONYMS: Record<string, string[]> = {
  'Weld ID Number': [
    'Weld #',
    'Weld Number',
    'Weld No',
    'WLD #',
    'WLD No',
    'Weld ID',
    'ID',
  ],
  'Drawing / Isometric Number': [
    'Drawing Number',
    'Isometric Number',
    'Drawing',
    'Isometric',
    'ISO',
    'DWG',
    'DWG No',
    'DWG Number',
  ],
  'Weld Type': ['Type', 'Joint Type', 'Weld Joint Type', 'Joint'],
  'SPEC': ['Specification', 'Spec', 'Material Spec'],
  'Weld Size': ['Size', 'Pipe Size', 'Diameter'],
  'Schedule': ['SCH', 'Pipe Schedule', 'Wall Thickness'],
  'Base Metal': ['Material', 'Metal', 'Base Material', 'Pipe Material'],
  'X-RAY %': ['X-Ray', 'RT %', 'Radiography %'],
  'Welder Stencil': [
    'Stencil',
    'Welder ID',
    'Welder',
    'Welder Code',
    'Fitter',
  ],
  'Date Welded': ['Date', 'Weld Date', 'Completion Date', 'Install Date'],
  'Type of NDE Performed': [
    'NDE Type',
    'NDE',
    'Inspection Type',
    'Test Type',
    'NDT',
  ],
  'NDE Result': [
    'Result',
    'NDE Status',
    'Inspection Result',
    'Test Result',
    'Pass/Fail',
    'Status',
  ],
  Comments: ['Comment', 'Notes', 'Remarks', 'Description'],
}

/**
 * Normalize header name for comparison
 * - Trim whitespace
 * - Convert to lowercase
 * - Normalize slashes (add spaces around them)
 * - Remove special characters except /
 * - Collapse multiple spaces
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' / ') // Normalize slashes: ensure spaces around them
    .replace(/[^a-z0-9/\s]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Find best matching target column for a source header
 * Returns null if no match found
 */
function findMatch(
  sourceHeader: string,
  targetHeaders: readonly string[],
  synonyms: Record<string, string[]>
): { targetName: string; confidence: ColumnMapping['confidence'] } | null {
  const normalized = normalizeHeader(sourceHeader)

  // Tier 1: Exact match (100% confidence)
  for (const target of targetHeaders) {
    if (normalizeHeader(target) === normalized) {
      return { targetName: target, confidence: 'exact' }
    }
  }

  // Tier 2: Case-insensitive match with original (95% confidence)
  for (const target of targetHeaders) {
    if (target.toLowerCase() === sourceHeader.toLowerCase()) {
      return { targetName: target, confidence: 'case-insensitive' }
    }
  }

  // Tier 3: Synonym match (85% confidence)
  for (const [target, synonymList] of Object.entries(synonyms)) {
    const normalizedSynonyms = synonymList.map(normalizeHeader)
    if (normalizedSynonyms.includes(normalized)) {
      return { targetName: target, confidence: 'synonym' }
    }
  }

  return null
}

/**
 * Map source Excel headers to expected Field Weld headers
 * @param sourceHeaders - Headers from Excel file
 * @returns Mapping result with matched columns and missing required fields
 */
export function mapFieldWeldColumns(sourceHeaders: string[]): MappingResult {
  const mappings: ColumnMapping[] = []
  const missingRequired: string[] = []
  const mappedIndices = new Set<number>()

  // Try to map each required header
  for (const targetHeader of FIELD_WELD_REQUIRED_HEADERS) {
    let matched = false

    // Search through source headers for a match
    for (let i = 0; i < sourceHeaders.length; i++) {
      if (mappedIndices.has(i)) continue // Already mapped

      const sourceHeader = sourceHeaders[i]
      if (!sourceHeader || !sourceHeader.trim()) continue

      const match = findMatch(sourceHeader, [targetHeader], FIELD_WELD_SYNONYMS)

      if (match && match.targetName === targetHeader) {
        mappings.push({
          sourceIndex: i,
          sourceName: sourceHeader,
          targetName: targetHeader,
          confidence: match.confidence,
        })
        mappedIndices.add(i)
        matched = true
        break
      }
    }

    if (!matched) {
      missingRequired.push(targetHeader)
    }
  }

  // Identify unmapped source columns
  const unmapped: string[] = []
  for (let i = 0; i < sourceHeaders.length; i++) {
    const header = sourceHeaders[i]
    if (header && !mappedIndices.has(i) && header.trim()) {
      unmapped.push(header)
    }
  }

  return { mappings, missingRequired, unmapped }
}

/**
 * Reorder and filter row data based on column mapping
 * @param sourceRow - Raw row data from Excel (array of values)
 * @param mappings - Column mappings from mapFieldWeldColumns
 * @returns Reordered row with only mapped columns in expected order
 */
export function reorderRow(
  sourceRow: unknown[],
  mappings: ColumnMapping[]
): string[] {
  const result: string[] = []

  for (const expectedHeader of FIELD_WELD_REQUIRED_HEADERS) {
    const mapping = mappings.find((m) => m.targetName === expectedHeader)

    if (mapping) {
      const value = sourceRow[mapping.sourceIndex]
      // Convert value to string, handle null/undefined
      result.push(value != null ? String(value).trim() : '')
    } else {
      // Missing column - add empty string
      result.push('')
    }
  }

  return result
}

/**
 * Get mapping statistics for logging/debugging
 */
export function getMappingStats(result: MappingResult): string {
  const exactCount = result.mappings.filter(
    (m) => m.confidence === 'exact'
  ).length
  const caseInsensitiveCount = result.mappings.filter(
    (m) => m.confidence === 'case-insensitive'
  ).length
  const synonymCount = result.mappings.filter(
    (m) => m.confidence === 'synonym'
  ).length

  return [
    `Mapped ${result.mappings.length}/${FIELD_WELD_REQUIRED_HEADERS.length} columns`,
    `(${exactCount} exact, ${caseInsensitiveCount} case-insensitive, ${synonymCount} synonyms)`,
    result.missingRequired.length > 0
      ? `Missing: ${result.missingRequired.join(', ')}`
      : '',
    result.unmapped.length > 0
      ? `Ignored ${result.unmapped.length} unmapped columns`
      : '',
  ]
    .filter(Boolean)
    .join(' | ')
}
