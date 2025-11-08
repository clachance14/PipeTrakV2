/**
 * CSV Import Types Re-export
 *
 * Centralizes all CSV import types for consistent path imports.
 * Re-exports from src/types/csv-import.types.ts
 */

export type {
  // Column Mapping
  MatchTier,
  ExpectedField,
  MappingConfidence,
  ColumnMapping,
  ColumnMappingResult,
  SynonymMap,

  // Validation
  ValidationStatus,
  ValidationCategory,
  ComponentType,
  ParsedRow,
  ValidationResult,
  ValidationSummary,
  ValidationRules,

  // Metadata Discovery
  MetadataType,
  MetadataDiscovery,
  MetadataDiscoveryResult,
  MetadataToCreate,
  MetadataCreated,
  MetadataLookupMap,

  // Preview State
  ComponentCounts,
  ImportPreviewState,
  PreviewSectionState,
  ImportPreviewProps,

  // Import Payload
  ImportPayload,
  ImportResult,
  ErrorDetail,
  ImportErrorResponse,
  PayloadSizeCheck
} from '@/types/csv-import.types';

export {
  // Constants
  COLUMN_SYNONYMS,
  REQUIRED_FIELDS,
  DEFAULT_VALIDATION_RULES,
  MAX_PAYLOAD_SIZE_MB,
  MAX_PAYLOAD_SIZE_BYTES
} from '@/types/csv-import.types';
