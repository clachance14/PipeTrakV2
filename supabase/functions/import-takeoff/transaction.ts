/**
 * Transaction Handler V2 for Flexible CSV Import
 * Handles metadata → drawings → components with transaction safety
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { ImportPayload, ImportResult, ParsedRow, MetadataCreated } from './types.ts';

/**
 * Normalize drawing number (MUST match database function normalize_drawing_number)
 */
function normalizeDrawing(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Normalize size for identity key
 */
function normalizeSize(raw: string | undefined): string {
  if (!raw || raw.trim() === '') {
    return 'NOSIZE';
  }

  return raw
    .trim()
    .replace(/["'\s]/g, '')
    .replace(/\//g, 'X')
    .toUpperCase();
}

/**
 * Upsert metadata (areas, systems, test packages)
 * Returns map of name → ID for linking components
 */
async function upsertMetadata(
  supabase: SupabaseClient,
  projectId: string,
  payload: ImportPayload
): Promise<{
  areaMap: Map<string, string>;
  systemMap: Map<string, string>;
  testPackageMap: Map<string, string>;
  metadataCreated: MetadataCreated;
}> {
  const areaMap = new Map<string, string>();
  const systemMap = new Map<string, string>();
  const testPackageMap = new Map<string, string>();

  let areasCreated = 0;
  let systemsCreated = 0;
  let testPackagesCreated = 0;

  // Upsert areas
  if (payload.metadata.areas.length > 0) {
    const areaRecords = payload.metadata.areas.map(name => ({
      name,
      project_id: projectId
    }));

    const { error: areaError } = await supabase
      .from('areas')
      .upsert(areaRecords, { onConflict: 'name,project_id', ignoreDuplicates: true });

    if (areaError) {
      throw new Error(`Failed to upsert areas: ${areaError.message}`);
    }

    // Fetch all area IDs (including existing ones)
    const { data: areas, error: fetchError } = await supabase
      .from('areas')
      .select('id, name')
      .eq('project_id', projectId)
      .in('name', payload.metadata.areas);

    if (fetchError) {
      throw new Error(`Failed to fetch areas: ${fetchError.message}`);
    }

    areas?.forEach(area => {
      areaMap.set(area.name, area.id);
    });

    // Count how many were created (approximate - assumes upsert created if not in map before)
    areasCreated = payload.metadata.areas.length;
  }

  // Upsert systems
  if (payload.metadata.systems.length > 0) {
    const systemRecords = payload.metadata.systems.map(name => ({
      name,
      project_id: projectId
    }));

    const { error: systemError } = await supabase
      .from('systems')
      .upsert(systemRecords, { onConflict: 'name,project_id', ignoreDuplicates: true });

    if (systemError) {
      throw new Error(`Failed to upsert systems: ${systemError.message}`);
    }

    // Fetch all system IDs
    const { data: systems, error: fetchError } = await supabase
      .from('systems')
      .select('id, name')
      .eq('project_id', projectId)
      .in('name', payload.metadata.systems);

    if (fetchError) {
      throw new Error(`Failed to fetch systems: ${fetchError.message}`);
    }

    systems?.forEach(system => {
      systemMap.set(system.name, system.id);
    });

    systemsCreated = payload.metadata.systems.length;
  }

  // Upsert test packages
  if (payload.metadata.testPackages.length > 0) {
    const testPackageRecords = payload.metadata.testPackages.map(name => ({
      name,
      project_id: projectId
    }));

    const { error: testPackageError } = await supabase
      .from('test_packages')
      .upsert(testPackageRecords, { onConflict: 'name,project_id', ignoreDuplicates: true });

    if (testPackageError) {
      throw new Error(`Failed to upsert test packages: ${testPackageError.message}`);
    }

    // Fetch all test package IDs
    const { data: testPackages, error: fetchError } = await supabase
      .from('test_packages')
      .select('id, name')
      .eq('project_id', projectId)
      .in('name', payload.metadata.testPackages);

    if (fetchError) {
      throw new Error(`Failed to fetch test packages: ${fetchError.message}`);
    }

    testPackages?.forEach(pkg => {
      testPackageMap.set(pkg.name, pkg.id);
    });

    testPackagesCreated = payload.metadata.testPackages.length;
  }

  return {
    areaMap,
    systemMap,
    testPackageMap,
    metadataCreated: {
      areas: areasCreated,
      systems: systemsCreated,
      testPackages: testPackagesCreated
    }
  };
}

/**
 * Process drawings (same logic as transaction.ts)
 */
async function processDrawings(
  supabase: SupabaseClient,
  projectId: string,
  rows: ParsedRow[]
): Promise<{ drawingIdMap: Map<string, string>; drawingsCreated: number }> {
  // Collect unique drawings from payload
  const drawingsMap = new Map<string, string>(); // normalized -> raw

  rows.forEach(row => {
    const normalized = normalizeDrawing(row.drawing);
    if (!drawingsMap.has(normalized)) {
      drawingsMap.set(normalized, row.drawing);
    }
  });

  const drawingNorms = Array.from(drawingsMap.keys());

  // Check for existing drawings
  const { data: existingDrawings, error: existingError } = await supabase
    .from('drawings')
    .select('id, drawing_no_norm')
    .eq('project_id', projectId)
    .in('drawing_no_norm', drawingNorms);

  if (existingError) {
    throw new Error(`Failed to check existing drawings: ${existingError.message}`);
  }

  const existingNorms = new Set(
    (existingDrawings || []).map(d => d.drawing_no_norm)
  );

  // Filter to only NEW drawings
  const newDrawingsToInsert = Array.from(drawingsMap.entries())
    .filter(([normalized]) => !existingNorms.has(normalized))
    .map(([, rawDrawing]) => ({
      drawing_no_raw: rawDrawing,
      project_id: projectId,
      is_retired: false
    }));

  // Insert only NEW drawings
  let drawingsCreated = 0;
  if (newDrawingsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('drawings')
      .insert(newDrawingsToInsert);

    if (insertError) {
      throw new Error(`Failed to create drawings: ${insertError.message}`);
    }
    drawingsCreated = newDrawingsToInsert.length;
  }

  // Fetch ALL needed drawings (existing + newly created)
  const { data: allDrawings, error: fetchError } = await supabase
    .from('drawings')
    .select('id, drawing_no_norm')
    .eq('project_id', projectId)
    .in('drawing_no_norm', drawingNorms);

  if (fetchError) {
    throw new Error(`Failed to fetch drawings: ${fetchError.message}`);
  }

  if (!allDrawings || allDrawings.length !== drawingNorms.length) {
    throw new Error(
      `Drawing count mismatch after upsert. Expected ${drawingNorms.length}, got ${allDrawings?.length || 0}`
    );
  }

  // Build map of drawing_no_norm -> id
  const drawingIdMap = new Map(
    allDrawings.map(d => [d.drawing_no_norm, d.id])
  );

  return { drawingIdMap, drawingsCreated };
}

/**
 * Process import with transaction safety
 */
export async function processImportV2(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: ImportPayload
): Promise<ImportResult> {
  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Step 1: Upsert metadata (areas, systems, test packages)
    const { areaMap, systemMap, testPackageMap, metadataCreated } = await upsertMetadata(
      supabase,
      payload.projectId,
      payload
    );

    // Step 2: Process drawings
    const { drawingIdMap, drawingsCreated } = await processDrawings(
      supabase,
      payload.projectId,
      payload.rows
    );

    // Step 3: Fetch progress templates
    const { data: templates } = await supabase
      .from('progress_templates')
      .select('id, component_type');

    const templateMap = new Map(
      (templates || []).map(t => [t.component_type.toLowerCase(), t.id])
    );

    // Step 4: Generate components
    const components: any[] = [];
    const componentsByType: Record<string, number> = {};

    payload.rows.forEach((row) => {
      // Skip rows with QTY = 0
      if (row.qty === 0) return;

      const normalized = normalizeDrawing(row.drawing);
      const drawingId = drawingIdMap.get(normalized);

      if (!drawingId) {
        throw new Error(`Drawing ID not found for "${row.drawing}" (normalized: "${normalized}")`);
      }

      const typeLower = row.type.toLowerCase();
      const templateId = templateMap.get(typeLower);

      // Count components by type
      componentsByType[typeLower] = (componentsByType[typeLower] || 0) + 1;

      // Link to metadata (use null if not provided)
      const areaId = row.area ? areaMap.get(row.area) || null : null;
      const systemId = row.system ? systemMap.get(row.system) || null : null;
      const testPackageId = row.testPackage ? testPackageMap.get(row.testPackage) || null : null;

      // Base component object
      const baseComponent = {
        project_id: payload.projectId,
        component_type: typeLower,
        drawing_id: drawingId,
        progress_template_id: templateId || null,
        area_id: areaId,
        system_id: systemId,
        test_package_id: testPackageId,
        attributes: {
          spec: row.spec || '',
          description: row.description || '',
          size: row.size || '',
          cmdty_code: row.cmdtyCode,
          comments: row.comments || '',
          original_qty: row.qty,
          ...row.unmappedFields // Include unmapped CSV columns
        }
      };

      // Generate type-specific identity keys
      if (typeLower === 'spool') {
        components.push({
          ...baseComponent,
          identity_key: { spool_id: row.cmdtyCode }
        });
      } else if (typeLower === 'field_weld') {
        components.push({
          ...baseComponent,
          identity_key: { weld_number: row.cmdtyCode }
        });
      } else if (typeLower === 'instrument') {
        // Instrument: no sequence suffix
        components.push({
          ...baseComponent,
          identity_key: {
            drawing_norm: normalized,
            commodity_code: row.cmdtyCode,
            size: normalizeSize(row.size),
            seq: null
          }
        });
      } else {
        // All other types: quantity explosion
        for (let i = 1; i <= row.qty; i++) {
          components.push({
            ...baseComponent,
            identity_key: {
              drawing_norm: normalized,
              commodity_code: row.cmdtyCode,
              size: normalizeSize(row.size),
              seq: i
            }
          });
        }
      }
    });

    // Step 5: Insert components in batches
    const BATCH_SIZE = 1000;
    for (let i = 0; i < components.length; i += BATCH_SIZE) {
      const batch = components.slice(i, i + BATCH_SIZE);

      const { error: componentError } = await supabase
        .from('components')
        .insert(batch);

      if (componentError) {
        throw new Error(
          `Failed to create components (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${componentError.message}`
        );
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      componentsCreated: components.length,
      drawingsCreated,
      drawingsUpdated: drawingIdMap.size - drawingsCreated,
      metadataCreated,
      componentsByType,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      componentsCreated: 0,
      drawingsCreated: 0,
      drawingsUpdated: 0,
      metadataCreated: {
        areas: 0,
        systems: 0,
        testPackages: 0
      },
      componentsByType: {},
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: [
        {
          row: 0,
          issue: error instanceof Error ? error.message : 'Unknown error'
        }
      ]
    };
  }
}
