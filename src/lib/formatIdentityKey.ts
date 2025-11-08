import type { IdentityKey, ComponentType } from '@/types/drawing-table.types'

/**
 * Formats an identity key JSONB object into a human-readable display string
 *
 * Format examples:
 * - Non-instruments (multiple): "VBALU-001 2" 1 of 2" or "EL90-150 1X2 2 of 3"
 * - Non-instruments (single): "VBALU-001 2"" (clean UI, no suffix)
 * - Instruments: "ME-55402 1X2" (no sequential suffix)
 * - NOSIZE: Omit size from display
 *
 * @param key - The identity key JSONB object from database
 * @param type - The component type (determines formatting rules)
 * @param totalCount - Total number of components with this identity (optional)
 * @returns Formatted display string
 */
export function formatIdentityKey(
  key: IdentityKey,
  type: ComponentType,
  totalCount?: number
): string {
  // Spools have unique spool_id - no "x of y" formatting needed
  if (type === 'spool' && 'spool_id' in key) {
    return (key as any).spool_id || 'Unknown Spool'
  }

  // Field welds have unique weld_number - no "x of y" formatting needed
  if (type === 'field_weld' && 'weld_number' in key) {
    return (key as any).weld_number || 'Unknown Weld'
  }

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

  // Non-instruments with multiple instances show "seq of totalCount"
  if (totalCount && totalCount > 1) {
    if (sizeDisplay) {
      return `${commodity_code} ${sizeDisplay} ${seq} of ${totalCount}`.trim()
    }
    return `${commodity_code} ${seq} of ${totalCount}`.trim()
  }

  // Single instances (or when totalCount not provided) show clean UI without suffix
  if (sizeDisplay) {
    return `${commodity_code} ${sizeDisplay}`.trim()
  }
  return commodity_code.trim()
}
