/**
 * Column Mapping Engine
 *
 * Auto-detects CSV column mappings using three-tier algorithm:
 * - Tier 1: Exact match (100% confidence)
 * - Tier 2: Case-insensitive match (95% confidence)
 * - Tier 3: Synonym match (85% confidence)
 *
 * @module column-mapper
 */

import {
  COLUMN_SYNONYMS,
  REQUIRED_FIELDS,
  type ColumnMapping,
  type ColumnMappingResult,
  type ExpectedField,
  type MappingConfidence
} from './types';

/**
 * Maps CSV column headers to expected system fields
 *
 * @param csvColumns - Array of CSV column headers
 * @returns Mapping result with detected mappings, unmapped columns, and missing required fields
 */
export function mapColumns(csvColumns: string[]): ColumnMappingResult {
  const mappings: ColumnMapping[] = [];
  const unmappedColumns: string[] = [];
  const mappedExpectedFields = new Set<ExpectedField>();

  // All possible expected fields (required + optional)
  const allExpectedFields: ExpectedField[] = [
    'DRAWING',
    'TYPE',
    'QTY',
    'CMDTY CODE',
    'SIZE',
    'SPEC',
    'DESCRIPTION',
    'COMMENTS',
    'AREA',
    'SYSTEM',
    'TEST_PACKAGE'
  ];

  // Process each CSV column through three-tier matching
  for (const csvColumn of csvColumns) {
    const trimmedColumn = csvColumn.trim();
    const mapping = detectColumnMapping(trimmedColumn, allExpectedFields, mappedExpectedFields);

    if (mapping) {
      mappings.push(mapping);
      mappedExpectedFields.add(mapping.expectedField);
    } else {
      unmappedColumns.push(csvColumn);
    }
  }

  // Identify missing required fields
  const missingRequiredFields = REQUIRED_FIELDS.filter(
    field => !mappedExpectedFields.has(field)
  );

  return {
    mappings,
    unmappedColumns,
    missingRequiredFields,
    hasAllRequiredFields: missingRequiredFields.length === 0
  };
}

/**
 * Normalizes a CSV column name by removing common marker characters
 *
 * Strips trailing asterisks, plus signs, exclamation marks, and hash symbols
 * that are often used to mark required fields in templates.
 *
 * @param columnName - Raw column name from CSV header
 * @returns Normalized column name
 *
 * @example
 * normalizeColumnName('DRAWING*') → 'DRAWING'
 * normalizeColumnName('TYPE**') → 'TYPE'
 * normalizeColumnName('QTY+') → 'QTY'
 */
function normalizeColumnName(columnName: string): string {
  return columnName.trim().replace(/[*+!#]+$/g, '');
}

/**
 * Detects mapping for a single CSV column using three-tier algorithm
 *
 * @param csvColumn - Trimmed CSV column header
 * @param expectedFields - All possible expected fields
 * @param alreadyMapped - Set of fields already mapped (to prevent duplicates)
 * @returns Column mapping or null if no match found
 */
function detectColumnMapping(
  csvColumn: string,
  expectedFields: ExpectedField[],
  alreadyMapped: Set<ExpectedField>
): ColumnMapping | null {
  // Normalize column name by removing trailing marker characters (*, +, !, #)
  const normalizedColumn = normalizeColumnName(csvColumn);
  const normalizedUpper = normalizedColumn.toUpperCase();

  // Tier 1: Exact match (100% confidence)
  for (const expectedField of expectedFields) {
    if (alreadyMapped.has(expectedField)) {
      continue;
    }

    if (normalizedColumn === expectedField) {
      return {
        csvColumn,
        expectedField,
        confidence: 100,
        matchTier: 'exact'
      };
    }
  }

  // Tier 2: Case-insensitive match (95% confidence)
  for (const expectedField of expectedFields) {
    if (alreadyMapped.has(expectedField)) {
      continue;
    }

    if (normalizedUpper === expectedField) {
      return {
        csvColumn,
        expectedField,
        confidence: 95,
        matchTier: 'case-insensitive'
      };
    }
  }

  // Tier 3: Synonym match (85% confidence)
  for (const expectedField of expectedFields) {
    if (alreadyMapped.has(expectedField)) {
      continue;
    }

    const synonyms = COLUMN_SYNONYMS[expectedField];
    if (synonyms) {
      // Check if CSV column matches any synonym (case-insensitive)
      const matchesSynonym = synonyms.some(
        synonym => synonym.toUpperCase() === normalizedUpper
      );

      if (matchesSynonym) {
        return {
          csvColumn,
          expectedField,
          confidence: 85,
          matchTier: 'synonym'
        };
      }
    }
  }

  // No match found
  return null;
}

/**
 * Gets confidence level for a specific expected field from mapping result
 *
 * @param result - Column mapping result
 * @param field - Expected field to check
 * @returns Confidence level or null if field not mapped
 */
export function getFieldConfidence(
  result: ColumnMappingResult,
  field: ExpectedField
): MappingConfidence | null {
  const mapping = result.mappings.find(m => m.expectedField === field);
  return mapping?.confidence ?? null;
}

/**
 * Gets CSV column name for a specific expected field
 *
 * @param result - Column mapping result
 * @param field - Expected field to check
 * @returns CSV column name or null if field not mapped
 */
export function getCSVColumn(
  result: ColumnMappingResult,
  field: ExpectedField
): string | null {
  const mapping = result.mappings.find(m => m.expectedField === field);
  return mapping?.csvColumn ?? null;
}

/**
 * Creates a lookup map from CSV column names to expected fields
 *
 * Useful for quickly translating CSV row data to normalized field names
 *
 * @param result - Column mapping result
 * @returns Map of CSV column → expected field
 */
export function createColumnLookupMap(
  result: ColumnMappingResult
): Map<string, ExpectedField> {
  const map = new Map<string, ExpectedField>();

  for (const mapping of result.mappings) {
    map.set(mapping.csvColumn, mapping.expectedField);
  }

  return map;
}
