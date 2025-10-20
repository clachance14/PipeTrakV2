import type { IdentityKey, ComponentType } from '@/types/drawing-table.types'

/**
 * Formats an identity key JSONB object into a human-readable display string
 *
 * Format examples:
 * - Non-instruments: "VBALU-001 2" (1)" or "EL90-150 1X2 (2)"
 * - Instruments: "ME-55402 1X2" (no sequential suffix)
 * - NOSIZE: Omit size from display
 *
 * @param key - The identity key JSONB object from database
 * @param type - The component type (determines formatting rules)
 * @returns Formatted display string
 */
export function formatIdentityKey(key: IdentityKey, type: ComponentType): string {
  const { commodity_code, size, seq } = key

  // Check if size should be displayed
  const hasSize = size && size !== 'NOSIZE' && size !== ''

  // Format size with inch symbol for numeric sizes
  let sizeDisplay = ''
  if (hasSize) {
    // Add inch symbol (") for numeric sizes only (not fractional like "1X2")
    const isNumericSize = /^\d+$/.test(size)
    sizeDisplay = isNumericSize ? `${size}"` : size
  }

  // Instruments don't include sequential suffix
  if (type === 'instrument') {
    if (sizeDisplay) {
      return `${commodity_code} ${sizeDisplay}`.trim()
    }
    return commodity_code.trim()
  }

  // Non-instruments include (seq) suffix
  if (sizeDisplay) {
    return `${commodity_code} ${sizeDisplay} (${seq})`.trim()
  }
  return `${commodity_code} (${seq})`.trim()
}
