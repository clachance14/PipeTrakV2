/**
 * Metadata Upsert Module for Import Takeoff
 *
 * Handles metadata (Area, System, Test Package) upsert logic:
 * - ON CONFLICT DO NOTHING semantics
 * - Lookup map generation (name → id)
 * - Component linking via foreign keys
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { MetadataToCreate, MetadataCreated } from './types.ts';

/**
 * Metadata lookup maps (name → record ID)
 */
export interface MetadataLookupMaps {
  areas: Map<string, string>;
  systems: Map<string, string>;
  testPackages: Map<string, string>;
}

/**
 * Result of metadata upsert operation
 */
export interface MetadataUpsertResult {
  lookupMaps: MetadataLookupMaps;
  created: MetadataCreated;
}

/**
 * Upsert metadata (areas, systems, test packages) before component creation
 *
 * Uses ON CONFLICT (name, project_id) DO NOTHING for idempotent imports.
 * Builds lookup maps (name → id) for component linking.
 *
 * @param supabase - Supabase client (service role for bypass RLS)
 * @param projectId - Target project UUID
 * @param metadata - Metadata values to upsert
 * @returns Lookup maps and creation counts
 */
export async function upsertMetadata(
  supabase: SupabaseClient,
  projectId: string,
  metadata: MetadataToCreate
): Promise<MetadataUpsertResult> {
  const lookupMaps: MetadataLookupMaps = {
    areas: new Map(),
    systems: new Map(),
    testPackages: new Map()
  };

  const created: MetadataCreated = {
    areas: 0,
    systems: 0,
    testPackages: 0
  };

  // Upsert areas
  if (metadata.areas.length > 0) {
    const { lookupMap, createdCount } = await upsertMetadataType(
      supabase,
      'areas',
      projectId,
      metadata.areas
    );
    lookupMaps.areas = lookupMap;
    created.areas = createdCount;
  }

  // Upsert systems
  if (metadata.systems.length > 0) {
    const { lookupMap, createdCount } = await upsertMetadataType(
      supabase,
      'systems',
      projectId,
      metadata.systems
    );
    lookupMaps.systems = lookupMap;
    created.systems = createdCount;
  }

  // Upsert test packages
  if (metadata.testPackages.length > 0) {
    const { lookupMap, createdCount } = await upsertMetadataType(
      supabase,
      'test_packages',
      projectId,
      metadata.testPackages
    );
    lookupMaps.testPackages = lookupMap;
    created.testPackages = createdCount;
  }

  return { lookupMaps, created };
}

/**
 * Upsert metadata for a single type (area, system, or test_package)
 *
 * @param supabase - Supabase client
 * @param tableName - Table name ('areas', 'systems', 'test_packages')
 * @param projectId - Project UUID
 * @param values - Unique metadata names to upsert
 * @returns Lookup map (name → id) and count of newly created records
 */
async function upsertMetadataType(
  supabase: SupabaseClient,
  tableName: 'areas' | 'systems' | 'test_packages',
  projectId: string,
  values: string[]
): Promise<{ lookupMap: Map<string, string>; createdCount: number }> {
  // Step 1: Check for existing metadata
  const { data: existingRecords, error: existingError } = await supabase
    .from(tableName)
    .select('id, name')
    .eq('project_id', projectId)
    .in('name', values);

  if (existingError) {
    throw new Error(
      `Failed to check existing ${tableName}: ${existingError.message}`
    );
  }

  // Build set of existing names
  const existingNames = new Set(
    (existingRecords || []).map(r => r.name)
  );

  // Filter to only NEW metadata values
  const newValues = values.filter(name => !existingNames.has(name));

  // Step 2: Insert new metadata (ON CONFLICT DO NOTHING implicit via filtering)
  let createdCount = 0;
  if (newValues.length > 0) {
    const recordsToInsert = newValues.map(name => ({
      name,
      project_id: projectId
    }));

    const { error: insertError } = await supabase
      .from(tableName)
      .insert(recordsToInsert);

    if (insertError) {
      throw new Error(
        `Failed to create ${tableName}: ${insertError.message}`
      );
    }

    createdCount = newValues.length;
  }

  // Step 3: Fetch ALL needed metadata (existing + newly created)
  const { data: allRecords, error: fetchError } = await supabase
    .from(tableName)
    .select('id, name')
    .eq('project_id', projectId)
    .in('name', values);

  if (fetchError) {
    throw new Error(
      `Failed to fetch ${tableName} after upsert: ${fetchError.message}`
    );
  }

  if (!allRecords || allRecords.length !== values.length) {
    throw new Error(
      `Missing ${tableName} after upsert! Expected ${values.length}, got ${allRecords?.length || 0}`
    );
  }

  // Step 4: Build lookup map (name → id)
  const lookupMap = new Map(
    allRecords.map(record => [record.name, record.id])
  );

  return { lookupMap, createdCount };
}

/**
 * Link component to metadata via foreign keys
 *
 * @param row - Parsed row data
 * @param lookupMaps - Metadata lookup maps (name → id)
 * @returns Component metadata foreign key fields
 */
export function linkComponentToMetadata(
  row: { area?: string; system?: string; testPackage?: string },
  lookupMaps: MetadataLookupMaps
): {
  area_id: string | null;
  system_id: string | null;
  test_package_id: string | null;
} {
  return {
    area_id: row.area ? lookupMaps.areas.get(row.area) || null : null,
    system_id: row.system ? lookupMaps.systems.get(row.system) || null : null,
    test_package_id: row.testPackage
      ? lookupMaps.testPackages.get(row.testPackage) || null
      : null
  };
}
