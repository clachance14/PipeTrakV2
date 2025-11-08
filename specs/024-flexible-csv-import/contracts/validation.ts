/**
 * Validation Contracts
 *
 * Defines types for CSV row validation and categorization.
 * Three-category system: valid (will import), skipped (warning), error (blocks import).
 */

/**
 * Validation status for a CSV row
 */
export type ValidationStatus = 'valid' | 'skipped' | 'error';

/**
 * Validation issue categories for skipped/error rows
 */
export type ValidationCategory =
  | 'unsupported_type'
  | 'zero_quantity'
  | 'missing_required_field'
  | 'duplicate_identity_key'
  | 'empty_drawing'
  | 'invalid_quantity'
  | 'malformed_data';

/**
 * Valid component types (from existing system)
 */
export type ComponentType =
  | 'Spool'
  | 'Field_Weld'
  | 'Valve'
  | 'Instrument'
  | 'Support'
  | 'Pipe'
  | 'Fitting'
  | 'Flange'
  | 'Tubing'
  | 'Hose'
  | 'Misc_Component'
  | 'Threaded_Pipe';

/**
 * Parsed and normalized row data (for valid rows)
 */
export interface ParsedRow {
  /** Normalized drawing number (uppercase, spaces collapsed) */
  drawing: string;

  /** Component type (case-insensitive, will be lowercased for database) */
  type: ComponentType;

  /** Quantity (integer >= 1 for valid rows) */
  qty: number;

  /** Commodity code (identity key component) */
  cmdtyCode: string;

  /** Normalized size (optional, defaults to "NOSIZE" if empty) */
  size?: string;

  /** Material specification code (optional) */
  spec?: string;

  /** Component description (optional) */
  description?: string;

  /** Comments/notes (optional) */
  comments?: string;

  /** Area name (optional, for metadata linking) */
  area?: string;

  /** System name (optional, for metadata linking) */
  system?: string;

  /** Test package name (optional, for metadata linking) */
  testPackage?: string;

  /** Unmapped CSV columns stored as attributes */
  unmappedFields: Record<string, string>;
}

/**
 * Validation result for a single CSV row
 */
export interface ValidationResult {
  /** 1-indexed row number from CSV (for user reference) */
  rowNumber: number;

  /** Validation status */
  status: ValidationStatus;

  /** Human-readable explanation (required for skipped/error) */
  reason?: string;

  /** Sub-categorization of reason (required for skipped/error) */
  category?: ValidationCategory;

  /** Parsed row data (present only for valid status) */
  data?: ParsedRow;
}

/**
 * Aggregated validation summary
 */
export interface ValidationSummary {
  /** Total rows validated */
  totalRows: number;

  /** Count of valid rows (will be imported) */
  validCount: number;

  /** Count of skipped rows (warnings) */
  skippedCount: number;

  /** Count of error rows (blocks import) */
  errorCount: number;

  /** Whether import can proceed (true if errorCount === 0) */
  canImport: boolean;

  /** Validation results grouped by status */
  resultsByStatus: {
    valid: ValidationResult[];
    skipped: ValidationResult[];
    error: ValidationResult[];
  };

  /** Validation results grouped by category (for error/skipped only) */
  resultsByCategory: Record<ValidationCategory, ValidationResult[]>;
}

/**
 * Validation rules for required fields
 */
export interface ValidationRules {
  /** Required fields that cannot be empty */
  requiredFields: string[];

  /** Valid component types */
  validTypes: ComponentType[];

  /** Maximum row count */
  maxRows: number;

  /** Maximum file size (bytes) */
  maxFileSize: number;
}

/**
 * Default validation rules (from spec requirements)
 */
export const DEFAULT_VALIDATION_RULES: ValidationRules = {
  requiredFields: ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'],
  validTypes: [
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
  ],
  maxRows: 10000,
  maxFileSize: 5 * 1024 * 1024 // 5MB
};
