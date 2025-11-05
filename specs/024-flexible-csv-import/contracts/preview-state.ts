/**
 * Preview State Contracts
 *
 * Defines the consolidated state for the import preview UI.
 * Aggregates column mappings, validation results, metadata discovery,
 * and sample data for user review before import execution.
 */

import type { ColumnMapping } from './column-mapping';
import type { ValidationResult, ParsedRow, ValidationSummary } from './validation';
import type { MetadataDiscoveryResult } from './metadata-discovery';

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
