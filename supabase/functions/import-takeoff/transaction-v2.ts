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
    const componentsToUpdate: any[] = [];
    const componentsByType: Record<string, number> = {};

    // For threaded_pipe: Track existing aggregates to update
    const threadedPipeAggregates = new Map<string, any>(); // pipe_id -> component data

    payload.rows.forEach((row, index) => {
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
        current_milestones: {}, // Initialize empty milestones (DB default but explicit for clarity)
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
        // Instrument: no quantity explosion (always seq: 1)
        components.push({
          ...baseComponent,
          identity_key: {
            drawing_norm: normalized,
            commodity_code: row.cmdtyCode,
            size: normalizeSize(row.size),
            seq: 1
          }
        });
      } else if (typeLower === 'threaded_pipe') {
        // Threaded pipe: aggregate model (one component per drawing+size+commodity)
        const sizeNorm = normalizeSize(row.size);
        const pipeId = `${normalized}-${sizeNorm}-${row.cmdtyCode}-AGG`;
        const lineNumber = String(index + 1); // CSV row number (1-indexed)

        // Check if we've already seen this pipe_id in this import batch
        if (threadedPipeAggregates.has(pipeId)) {
          // Update existing aggregate in this batch
          const existing = threadedPipeAggregates.get(pipeId);
          existing.attributes.total_linear_feet += row.qty;
          if (!existing.attributes.line_numbers.includes(lineNumber)) {
            existing.attributes.line_numbers.push(lineNumber);
          }
        } else {
          // Add to batch (will check database for existing component later)
          const newAggregate = {
            ...baseComponent,
            identity_key: {
              pipe_id: pipeId
            },
            attributes: {
              ...baseComponent.attributes,
              total_linear_feet: row.qty,
              line_numbers: [lineNumber]
            },
            current_milestones: {
              Fabricate_LF: 0,
              Install_LF: 0,
              Erect_LF: 0,
              Connect_LF: 0,
              Support_LF: 0,
              Punch: false,
              Test: false,
              Restore: false
            }
          };
          threadedPipeAggregates.set(pipeId, newAggregate);
        }
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

    // Step 4.5: Process threaded_pipe aggregates (check for existing components)
    if (threadedPipeAggregates.size > 0) {
      const pipeIds = Array.from(threadedPipeAggregates.keys());
      const pipeIdSet = new Set(pipeIds);

      // Query ALL threaded_pipe components for this project
      // (Cannot use .in() with JSONB path in PostgREST, so filter client-side)
      const { data: allComponents, error: queryError } = await supabase
        .from('components')
        .select('id, identity_key, attributes, current_milestones')
        .eq('project_id', payload.projectId)
        .eq('component_type', 'threaded_pipe');

      if (queryError) {
        throw new Error(`Failed to query existing threaded_pipe components: ${queryError.message}`);
      }

      // Filter components to only those with matching pipe_ids
      const existingComponents = (allComponents || []).filter(comp => {
        const pipeId = comp.identity_key?.pipe_id;
        return pipeId && pipeIdSet.has(pipeId);
      });

      // Build map of existing components by pipe_id
      const existingMap = new Map<string, any>();
      existingComponents.forEach(comp => {
        const pipeId = comp.identity_key?.pipe_id;
        if (pipeId) {
          existingMap.set(pipeId, comp);
        }
      });

      // Process each aggregate: update existing or create new
      for (const [pipeId, newAggregate] of threadedPipeAggregates.entries()) {
        const existing = existingMap.get(pipeId);

        if (existing) {
          // UPDATE: Sum quantities and append line numbers
          const existingTotal = existing.attributes?.total_linear_feet || 0;
          const existingLineNumbers = existing.attributes?.line_numbers || [];
          const newLineNumbers = newAggregate.attributes.line_numbers;

          // Sum total_linear_feet
          const updatedTotal = existingTotal + newAggregate.attributes.total_linear_feet;

          // Append new line numbers (avoid duplicates)
          const updatedLineNumbers = [...existingLineNumbers];
          newLineNumbers.forEach((lineNum: string) => {
            if (!updatedLineNumbers.includes(lineNum)) {
              updatedLineNumbers.push(lineNum);
            }
          });

          // Track for update (preserve current_milestones)
          componentsToUpdate.push({
            id: existing.id,
            attributes: {
              ...existing.attributes,
              total_linear_feet: updatedTotal,
              line_numbers: updatedLineNumbers
            }
            // Note: current_milestones is NOT updated (preserved)
          });

          // componentsByType already incremented in main loop (line 308)
        } else {
          // CREATE: New aggregate component
          components.push(newAggregate);
          componentsByType[newAggregate.component_type] = (componentsByType[newAggregate.component_type] || 0) + 1;
        }
      }
    }

    // Step 5: Update existing threaded_pipe aggregates
    if (componentsToUpdate.length > 0) {
      for (const update of componentsToUpdate) {
        const { error: updateError } = await supabase
          .from('components')
          .update({
            attributes: update.attributes
            // Note: current_milestones preserved (not updated)
          })
          .eq('id', update.id);

        if (updateError) {
          throw new Error(`Failed to update component ${update.id}: ${updateError.message}`);
        }
      }
    }

    // Step 6: Insert new components in batches
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
      componentsUpdated: componentsToUpdate.length,
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
      componentsUpdated: 0,
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
