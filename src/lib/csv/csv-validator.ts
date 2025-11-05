/**
 * CSV Validation Engine
 *
 * Validates CSV rows and categorizes them as:
 * - valid: Will be imported
 * - skipped: Warning (unsupported type, zero quantity)
 * - error: Blocks import (missing required field, duplicate identity key)
 *
 * @module csv-validator
 */

import { normalizeDrawing } from './normalize-drawing';
import { normalizeSize } from './normalize-size';
import { generateIdentityKey } from './generate-identity-key';
import {
  DEFAULT_VALIDATION_RULES,
  type ValidationResult,
  type ValidationSummary,
  type ParsedRow,
  type ComponentType,
  type ExpectedField,
  type ValidationCategory
} from './types';

/**
 * Validates array of CSV rows
 *
 * @param rows - Raw CSV row data as objects
 * @param columnLookupMap - Map of CSV column names to expected fields
 * @returns Array of validation results (one per row)
 */
export function validateRows(
  rows: Record<string, string>[],
  columnLookupMap: Map<string, ExpectedField>
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const identityKeys = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 1; // 1-indexed for user reference

    // Extract field values using column mapping
    const drawing = getFieldValue(row, 'DRAWING', columnLookupMap);
    const type = getFieldValue(row, 'TYPE', columnLookupMap);
    const qtyRaw = getFieldValue(row, 'QTY', columnLookupMap);
    const cmdtyCode = getFieldValue(row, 'CMDTY CODE', columnLookupMap);
    const size = getFieldValue(row, 'SIZE', columnLookupMap);
    const spec = getFieldValue(row, 'SPEC', columnLookupMap);
    const description = getFieldValue(row, 'DESCRIPTION', columnLookupMap);
    const comments = getFieldValue(row, 'COMMENTS', columnLookupMap);
    const area = getFieldValue(row, 'AREA', columnLookupMap);
    const system = getFieldValue(row, 'SYSTEM', columnLookupMap);
    const testPackage = getFieldValue(row, 'TEST_PACKAGE', columnLookupMap);

    // Validate required fields are non-empty
    if (!drawing || drawing.trim() === '') {
      results.push({
        rowNumber,
        status: 'error',
        reason: 'Required field DRAWING is empty',
        category: 'empty_drawing'
      });
      return;
    }

    if (!type || type.trim() === '') {
      results.push({
        rowNumber,
        status: 'error',
        reason: 'Required field TYPE is empty',
        category: 'missing_required_field'
      });
      return;
    }

    if (!cmdtyCode || cmdtyCode.trim() === '') {
      results.push({
        rowNumber,
        status: 'error',
        reason: 'Required field CMDTY CODE is empty',
        category: 'missing_required_field'
      });
      return;
    }

    // Validate quantity
    const qtyValidation = validateQuantity(qtyRaw, rowNumber);
    if (qtyValidation.status !== 'valid') {
      results.push(qtyValidation);
      return;
    }

    const qty = parseInt(qtyRaw ?? '0', 10);

    // Skip zero quantity rows
    if (qty === 0) {
      results.push({
        rowNumber,
        status: 'skipped',
        reason: 'Component quantity is 0',
        category: 'zero_quantity'
      });
      return;
    }

    // Validate component type
    const typeValidation = validateComponentType(type, rowNumber);
    if (typeValidation.status !== 'valid') {
      results.push(typeValidation);
      return;
    }

    // Type assertion is safe here because we just validated the type exists in validTypes
    const validatedType = type.trim() as ComponentType;

    // Normalize values
    const drawingNorm = normalizeDrawing(drawing);
    const sizeNorm = normalizeSize(size);

    // Generate identity key for duplicate detection
    const identityKey = generateIdentityKey(
      drawingNorm,
      size ?? '',
      cmdtyCode,
      1, // First instance for duplicate check
      qty,
      validatedType
    );

    // Check for duplicate identity keys
    if (identityKeys.has(identityKey)) {
      results.push({
        rowNumber,
        status: 'error',
        reason: `Duplicate identity key: ${identityKey}`,
        category: 'duplicate_identity_key'
      });
      return;
    }

    identityKeys.add(identityKey);

    // Collect unmapped fields
    const unmappedFields: Record<string, string> = {};
    for (const [csvColumn, value] of Object.entries(row)) {
      if (!columnLookupMap.has(csvColumn) && value) {
        unmappedFields[csvColumn] = value;
      }
    }

    // Create parsed row data
    const parsedRow: ParsedRow = {
      drawing: drawingNorm,
      type: validatedType,
      qty,
      cmdtyCode,
      size: sizeNorm,
      spec: spec || undefined,
      description: description || undefined,
      comments: comments || undefined,
      area: area || undefined,
      system: system || undefined,
      testPackage: testPackage || undefined,
      unmappedFields
    };

    results.push({
      rowNumber,
      status: 'valid',
      data: parsedRow
    });
  });

  return results;
}

/**
 * Validates quantity field
 */
function validateQuantity(qtyRaw: string | undefined, rowNumber: number): ValidationResult {
  if (!qtyRaw || qtyRaw.trim() === '') {
    return {
      rowNumber,
      status: 'error',
      reason: 'Required field QTY is empty',
      category: 'missing_required_field'
    };
  }

  const qty = parseFloat(qtyRaw);

  if (isNaN(qty)) {
    return {
      rowNumber,
      status: 'error',
      reason: 'QTY must be a number',
      category: 'invalid_quantity'
    };
  }

  if (qty < 0) {
    return {
      rowNumber,
      status: 'error',
      reason: 'QTY must be >= 0',
      category: 'invalid_quantity'
    };
  }

  if (!Number.isInteger(qty)) {
    return {
      rowNumber,
      status: 'error',
      reason: 'QTY must be an integer',
      category: 'invalid_quantity'
    };
  }

  return {
    rowNumber,
    status: 'valid'
  };
}

/**
 * Validates component type against supported types
 */
function validateComponentType(
  type: string,
  rowNumber: number
): ValidationResult {
  const validTypes = DEFAULT_VALIDATION_RULES.validTypes;

  // Case-insensitive comparison
  const normalizedType = type.trim();
  const matchedType = validTypes.find(
    validType => validType.toLowerCase() === normalizedType.toLowerCase()
  );

  if (!matchedType) {
    return {
      rowNumber,
      status: 'skipped',
      reason: `Unsupported component type: ${type}`,
      category: 'unsupported_type'
    };
  }

  return {
    rowNumber,
    status: 'valid'
  };
}

/**
 * Gets field value from CSV row using column lookup map
 */
function getFieldValue(
  row: Record<string, string>,
  expectedField: ExpectedField,
  columnLookupMap: Map<string, ExpectedField>
): string | undefined {
  // Find CSV column that maps to this expected field
  for (const [csvColumn, mappedField] of columnLookupMap.entries()) {
    if (mappedField === expectedField) {
      return row[csvColumn];
    }
  }
  return undefined;
}

/**
 * Creates aggregated validation summary from validation results
 *
 * @param results - Array of validation results
 * @returns Validation summary with counts and groupings
 */
export function createValidationSummary(
  results: ValidationResult[]
): ValidationSummary {
  const valid: ValidationResult[] = [];
  const skipped: ValidationResult[] = [];
  const error: ValidationResult[] = [];

  const resultsByCategory: Partial<Record<ValidationCategory, ValidationResult[]>> = {};

  results.forEach(result => {
    // Group by status
    if (result.status === 'valid') {
      valid.push(result);
    } else if (result.status === 'skipped') {
      skipped.push(result);
    } else if (result.status === 'error') {
      error.push(result);
    }

    // Group by category (for skipped/error only)
    if (result.category) {
      if (!resultsByCategory[result.category]) {
        resultsByCategory[result.category] = [];
      }
      resultsByCategory[result.category]!.push(result);
    }
  });

  return {
    totalRows: results.length,
    validCount: valid.length,
    skippedCount: skipped.length,
    errorCount: error.length,
    canImport: error.length === 0,
    resultsByStatus: {
      valid,
      skipped,
      error
    },
    resultsByCategory: resultsByCategory as Record<ValidationCategory, ValidationResult[]>
  };
}

/**
 * Gets all valid rows from validation results (for import)
 *
 * @param results - Array of validation results
 * @returns Array of parsed rows (only valid status)
 */
export function getValidRows(results: ValidationResult[]): ParsedRow[] {
  return results
    .filter(r => r.status === 'valid' && r.data)
    .map(r => r.data!);
}

/**
 * Gets error details for display
 *
 * @param results - Array of validation results
 * @returns Array of error details with row numbers and reasons
 */
export function getErrorDetails(
  results: ValidationResult[]
): Array<{ rowNumber: number; reason: string; category: ValidationCategory }> {
  return results
    .filter(r => r.status === 'error' && r.reason && r.category)
    .map(r => ({
      rowNumber: r.rowNumber,
      reason: r.reason!,
      category: r.category!
    }));
}

/**
 * Gets skip details for display
 *
 * @param results - Array of validation results
 * @returns Array of skip details with row numbers and reasons
 */
export function getSkipDetails(
  results: ValidationResult[]
): Array<{ rowNumber: number; reason: string; category: ValidationCategory }> {
  return results
    .filter(r => r.status === 'skipped' && r.reason && r.category)
    .map(r => ({
      rowNumber: r.rowNumber,
      reason: r.reason!,
      category: r.category!
    }));
}
