/**
 * Weld numbering utilities for smart weld ID generation
 *
 * Supports auto-detection of weld ID patterns and gap-filling in sequences.
 */

export interface WeldPattern {
  prefix: string
  paddingLength: number
  hasPrefix: boolean
}

/**
 * Detects the weld ID pattern from existing weld IDs
 *
 * @param weldIds Array of existing weld IDs in the project
 * @returns The detected pattern (prefix, padding length, etc.)
 */
export function detectWeldPattern(weldIds: string[]): WeldPattern {
  // Default pattern for empty projects
  if (weldIds.length === 0) {
    return {
      prefix: 'W-',
      paddingLength: 3,
      hasPrefix: true,
    }
  }

  // Count pattern occurrences
  const patternCounts = new Map<string, { pattern: WeldPattern; count: number }>()

  for (const weldId of weldIds) {
    const pattern = detectSingleWeldPattern(weldId)
    if (pattern) {
      const key = `${pattern.prefix}:${pattern.paddingLength}:${pattern.hasPrefix}`
      const existing = patternCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        patternCounts.set(key, { pattern, count: 1 })
      }
    }
  }

  // Find most common pattern
  let mostCommon: { pattern: WeldPattern; count: number } | null = null
  for (const entry of patternCounts.values()) {
    if (!mostCommon || entry.count > mostCommon.count) {
      mostCommon = entry
    }
  }

  return mostCommon?.pattern ?? {
    prefix: 'W-',
    paddingLength: 3,
    hasPrefix: true,
  }
}

/**
 * Helper function to detect pattern from a single weld ID
 */
function detectSingleWeldPattern(weldId: string): WeldPattern | null {
  // Try to find where the numeric portion starts
  const match = weldId.match(/^(.*?)(\d+)$/)
  if (!match) {
    return null
  }

  const prefix = match[1] ?? ''
  const numericPortion = match[2] ?? ''

  // Determine padding length (count leading zeros + 1 digit minimum)
  const paddingLength = numericPortion.startsWith('0') ? numericPortion.length : 0

  return {
    prefix,
    paddingLength,
    hasPrefix: prefix.length > 0,
  }
}

/**
 * Parses a weld ID to extract the numeric portion
 *
 * @param weldId The weld ID to parse
 * @param pattern The expected pattern
 * @returns The numeric portion, or null if invalid
 */
export function parseWeldNumber(weldId: string, pattern: WeldPattern): number | null {
  if (!weldId) {
    return null
  }

  // Check if the weld ID starts with the expected prefix
  if (pattern.hasPrefix) {
    if (!weldId.startsWith(pattern.prefix)) {
      return null
    }
    // Extract the numeric portion after the prefix
    const numericPart = weldId.slice(pattern.prefix.length)
    const parsed = parseInt(numericPart, 10)
    return isNaN(parsed) ? null : parsed
  } else {
    // No prefix - the entire string should be numeric
    const parsed = parseInt(weldId, 10)
    return isNaN(parsed) ? null : parsed
  }
}

/**
 * Formats a number as a weld ID according to the pattern
 *
 * @param number The numeric portion of the weld ID
 * @param pattern The pattern to use for formatting
 * @returns The formatted weld ID
 */
export function formatWeldNumber(number: number, pattern: WeldPattern): string {
  // Convert number to string with padding if required
  let numericPart = number.toString()

  if (pattern.paddingLength > 0) {
    // Pad with zeros to match the padding length
    // If number exceeds padding length, just use the full number
    numericPart = numericPart.padStart(pattern.paddingLength, '0')
  }

  // Add prefix if pattern has one
  return pattern.hasPrefix ? pattern.prefix + numericPart : numericPart
}

/**
 * Finds the next available weld number by detecting the pattern and filling gaps
 *
 * @param existingWeldIds Array of existing weld IDs in the project
 * @returns The next weld ID to use
 */
export function findNextWeldNumber(existingWeldIds: string[]): string {
  // Detect the pattern from existing weld IDs
  const pattern = detectWeldPattern(existingWeldIds)

  // If no existing welds, return the first weld ID
  if (existingWeldIds.length === 0) {
    return formatWeldNumber(1, pattern)
  }

  // Parse all existing weld IDs to get their numeric values
  const existingNumbers = parseAndSortWeldNumbers(existingWeldIds, pattern)

  // Find the first gap in the sequence (if any)
  const firstGap = findFirstGap(existingNumbers)

  if (firstGap !== null) {
    return formatWeldNumber(firstGap, pattern)
  }

  // No gaps found - use the next number after the highest
  const highestNumber = existingNumbers[existingNumbers.length - 1] ?? 0
  return formatWeldNumber(highestNumber + 1, pattern)
}

/**
 * Helper function to parse and sort weld numbers
 */
function parseAndSortWeldNumbers(weldIds: string[], pattern: WeldPattern): number[] {
  const numbers: number[] = []
  for (const weldId of weldIds) {
    const num = parseWeldNumber(weldId, pattern)
    if (num !== null) {
      numbers.push(num)
    }
  }
  return numbers.sort((a, b) => a - b)
}

/**
 * Helper function to find the first gap in a sorted sequence of numbers
 *
 * @param sortedNumbers Sorted array of existing weld numbers
 * @returns The first missing number, or null if no gaps
 */
function findFirstGap(sortedNumbers: number[]): number | null {
  if (sortedNumbers.length === 0) {
    return null
  }

  const lowestNumber = sortedNumbers[0] ?? 1

  // Special case: sequence starts above 1
  if (lowestNumber > 1) {
    // Check if there are gaps within the existing sequence
    const hasInternalGaps = hasGapsBetweenConsecutive(sortedNumbers)

    // If there are no internal gaps, this is a continuous high-number sequence
    // (e.g., FW-98, FW-99, FW-100). Don't fill from 1, return null to increment
    if (!hasInternalGaps) {
      return null
    }

    // Otherwise, fill from 1
    return 1
  }

  // Find gaps between consecutive numbers
  for (let i = 0; i < sortedNumbers.length - 1; i++) {
    const current = sortedNumbers[i]
    const next = sortedNumbers[i + 1]

    if (current !== undefined && next !== undefined && next - current > 1) {
      return current + 1
    }
  }

  return null
}

/**
 * Helper function to check if there are gaps between consecutive numbers
 */
function hasGapsBetweenConsecutive(sortedNumbers: number[]): boolean {
  for (let i = 0; i < sortedNumbers.length - 1; i++) {
    const current = sortedNumbers[i]
    const next = sortedNumbers[i + 1]
    if (current !== undefined && next !== undefined && next - current > 1) {
      return true
    }
  }
  return false
}
