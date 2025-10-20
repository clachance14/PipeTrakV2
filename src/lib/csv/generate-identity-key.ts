/**
 * Identity Key Generation Utility
 * Generates unique identity keys for components from CSV rows
 *
 * Rules:
 * 1. Instruments: {DRAWING_NORM}-{SIZE}-{CMDTY CODE}
 *    - Example: P001-HALF-ME-55402
 *
 * 2. All other types: {DRAWING_NORM}-{SIZE}-{CMDTY CODE}-{001..QTY}
 *    - Example: QTY=4, SIZE=2" → P001-2-VBALU-001-001, P001-2-VBALU-001-002, etc.
 *
 * 3. Drawing-scoped, size-aware: Same CMDTY CODE with different sizes are unique
 *    - P001-2-G4G-1412-001 (2" component)
 *    - P001-1-G4G-1412-001 (1" component)
 *
 * 4. Zero-padding: 3 digits (supports 1-999 components per row per drawing)
 */

import { normalizeSize } from './normalize-size';

export function generateIdentityKey(
  drawingNorm: string,  // Normalized drawing number (e.g., "P001")
  size: string,         // Component size (e.g., "2", "1/2", "")
  cmdtyCode: string,
  index: number,  // 1-indexed position in explosion (1 to QTY)
  _qty: number,   // Total quantity from CSV (unused but kept for API consistency)
  type: string    // Component type
): string {
  const sizeNorm = normalizeSize(size);

  // Instruments: DRAWING-SIZE-CMDTY_CODE
  if (type === 'Instrument') {
    return `${drawingNorm}-${sizeNorm}-${cmdtyCode}`;
  }

  // All other types: DRAWING-SIZE-CMDTY_CODE-001, -002, etc.
  const suffix = String(index).padStart(3, '0');
  return `${drawingNorm}-${sizeNorm}-${cmdtyCode}-${suffix}`;
}
