/**
 * Metadata Discovery Contracts
 *
 * Defines types for analyzing CSV metadata fields and determining which
 * Area, System, and Test Package records need to be created during import.
 */

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
