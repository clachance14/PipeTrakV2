/**
 * Column Mapping Contracts
 *
 * Defines types for CSV column detection and mapping to expected system fields.
 * Used during preview phase to show user how CSV columns are interpreted.
 */

/**
 * Matching algorithm tier used for column detection
 */
export type MatchTier = 'exact' | 'case-insensitive' | 'synonym';

/**
 * System field names that CSV columns can map to
 */
export type ExpectedField =
  // Required fields
  | 'DRAWING'
  | 'TYPE'
  | 'QTY'
  | 'CMDTY CODE'
  // Optional standard fields
  | 'SIZE'
  | 'SPEC'
  | 'DESCRIPTION'
  | 'COMMENTS'
  // Optional metadata fields
  | 'AREA'
  | 'SYSTEM'
  | 'TEST_PACKAGE';

/**
 * Confidence level for column mapping (based on match tier)
 * - 100: Exact match
 * - 95: Case-insensitive match
 * - 85: Synonym/partial match
 */
export type MappingConfidence = 100 | 95 | 85;

/**
 * Detected relationship between CSV column and expected field
 */
export interface ColumnMapping {
  /** Original column header from CSV (e.g., "DRAWINGS", "Cmdty Code") */
  csvColumn: string;

  /** System field name this column maps to */
  expectedField: ExpectedField;

  /** Mapping confidence percentage (100, 95, or 85) */
  confidence: MappingConfidence;

  /** Algorithm tier used for detection */
  matchTier: MatchTier;
}

/**
 * Result of column mapping process for entire CSV
 */
export interface ColumnMappingResult {
  /** Successfully mapped columns */
  mappings: ColumnMapping[];

  /** CSV columns that couldn't be mapped to any expected field */
  unmappedColumns: string[];

  /** Required fields that weren't found in CSV */
  missingRequiredFields: ExpectedField[];

  /** Whether all required fields are mapped (DRAWING, TYPE, QTY, CMDTY CODE) */
  hasAllRequiredFields: boolean;
}

/**
 * Synonym mapping configuration for Tier 3 matching
 */
export interface SynonymMap {
  [expectedField: string]: string[];
}

/**
 * Default synonym mappings for flexible column detection
 */
export const COLUMN_SYNONYMS: SynonymMap = {
  'DRAWING': ['DRAWINGS', 'DRAWING NUMBER', 'DWG', 'DWG NO', 'DWG NUM'],
  'CMDTY CODE': ['COMMODITY CODE', 'CMDTY', 'COMMODITY', 'CODE', 'PART CODE'],
  'AREA': ['AREAS', 'LOCATION', 'ZONE'],
  'SYSTEM': ['SYSTEMS', 'SYS'],
  'TEST_PACKAGE': ['TEST PACKAGE', 'TEST PKG', 'PKG', 'PACKAGE'],
  'SIZE': ['NOM SIZE', 'NOMINAL SIZE', 'NOMSIZE'],
  'QTY': ['QUANTITY', 'COUNT', 'CNT'],
  'SPEC': ['SPECIFICATION', 'MATERIAL SPEC', 'MAT SPEC'],
  'COMMENTS': ['COMMENT', 'NOTES', 'NOTE', 'REMARKS']
};

/**
 * Required fields that must be present in CSV for import to proceed
 */
export const REQUIRED_FIELDS: ExpectedField[] = [
  'DRAWING',
  'TYPE',
  'QTY',
  'CMDTY CODE'
];
