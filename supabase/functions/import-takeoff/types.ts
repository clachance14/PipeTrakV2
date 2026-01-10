/**
 * Type definitions for Import Takeoff Edge Function
 * Matches client-side types from src/types/csv-import.types.ts
 */

export type MatchTier = 'exact' | 'case-insensitive' | 'synonym';
export type ExpectedField =
  | 'DRAWING'
  | 'TYPE'
  | 'QTY'
  | 'CMDTY CODE'
  | 'SIZE'
  | 'SPEC'
  | 'DESCRIPTION'
  | 'COMMENTS'
  | 'AREA'
  | 'SYSTEM'
  | 'TEST_PACKAGE';

export type MappingConfidence = 100 | 95 | 85;

export interface ColumnMapping {
  csvColumn: string;
  expectedField: ExpectedField;
  confidence: MappingConfidence;
  matchTier: MatchTier;
}

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

export interface ParsedRow {
  drawing: string;
  type: ComponentType;
  qty: number;
  cmdtyCode: string;
  size?: string;
  spec?: string;
  description?: string;
  comments?: string;
  area?: string;
  system?: string;
  testPackage?: string;
  unmappedFields: Record<string, string>;
}

export interface MetadataToCreate {
  areas: string[];
  systems: string[];
  testPackages: string[];
}

export interface ImportPayload {
  projectId: string;
  rows: ParsedRow[];
  columnMappings: ColumnMapping[];
  metadata: MetadataToCreate;
}

export interface MetadataCreated {
  areas: number;
  systems: number;
  testPackages: number;
}

export interface ImportResult {
  success: boolean;
  componentsCreated: number;
  componentsUpdated?: number; // For threaded_pipe aggregate updates (Feature 027)
  componentsSkipped?: number; // For duplicate components that already exist in DB
  drawingsCreated: number;
  drawingsUpdated: number;
  metadataCreated: MetadataCreated;
  componentsByType: Record<string, number>;
  duration: number;
  error?: string;
  details?: ErrorDetail[];
}

export interface ErrorDetail {
  row: number;
  issue: string;
  drawing?: string;
}

export interface ValidationError {
  row: number;
  column: string;
  reason: string;
}
