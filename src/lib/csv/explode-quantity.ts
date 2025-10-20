/**
 * Quantity Explosion Utility
 * Converts a CSV row with QTY > 1 into discrete component objects
 *
 * Example:
 * CSV row: { DRAWING: "P-001", TYPE: "Valve", QTY: 4, "CMDTY CODE": "VBALU-001", ... }
 * →
 * 4 components:
 * - { identity_key: "P001-VBALU-001-001", component_type: "Valve", ... }
 * - { identity_key: "P001-VBALU-001-002", component_type: "Valve", ... }
 * - { identity_key: "P001-VBALU-001-003", component_type: "Valve", ... }
 * - { identity_key: "P001-VBALU-001-004", component_type: "Valve", ... }
 */

import { generateIdentityKey } from './generate-identity-key';
import { normalizeDrawing } from './normalize-drawing';

export interface CsvRow {
  DRAWING: string;
  TYPE: string;
  QTY: number;
  'CMDTY CODE': string;
  SPEC?: string;
  DESCRIPTION?: string;
  SIZE?: string;
  Comments?: string;
}

export interface Component {
  identity_key: string;
  component_type: string;
  drawing_id: string;
  attributes: {
    spec: string;
    description: string;
    size: string;
    cmdty_code: string;
    comments: string;
    original_qty: number;
  };
}

export function explodeQuantity(row: CsvRow, drawingId: string): Component[] {
  const components: Component[] = [];
  const cmdtyCode = row['CMDTY CODE'];
  const drawingNorm = normalizeDrawing(row.DRAWING);
  const size = row.SIZE || '';

  // Create QTY discrete components (drawing-scoped, size-aware)
  for (let i = 1; i <= row.QTY; i++) {
    const identityKey = generateIdentityKey(drawingNorm, size, cmdtyCode, i, row.QTY, row.TYPE);

    components.push({
      identity_key: identityKey,
      component_type: row.TYPE.toLowerCase(), // Database expects lowercase component types
      drawing_id: drawingId,
      attributes: {
        spec: row.SPEC || '',
        description: row.DESCRIPTION || '',
        size: size,
        cmdty_code: cmdtyCode,
        comments: row.Comments || '',
        original_qty: row.QTY,
      },
    });
  }

  return components;
}
