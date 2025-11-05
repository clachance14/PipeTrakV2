/**
 * CSV Import Type Contracts
 *
 * Consolidated type definitions for the flexible CSV import feature.
 * Defines types for column mapping, validation, metadata discovery,
 * preview state, and Edge Function payload/response.
 *
 * @module csv-import.types
 */

// ============================================================================
// Column Mapping Types
// ============================================================================

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

// ============================================================================
// Validation Types
// ============================================================================

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

// ============================================================================
// Metadata Discovery Types
// ============================================================================

/**
 * Metadata type categories
 */
export type MetadataType = 'area' | 'system' | 'test_package';

/**
 * Metadata value with existence status
 */
export interface MetadataDiscovery {
  /** Metadata type */
  type: MetadataType;

  /** Unique metadata name from CSV */
  value: string;

  /** Whether record already exists in database */
  exists: boolean;

  /** Database ID if exists (null if will be created) */
  recordId: string | null;
}

/**
 * Metadata discovery results grouped by type
 */
export interface MetadataDiscoveryResult {
  /** Unique area values found in CSV */
  areas: MetadataDiscovery[];

  /** Unique system values found in CSV */
  systems: MetadataDiscovery[];

  /** Unique test package values found in CSV */
  testPackages: MetadataDiscovery[];

  /** Total unique metadata values */
  totalCount: number;

  /** Count of metadata values that already exist */
  existingCount: number;

  /** Count of metadata values that will be created */
  willCreateCount: number;
}

/**
 * Metadata values to create during import
 */
export interface MetadataToCreate {
  /** Area names to create */
  areas: string[];

  /** System names to create */
  systems: string[];

  /** Test package names to create */
  testPackages: string[];
}

/**
 * Metadata creation result from server
 */
export interface MetadataCreated {
  /** Count of areas created */
  areas: number;

  /** Count of systems created */
  systems: number;

  /** Count of test packages created */
  testPackages: number;
}

/**
 * Metadata lookup map (name → record ID)
 * Used to link components to metadata after upsert
 */
export interface MetadataLookupMap {
  /** Area name → area ID */
  areas: Map<string, string>;

  /** System name → system ID */
  systems: Map<string, string>;

  /** Test package name → test package ID */
  testPackages: Map<string, string>;
}

// ============================================================================
// Preview State Types
// ============================================================================

/**
 * Component counts by type for preview display
 */
export interface ComponentCounts {
  [type: string]: number;
}

/**
 * Aggregated state for import preview UI
 */
export interface ImportPreviewState {
  /** Uploaded CSV filename */
  fileName: string;

  /** File size in bytes */
  fileSize: number;

  /** Total CSV rows (excluding header) */
  totalRows: number;

  /** Count of rows that will be imported */
  validRows: number;

  /** Count of rows skipped with warnings */
  skippedRows: number;

  /** Count of rows with blocking errors */
  errorRows: number;

  /** Detected column mappings */
  columnMappings: ColumnMapping[];

  /** Validation results for all rows */
  validationResults: ValidationResult[];

  /** Validation summary (aggregated) */
  validationSummary: ValidationSummary;

  /** Metadata analysis grouped by type */
  metadataDiscovery: MetadataDiscoveryResult;

  /** First 10 valid rows for preview table */
  sampleData: ParsedRow[];

  /** Count of components by type */
  componentCounts: ComponentCounts;

  /** Whether import can proceed (true if errorRows === 0) */
  canImport: boolean;
}

/**
 * Preview section expansion state (for lazy rendering)
 */
export interface PreviewSectionState {
  /** File summary section always visible */
  fileSummary: true;

  /** Column mappings section expandable */
  columnMappings: boolean;

  /** Metadata analysis section expandable */
  metadataAnalysis: boolean;

  /** Validation results section (expanded if warnings/errors) */
  validationResults: boolean;

  /** Sample data table always visible */
  sampleData: true;

  /** Import summary section always visible */
  importSummary: true;
}

/**
 * Preview UI props (for component interface)
 */
export interface ImportPreviewProps {
  /** Preview state data */
  state: ImportPreviewState;

  /** Callback when user cancels (returns to upload) */
  onCancel: () => void;

  /** Callback when user confirms import */
  onConfirm: () => Promise<void>;

  /** Loading state during import execution */
  isImporting?: boolean;
}

// ============================================================================
// Import Payload Types
// ============================================================================

/**
 * Request payload sent from client to Edge Function
 */
export interface ImportPayload {
  /** Target project UUID */
  projectId: string;

  /** Array of validated component data (only valid rows) */
  rows: ParsedRow[];

  /** Detected column mappings (for audit trail) */
  columnMappings: ColumnMapping[];

  /** Metadata values that need creation */
  metadata: MetadataToCreate;
}

/**
 * Response from Edge Function after import execution
 */
export interface ImportResult {
  /** True if all components created, false if transaction rolled back */
  success: boolean;

  /** Count of components inserted (0 if success=false) */
  componentsCreated: number;

  /** Count of new drawings created */
  drawingsCreated: number;

  /** Count of existing drawings reused */
  drawingsUpdated: number;

  /** Counts of metadata records created */
  metadataCreated: MetadataCreated;

  /** Components created per type */
  componentsByType: Record<string, number>;

  /** Server-side processing time in milliseconds */
  duration: number;

  /** Error message if success=false */
  error?: string;

  /** Detailed error information (row numbers, specific issues) */
  details?: ErrorDetail[];
}

/**
 * Detailed error information for failed imports
 */
export interface ErrorDetail {
  /** CSV row number */
  row: number;

  /** Specific problem */
  issue: string;

  /** Drawing number for context */
  drawing?: string;
}

/**
 * Edge Function error response (HTTP error status)
 */
export interface ImportErrorResponse {
  /** Error message */
  error: string;

  /** HTTP status code */
  statusCode: number;

  /** Additional context (optional) */
  details?: unknown;
}

/**
 * Payload size validation result
 */
export interface PayloadSizeCheck {
  /** Payload size in bytes */
  sizeInBytes: number;

  /** Payload size in MB */
  sizeInMB: number;

  /** Whether payload is within limit */
  withinLimit: boolean;

  /** Maximum allowed size in MB */
  maxSizeMB: number;
}

/**
 * Maximum Edge Function payload size (6MB limit, use 5.5MB threshold for safety)
 */
export const MAX_PAYLOAD_SIZE_MB = 5.5;

/**
 * Maximum Edge Function payload size in bytes
 */
export const MAX_PAYLOAD_SIZE_BYTES = MAX_PAYLOAD_SIZE_MB * 1024 * 1024;
