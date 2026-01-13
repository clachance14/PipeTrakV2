/**
 * Sort weld sizes in numeric order (handles fractions like "1/2")
 * Examples: "1/2\"", "1\"", "2\"", "10\"" → sorted numerically, not alphabetically
 *
 * Handles:
 * - Whole numbers: "1", "2", "10"
 * - Fractions: "1/2", "3/4"
 * - Mixed: "1-1/2" (parses the whole number part)
 * - With or without quotes: "2\"" or "2"
 */
export function sortWeldSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    return parseSize(a) - parseSize(b)
  })
}

/**
 * Parse a weld size string to a numeric value for sorting
 */
function parseSize(s: string): number {
  // Handle mixed format like "1-1/2" (1.5)
  const mixedMatch = s.match(/(\d+)-(\d+)\/(\d+)/)
  if (mixedMatch && mixedMatch[1] && mixedMatch[2] && mixedMatch[3]) {
    const whole = parseInt(mixedMatch[1], 10)
    const numerator = parseInt(mixedMatch[2], 10)
    const denominator = parseInt(mixedMatch[3], 10)
    return whole + numerator / denominator
  }

  // Handle simple fractions like "1/2"
  const fractionMatch = s.match(/(\d+)\/(\d+)/)
  if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
    return parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10)
  }

  // Handle whole numbers
  const wholeMatch = s.match(/(\d+)/)
  if (wholeMatch && wholeMatch[1]) {
    return parseInt(wholeMatch[1], 10)
  }

  // Non-numeric strings sort to the beginning (0)
  return 0
}
