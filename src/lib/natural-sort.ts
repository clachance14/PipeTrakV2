/**
 * Natural/alphanumeric string comparison
 *
 * Treats numbers within strings as numbers for sorting, so:
 * - "file2.txt" < "file10.txt" (not "file10.txt" < "file2.txt")
 * - "P-94011_3 2OF28" < "P-94011_3 10OF28"
 *
 * @param a First string
 * @param b Second string
 * @returns Comparison result (-1, 0, 1)
 */
export function naturalCompare(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g

  const aParts = a.match(regex) || []
  const bParts = b.match(regex) || []

  const maxLength = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''

    // If one is exhausted, shorter comes first
    if (!aPart) return -1
    if (!bPart) return 1

    // Check if both parts are numeric
    const aIsNum = /^\d+$/.test(aPart)
    const bIsNum = /^\d+$/.test(bPart)

    if (aIsNum && bIsNum) {
      // Both are numbers - compare numerically
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10)
      if (diff !== 0) return diff
    } else {
      // At least one is not a number - compare as strings
      const comparison = aPart.localeCompare(bPart)
      if (comparison !== 0) return comparison
    }
  }

  return 0
}
