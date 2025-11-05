/**
 * Metadata Analyzer
 *
 * Analyzes CSV import data to discover metadata values (Area, System, Test Package)
 * and check which records already exist in database vs. need to be created.
 *
 * @module metadata-analyzer
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ParsedRow,
  MetadataDiscovery,
  MetadataDiscoveryResult,
  MetadataType
} from '@/types/csv-import.types';

/**
 * Unique metadata values extracted from CSV rows
 */
export interface UniqueMetadataValues {
  areas: string[];
  systems: string[];
  testPackages: string[];
}

/**
 * Extract unique metadata values from ParsedRow[]
 *
 * Uses Set for deduplication, filters out undefined/empty values.
 *
 * @param rows - Validated ParsedRow[] from CSV
 * @returns Unique metadata values by type
 */
export function extractUniqueMetadata(rows: ParsedRow[]): UniqueMetadataValues {
  const areas = new Set<string>();
  const systems = new Set<string>();
  const testPackages = new Set<string>();

  for (const row of rows) {
    // Extract area values (filter out undefined/empty)
    if (row.area && row.area.trim() !== '') {
      areas.add(row.area);
    }

    // Extract system values (filter out undefined/empty)
    if (row.system && row.system.trim() !== '') {
      systems.add(row.system);
    }

    // Extract test package values (filter out undefined/empty)
    if (row.testPackage && row.testPackage.trim() !== '') {
      testPackages.add(row.testPackage);
    }
  }

  return {
    areas: Array.from(areas),
    systems: Array.from(systems),
    testPackages: Array.from(testPackages)
  };
}

/**
 * Result of existence check for a single metadata type
 */
interface MetadataExistenceCheckResult {
  areas: MetadataDiscovery[];
  systems: MetadataDiscovery[];
  testPackages: MetadataDiscovery[];
}

/**
 * Check which metadata values already exist in database
 *
 * Performs batch queries using .in() clause for each metadata type.
 * Respects RLS filtering by project_id.
 *
 * @param supabase - Supabase client (user context, respects RLS)
 * @param projectId - Target project UUID
 * @param uniqueValues - Unique metadata values to check
 * @returns MetadataDiscovery[] with exists boolean and recordId
 */
export async function checkMetadataExistence(
  supabase: SupabaseClient,
  projectId: string,
  uniqueValues: UniqueMetadataValues
): Promise<MetadataExistenceCheckResult> {
  const result: MetadataExistenceCheckResult = {
    areas: [],
    systems: [],
    testPackages: []
  };

  // Check areas
  if (uniqueValues.areas.length > 0) {
    const { data: existingAreas, error: areasError } = await supabase
      .from('areas')
      .select('id, name')
      .in('name', uniqueValues.areas)
      .eq('project_id', projectId);

    if (areasError) {
      throw new Error(`Failed to check metadata existence for areas: ${areasError.message}`);
    }

    // Build lookup map for existing areas
    const existingAreasMap = new Map(
      (existingAreas || []).map(area => [area.name, area.id])
    );

    // Create MetadataDiscovery entries
    result.areas = uniqueValues.areas.map(value => ({
      type: 'area' as MetadataType,
      value,
      exists: existingAreasMap.has(value),
      recordId: existingAreasMap.get(value) || null
    }));
  }

  // Check systems
  if (uniqueValues.systems.length > 0) {
    const { data: existingSystems, error: systemsError } = await supabase
      .from('systems')
      .select('id, name')
      .in('name', uniqueValues.systems)
      .eq('project_id', projectId);

    if (systemsError) {
      throw new Error(`Failed to check metadata existence for systems: ${systemsError.message}`);
    }

    // Build lookup map for existing systems
    const existingSystemsMap = new Map(
      (existingSystems || []).map(system => [system.name, system.id])
    );

    // Create MetadataDiscovery entries
    result.systems = uniqueValues.systems.map(value => ({
      type: 'system' as MetadataType,
      value,
      exists: existingSystemsMap.has(value),
      recordId: existingSystemsMap.get(value) || null
    }));
  }

  // Check test packages
  if (uniqueValues.testPackages.length > 0) {
    const { data: existingTestPackages, error: testPackagesError } = await supabase
      .from('test_packages')
      .select('id, name')
      .in('name', uniqueValues.testPackages)
      .eq('project_id', projectId);

    if (testPackagesError) {
      throw new Error(`Failed to check metadata existence for test_packages: ${testPackagesError.message}`);
    }

    // Build lookup map for existing test packages
    const existingTestPackagesMap = new Map(
      (existingTestPackages || []).map(pkg => [pkg.name, pkg.id])
    );

    // Create MetadataDiscovery entries
    result.testPackages = uniqueValues.testPackages.map(value => ({
      type: 'test_package' as MetadataType,
      value,
      exists: existingTestPackagesMap.has(value),
      recordId: existingTestPackagesMap.get(value) || null
    }));
  }

  return result;
}

/**
 * Analyze metadata from CSV rows
 *
 * Combines extraction and existence check into single operation.
 * Returns MetadataDiscoveryResult with aggregated counts.
 *
 * @param supabase - Supabase client (user context, respects RLS)
 * @param projectId - Target project UUID
 * @param rows - Validated ParsedRow[] from CSV
 * @returns MetadataDiscoveryResult with discovery data and counts
 */
export async function analyzeMetadata(
  supabase: SupabaseClient,
  projectId: string,
  rows: ParsedRow[]
): Promise<MetadataDiscoveryResult> {
  // Step 1: Extract unique metadata values
  const uniqueValues = extractUniqueMetadata(rows);

  // Step 2: Check existence (skip if no metadata)
  const totalCount =
    uniqueValues.areas.length +
    uniqueValues.systems.length +
    uniqueValues.testPackages.length;

  if (totalCount === 0) {
    return {
      areas: [],
      systems: [],
      testPackages: [],
      totalCount: 0,
      existingCount: 0,
      willCreateCount: 0
    };
  }

  const existenceResult = await checkMetadataExistence(
    supabase,
    projectId,
    uniqueValues
  );

  // Step 3: Calculate aggregated counts
  const allDiscoveries = [
    ...existenceResult.areas,
    ...existenceResult.systems,
    ...existenceResult.testPackages
  ];

  const existingCount = allDiscoveries.filter(d => d.exists).length;
  const willCreateCount = allDiscoveries.filter(d => !d.exists).length;

  return {
    areas: existenceResult.areas,
    systems: existenceResult.systems,
    testPackages: existenceResult.testPackages,
    totalCount,
    existingCount,
    willCreateCount
  };
}
