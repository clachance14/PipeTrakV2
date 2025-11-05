/**
 * Import Payload Contracts
 *
 * Defines request/response types for the Edge Function import API.
 * Client sends structured JSON payload with validated data,
 * server returns detailed import results.
 */

import type { ColumnMapping } from './column-mapping';
import type { ParsedRow } from './validation';
import type { MetadataToCreate, MetadataCreated } from './metadata-discovery';

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
