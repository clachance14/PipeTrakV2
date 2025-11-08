/**
 * Server-Side Payload Validation (Defense-in-Depth)
 * Re-validates payload from client to prevent malicious data
 */

import type { ImportPayload, ErrorDetail, ComponentType } from './types.ts';

const VALID_TYPES: ComponentType[] = [
  'Spool',
  'Field_Weld',
  'Valve',
  'Instrument',
  'Support',
  'Pipe',
  'Fitting',
  'Flange',
  'Tubing',
  'Hose',
  'Misc_Component',
  'Threaded_Pipe'
];

const MAX_PAYLOAD_SIZE_MB = 5.5;
const MAX_PAYLOAD_SIZE_BYTES = MAX_PAYLOAD_SIZE_MB * 1024 * 1024;

export interface PayloadValidationResult {
  valid: boolean;
  errors: ErrorDetail[];
}

/**
 * Validate payload size
 */
export function validatePayloadSize(payload: ImportPayload): PayloadValidationResult {
  const payloadJson = JSON.stringify(payload);
  const sizeInBytes = new TextEncoder().encode(payloadJson).length;

  if (sizeInBytes > MAX_PAYLOAD_SIZE_BYTES) {
    return {
      valid: false,
      errors: [
        {
          row: 0,
          issue: `Payload too large: ${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB (max ${MAX_PAYLOAD_SIZE_MB}MB)`
        }
      ]
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate payload structure
 */
export function validatePayloadStructure(payload: any): PayloadValidationResult {
  const errors: ErrorDetail[] = [];

  // Check required fields exist
  if (!payload.projectId || typeof payload.projectId !== 'string') {
    errors.push({ row: 0, issue: 'Missing or invalid projectId' });
  }

  if (!Array.isArray(payload.rows)) {
    errors.push({ row: 0, issue: 'Missing or invalid rows array' });
    return { valid: false, errors }; // Can't continue without rows
  }

  if (!Array.isArray(payload.columnMappings)) {
    errors.push({ row: 0, issue: 'Missing or invalid columnMappings array' });
  }

  if (!payload.metadata || typeof payload.metadata !== 'object') {
    errors.push({ row: 0, issue: 'Missing or invalid metadata object' });
  } else {
    if (!Array.isArray(payload.metadata.areas)) {
      errors.push({ row: 0, issue: 'metadata.areas must be an array' });
    }
    if (!Array.isArray(payload.metadata.systems)) {
      errors.push({ row: 0, issue: 'metadata.systems must be an array' });
    }
    if (!Array.isArray(payload.metadata.testPackages)) {
      errors.push({ row: 0, issue: 'metadata.testPackages must be an array' });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all rows in payload
 */
export function validateRows(payload: ImportPayload): PayloadValidationResult {
  const errors: ErrorDetail[] = [];

  payload.rows.forEach((row, index) => {
    const rowNumber = index + 1; // 1-indexed for user reference

    // Validate required fields
    if (!row.drawing || row.drawing.trim() === '') {
      errors.push({
        row: rowNumber,
        issue: 'Missing required field: drawing',
        drawing: row.drawing || ''
      });
    }

    if (!row.type) {
      errors.push({
        row: rowNumber,
        issue: 'Missing required field: type',
        drawing: row.drawing
      });
    } else if (!VALID_TYPES.includes(row.type)) {
      errors.push({
        row: rowNumber,
        issue: `Invalid component type: ${row.type}. Expected: ${VALID_TYPES.join(', ')}`,
        drawing: row.drawing
      });
    }

    if (typeof row.qty !== 'number') {
      errors.push({
        row: rowNumber,
        issue: `Invalid qty data type: expected number, got ${typeof row.qty}`,
        drawing: row.drawing
      });
    } else if (!Number.isInteger(row.qty)) {
      errors.push({
        row: rowNumber,
        issue: `Invalid qty: must be integer, got ${row.qty}`,
        drawing: row.drawing
      });
    } else if (row.qty < 0) {
      errors.push({
        row: rowNumber,
        issue: `Invalid qty: must be >= 0, got ${row.qty}`,
        drawing: row.drawing
      });
    }

    if (!row.cmdtyCode || row.cmdtyCode.trim() === '') {
      errors.push({
        row: rowNumber,
        issue: 'Missing required field: cmdtyCode',
        drawing: row.drawing
      });
    }

    // Validate unmappedFields is an object
    if (row.unmappedFields && typeof row.unmappedFields !== 'object') {
      errors.push({
        row: rowNumber,
        issue: 'unmappedFields must be an object',
        drawing: row.drawing
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Check for duplicate identity keys within payload
 */
export function checkDuplicateIdentityKeys(payload: ImportPayload): PayloadValidationResult {
  const errors: ErrorDetail[] = [];
  const identityKeyMap = new Map<string, { rowNumber: number; drawing: string }>();

  /**
   * Normalize drawing (same as transaction.ts)
   */
  function normalizeDrawing(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, ' ');
  }

  /**
   * Normalize size (same as transaction.ts)
   */
  function normalizeSize(raw: string | undefined): string {
    if (!raw || raw.trim() === '') {
      return 'NOSIZE';
    }
    return raw.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase();
  }

  payload.rows.forEach((row, index) => {
    const rowNumber = index + 1;

    // Skip rows with QTY = 0 (will be skipped during import)
    if (row.qty === 0) return;

    const drawingNorm = normalizeDrawing(row.drawing);
    const sizeNorm = normalizeSize(row.size);
    const type = row.type.toLowerCase();

    // Generate identity keys for this row
    if (type === 'spool') {
      // Spool: unique by spool_id only
      const identityKey = `spool:${row.cmdtyCode}`;
      const existing = identityKeyMap.get(identityKey);

      if (existing) {
        errors.push({
          row: rowNumber,
          issue: `Duplicate spool ID "${row.cmdtyCode}" (first seen at row ${existing.rowNumber})`,
          drawing: row.drawing
        });
      } else {
        identityKeyMap.set(identityKey, { rowNumber, drawing: row.drawing });
      }
    } else if (type === 'field_weld') {
      // Field_Weld: unique by weld_number only
      const identityKey = `field_weld:${row.cmdtyCode}`;
      const existing = identityKeyMap.get(identityKey);

      if (existing) {
        errors.push({
          row: rowNumber,
          issue: `Duplicate weld number "${row.cmdtyCode}" (first seen at row ${existing.rowNumber})`,
          drawing: row.drawing
        });
      } else {
        identityKeyMap.set(identityKey, { rowNumber, drawing: row.drawing });
      }
    } else if (type === 'instrument') {
      // Instrument: drawing-size-cmdtyCode (NO sequence)
      const identityKey = `${drawingNorm}-${sizeNorm}-${row.cmdtyCode}`;
      const existing = identityKeyMap.get(identityKey);

      if (existing) {
        errors.push({
          row: rowNumber,
          issue: `Duplicate identity key "${identityKey}" (first seen at row ${existing.rowNumber})`,
          drawing: row.drawing
        });
      } else {
        identityKeyMap.set(identityKey, { rowNumber, drawing: row.drawing });
      }
    } else {
      // All other types: quantity explosion with seq
      for (let seq = 1; seq <= row.qty; seq++) {
        const identityKey = `${drawingNorm}-${sizeNorm}-${row.cmdtyCode}-${String(seq).padStart(3, '0')}`;
        const existing = identityKeyMap.get(identityKey);

        if (existing) {
          errors.push({
            row: rowNumber,
            issue: `Duplicate identity key "${identityKey}" (first seen at row ${existing.rowNumber})`,
            drawing: row.drawing
          });
          break; // Only report first duplicate for this row
        } else {
          identityKeyMap.set(identityKey, { rowNumber, drawing: row.drawing });
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate entire payload (size + structure + rows + duplicates)
 */
export function validatePayload(payload: any): PayloadValidationResult {
  // Step 1: Validate structure
  const structureResult = validatePayloadStructure(payload);
  if (!structureResult.valid) {
    return structureResult;
  }

  // Cast to typed payload after structure validation
  const typedPayload = payload as ImportPayload;

  // Step 2: Validate size
  const sizeResult = validatePayloadSize(typedPayload);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  // Step 3: Validate rows
  const rowsResult = validateRows(typedPayload);
  if (!rowsResult.valid) {
    return rowsResult;
  }

  // Step 4: Check for duplicate identity keys
  const duplicatesResult = checkDuplicateIdentityKeys(typedPayload);
  if (!duplicatesResult.valid) {
    return duplicatesResult;
  }

  return { valid: true, errors: [] };
}
