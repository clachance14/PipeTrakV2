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
 * Build lookup key for deduplication: type::identity_key_json
 */
function buildIdentityLookupKey(componentType: string, identityKey: Record<string, unknown>): string {
  const sortedKey = Object.keys(identityKey).sort().reduce((acc, key) => {
    acc[key] = identityKey[key];
    return acc;
  }, {} as Record<string, unknown>);
  return `${componentType}::${JSON.stringify(sortedKey)}`;
}

/**
 * Query existing component identity keys in bulk
 * Returns Set of lookup keys (component_type::identity_key_json)
 */
async function getExistingIdentityKeys(
  supabase: SupabaseClient,
  projectId: string,
  components: Array<{ component_type: string; identity_key: Record<string, unknown> }>
): Promise<Set<string>> {
  const existingKeys = new Set<string>();
  if (components.length === 0) return existingKeys;

  // Get unique component types from the import
  const types = new Set(components.map(c => c.component_type));

  // Query all existing components for these types in the project
  // (Can't use .in() with JSONB, so we fetch all and filter client-side)
  for (const type of types) {
    const { data, error } = await supabase
      .from('components')
      .select('identity_key')
      .eq('project_id', projectId)
      .eq('component_type', type)
      .eq('is_retired', false);

    if (error) throw new Error(`Failed to check existing components: ${error.message}`);

    for (const row of data || []) {
      existingKeys.add(buildIdentityLookupKey(type, row.identity_key));
    }
  }
  return existingKeys;
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

    // Step 3: Fetch progress templates - LATEST VERSION ONLY
    // Order by version DESC so first occurrence per component type is the latest version
    const { data: templates } = await supabase
      .from('progress_templates')
      .select('id, component_type, version')
      .order('version', { ascending: false });

    // Build map: component_type -> template_id (first entry per type is latest due to ORDER BY)
    const templateMap = new Map<string, string>();
    for (const t of templates || []) {
      const key = t.component_type.toLowerCase();
      if (!templateMap.has(key)) {
        templateMap.set(key, t.id);
      }
    }

    // Step 4: Generate components
    const components: any[] = [];
    const componentsByType: Record<string, number> = {};
    let componentsCreated = 0;
    let componentsUpdated = 0;

    // For threaded_pipe: Track existing aggregates to update
    const threadedPipeAggregates = new Map<string, any>(); // pipe_id -> component data
    // For pipe: Track existing aggregates to update (same aggregate model as threaded_pipe)
    const pipeAggregates = new Map<string, any>(); // pipe_id -> component data

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
      } else if (typeLower === 'pipe') {
        // Pipe: aggregate model (one component per drawing+size+commodity)
        // QTY represents linear feet, not individual components
        const sizeNorm = normalizeSize(row.size);
        const pipeId = `${normalized}-${sizeNorm}-${row.cmdtyCode}-AGG`;
        const lineNumber = String(index + 1); // CSV row number (1-indexed)

        // Check if we've already seen this pipe_id in this import batch
        if (pipeAggregates.has(pipeId)) {
          // Update existing aggregate in this batch
          const existing = pipeAggregates.get(pipeId);
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
            // Initialize milestones for v2 pipe template (hybrid: partial 0-100 + discrete 0/1)
            current_milestones: {
              Receive: 0,
              Erect: 0,
              Connect: 0,
              Support: 0,
              Punch: false,
              Test: false,
              Restore: false
            }
          };
          pipeAggregates.set(pipeId, newAggregate);
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

    // Step 4.5: Process threaded_pipe aggregates using atomic upsert RPC
    // (Prevents race conditions via SELECT...FOR UPDATE row-level locking)
    if (threadedPipeAggregates.size > 0) {
      for (const [pipeId, newAggregate] of threadedPipeAggregates.entries()) {
        // For each line number in this aggregate, call the atomic upsert RPC
        // This ensures concurrent imports don't cause lost updates
        for (const lineNumber of newAggregate.attributes.line_numbers) {
          const { data: upsertResult, error: upsertError } = await supabase
            .rpc('upsert_aggregate_threaded_pipe', {
              p_project_id: payload.projectId,
              p_drawing_id: newAggregate.drawing_id,
              p_template_id: newAggregate.progress_template_id,
              p_identity_key: newAggregate.identity_key,
              p_attributes: {
                ...newAggregate.attributes,
                line_numbers: [] // RPC will manage line_numbers
              },
              p_current_milestones: newAggregate.current_milestones,
              p_area_id: newAggregate.area_id,
              p_system_id: newAggregate.system_id,
              p_test_package_id: newAggregate.test_package_id,
              p_additional_linear_feet: newAggregate.attributes.total_linear_feet / newAggregate.attributes.line_numbers.length,
              p_new_line_number: lineNumber
            });

          if (upsertError) {
            throw new Error(`Failed to upsert threaded_pipe aggregate ${pipeId}: ${upsertError.message}`);
          }

          // Track component creation/update for summary
          if (upsertResult && upsertResult.length > 0) {
            const result = upsertResult[0];
            if (result.was_created) {
              componentsCreated += 1;
            } else {
              componentsUpdated += 1;
            }
          }
        }
      }

      // componentsByType already incremented in main loop (line 308)
    }

    // Step 4.6: Process pipe aggregates (simpler approach - check exists, update or insert)
    if (pipeAggregates.size > 0) {
      for (const [pipeId, newAggregate] of pipeAggregates.entries()) {
        // Check if this pipe aggregate already exists in the database
        // Use ->> for JSONB text extraction in PostgREST
        const { data: existingPipe, error: checkError } = await supabase
          .from('components')
          .select('id, attributes')
          .eq('project_id', payload.projectId)
          .eq('component_type', 'pipe')
          .eq('identity_key->>pipe_id', pipeId)
          .eq('is_retired', false)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = "no rows returned" which is expected for new components
          throw new Error(`Failed to check existing pipe ${pipeId}: ${checkError.message}`);
        }

        if (existingPipe) {
          // Update existing pipe aggregate - add linear feet and line numbers
          const existingLF = (existingPipe.attributes as any)?.total_linear_feet || 0;
          const existingLineNumbers = (existingPipe.attributes as any)?.line_numbers || [];
          const newLineNumbers = [...new Set([...existingLineNumbers, ...newAggregate.attributes.line_numbers])];

          const { error: updateError } = await supabase
            .from('components')
            .update({
              attributes: {
                ...(existingPipe.attributes as any),
                total_linear_feet: existingLF + newAggregate.attributes.total_linear_feet,
                line_numbers: newLineNumbers
              }
            })
            .eq('id', existingPipe.id);

          if (updateError) {
            throw new Error(`Failed to update pipe aggregate ${pipeId}: ${updateError.message}`);
          }
          componentsUpdated += 1;
        } else {
          // Insert new pipe aggregate
          const { error: insertError } = await supabase
            .from('components')
            .insert(newAggregate);

          if (insertError) {
            throw new Error(`Failed to insert pipe aggregate ${pipeId}: ${insertError.message}`);
          }
          componentsCreated += 1;
        }
      }
    }

    // Step 5: Filter out existing components (skip duplicates)
    const existingKeys = await getExistingIdentityKeys(supabase, payload.projectId, components);
    console.log(`[DEBUG] Found ${existingKeys.size} existing identity keys in database`);

    // Log first 3 existing keys for debugging
    const existingKeysArray = Array.from(existingKeys);
    if (existingKeysArray.length > 0) {
      console.log(`[DEBUG] Sample existing keys:`, existingKeysArray.slice(0, 3));
    }

    const newComponents: typeof components = [];
    let componentsSkipped = 0;

    // Log first 3 new component keys for comparison
    const sampleNewKeys = components.slice(0, 3).map(c => buildIdentityLookupKey(c.component_type, c.identity_key));
    console.log(`[DEBUG] Sample new component keys:`, sampleNewKeys);

    for (const component of components) {
      const lookupKey = buildIdentityLookupKey(component.component_type, component.identity_key);
      if (existingKeys.has(lookupKey)) {
        componentsSkipped++;
      } else {
        newComponents.push(component);
      }
    }
    console.log(`[DEBUG] Components to insert: ${newComponents.length}, skipped: ${componentsSkipped}`);

    // Step 6: Insert only NEW components in batches
    const BATCH_SIZE = 1000;
    for (let i = 0; i < newComponents.length; i += BATCH_SIZE) {
      const batch = newComponents.slice(i, i + BATCH_SIZE);

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
      componentsCreated: newComponents.length + componentsCreated,
      componentsUpdated,
      componentsSkipped,
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
      componentsSkipped: 0,
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
