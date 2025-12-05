/**
 * Extracts a sortable string from identity_key based on component type.
 *
 * For standard components with commodity_code like "G4G-1450-10AA":
 * - Extracts line number (1450) and pads it for proper numeric sorting
 * - Uses full commodity_code for secondary sort (suffix)
 *
 * This ensures components are grouped by line number:
 * - All 1425s together, then 1427s, then 1430s, then 1450s
 *
 * @param key - The identity_key JSONB object from database
 * @param componentType - The component type (field_weld, spool, threaded_pipe, etc.)
 * @returns A sortable string that groups components by line number
 */
export function getSortableIdentity(
  key: Record<string, unknown>,
  componentType: string
): string {
  // Field welds: sort by weld_number
  if (componentType === 'field_weld' && key.weld_number) {
    return String(key.weld_number)
  }

  // Spools: sort by spool_id
  if (componentType === 'spool' && key.spool_id) {
    return String(key.spool_id)
  }

  // Threaded pipe: sort by pipe_id
  if (componentType === 'threaded_pipe' && key.pipe_id) {
    return String(key.pipe_id)
  }

  // Standard components: extract line number from commodity_code
  const commodityCode = String(key.commodity_code || '')

  // Pattern: PREFIX-LINENUMBER-SUFFIX (e.g., G4G-1450-10AA)
  // The prefix can be alphanumeric, line number is digits, suffix is everything after
  const match = commodityCode.match(/^([A-Z0-9]+)-(\d+)-(.+)$/i)
  if (match && match[1] && match[2] && match[3]) {
    const prefix = match[1]
    const lineNumber = match[2]
    const suffix = match[3]
    // Pad line number to 6 digits for consistent numeric sorting
    // This ensures 1425 < 1430 < 1450 when sorted as strings
    const paddedLineNum = lineNumber.padStart(6, '0')
    return `${prefix}-${paddedLineNum}-${suffix}`
  }

  // Fallback: return original commodity_code for natural sort
  return commodityCode
}
