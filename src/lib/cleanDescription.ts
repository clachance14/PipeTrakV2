/**
 * Clean a raw BOM description for component display.
 * Returns the description trimmed and truncated, or null if empty.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const MAX_LENGTH = 80
  if (trimmed.length > MAX_LENGTH) {
    return trimmed.substring(0, MAX_LENGTH) + '...'
  }

  return trimmed
}
