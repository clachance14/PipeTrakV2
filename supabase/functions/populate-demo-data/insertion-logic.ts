/**
 * Insertion Logic: populate-demo-data
 * Feature: 023-demo-data-population
 *
 * Implements bulk population of demo data with natural key lookups,
 * idempotency checks, and performance optimization.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DEMO_SEED_DATA } from './seed-data.ts'
import type {
  PopulateDemoDataRequest,
  PopulateDemoDataResponse
} from './types.ts'

// =====================================================================
// TYPES
// =====================================================================

interface SkeletonLookups {
  areaMap: Map<string, string>      // area name → UUID
  systemMap: Map<string, string>    // system name → UUID
  packageMap: Map<string, string>   // package name → UUID
  welderMap: Map<string, string>    // welder stencil → UUID
  templateMap: Map<string, string>  // component_type → template UUID
}

interface DrawingRecord {
  id: string
  drawing_no_norm: string
}

interface ComponentRecord {
  id: string
  tag: string
}

interface WeldRecord {
  id: string
  weld_number: string
}

// =====================================================================
// MAIN FUNCTION
// =====================================================================

export async function populateDemoData(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string
): Promise<PopulateDemoDataResponse> {
  const startTime = Date.now()
  const errors: string[] = []

  let componentsCreated = 0
  let drawingsCreated = 0
  let weldsCreated = 0
  let milestonesUpdated = 0
  let weldersAssigned = 0

  try {
    console.log('[populate-demo-data] Starting population for project:', projectId)

    // Step 1: Fetch skeleton entities and build lookup maps
    console.log('[populate-demo-data] Step 1: Building natural key lookup maps')
    const lookups = await buildSkeletonLookups(supabase, projectId, organizationId)

    // Step 2: Bulk insert drawings
    console.log('[populate-demo-data] Step 2: Inserting drawings')
    const drawingMap = await insertDrawings(supabase, projectId, organizationId, lookups)
    drawingsCreated = drawingMap.size
    console.log(`[populate-demo-data] Created ${drawingsCreated} drawings`)

    // Step 3: Bulk insert components
    console.log('[populate-demo-data] Step 3: Inserting components')
    const componentMap = await insertComponents(
      supabase,
      projectId,
      organizationId,
      lookups,
      drawingMap
    )
    componentsCreated = componentMap.size
    console.log(`[populate-demo-data] Created ${componentsCreated} components`)

    // Step 4: Get a user ID for created_by field
    console.log('[populate-demo-data] Step 4: Getting user ID for field welds')
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)

    const createdBy = users && users.length > 0 ? users[0].id : '00000000-0000-0000-0000-000000000000'

    // Step 5: Bulk insert field welds
    console.log('[populate-demo-data] Step 5: Inserting field welds')
    const weldMap = await insertFieldWelds(supabase, projectId, componentMap, createdBy)
    weldsCreated = weldMap.size
    console.log(`[populate-demo-data] Created ${weldsCreated} welds`)

    // Step 6: Update component milestones
    console.log('[populate-demo-data] Step 6: Updating component milestones')
    milestonesUpdated += await updateComponentMilestones(supabase, componentMap)
    console.log(`[populate-demo-data] Updated ${milestonesUpdated} component milestones`)

    // Step 7: Update weld milestones
    console.log('[populate-demo-data] Step 7: Updating weld milestones')
    const weldMilestonesUpdated = await updateWeldMilestones(supabase, weldMap)
    milestonesUpdated += weldMilestonesUpdated
    console.log(`[populate-demo-data] Updated ${weldMilestonesUpdated} weld milestones`)

    // Step 8: Assign welders to completed welds
    console.log('[populate-demo-data] Step 8: Assigning welders')
    weldersAssigned = await assignWelders(supabase, weldMap, lookups.welderMap)
    console.log(`[populate-demo-data] Assigned ${weldersAssigned} welders`)

    const executionTimeMs = Date.now() - startTime
    console.log(`[populate-demo-data] Completed in ${executionTimeMs}ms`)

    // Refresh materialized views to update drawing progress counts
    console.log('[populate-demo-data] Refreshing materialized views...')
    try {
      await supabase.rpc('refresh_materialized_views')
      console.log('[populate-demo-data] Materialized views refreshed successfully')
    } catch (refreshError) {
      console.error('[populate-demo-data] Failed to refresh materialized views:', refreshError)
      console.log('[populate-demo-data] Views will be refreshed on next scheduled refresh (60s)')
    }

    return {
      success: true,
      componentsCreated,
      drawingsCreated,
      weldsCreated,
      milestonesUpdated,
      weldersAssigned,
      executionTimeMs
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[populate-demo-data] Error:', errorMessage)
    errors.push(errorMessage)

    const executionTimeMs = Date.now() - startTime

    return {
      success: false,
      componentsCreated,
      drawingsCreated,
      weldsCreated,
      milestonesUpdated,
      weldersAssigned,
      executionTimeMs,
      errors
    }
  }
}

// =====================================================================
// SKELETON LOOKUPS
// =====================================================================

async function buildSkeletonLookups(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string
): Promise<SkeletonLookups> {
  // Fetch areas
  const { data: areas, error: areasError } = await supabase
    .from('areas')
    .select('id, name')
    .eq('project_id', projectId)

  if (areasError) throw new Error(`Failed to fetch areas: ${areasError.message}`)
  if (!areas || areas.length === 0) {
    throw new Error('No areas found. Please run create_demo_skeleton first.')
  }

  // Fetch systems
  const { data: systems, error: systemsError } = await supabase
    .from('systems')
    .select('id, name')
    .eq('project_id', projectId)

  if (systemsError) throw new Error(`Failed to fetch systems: ${systemsError.message}`)
  if (!systems || systems.length === 0) {
    throw new Error('No systems found. Please run create_demo_skeleton first.')
  }

  // Fetch packages
  const { data: packages, error: packagesError } = await supabase
    .from('test_packages')
    .select('id, name')
    .eq('project_id', projectId)

  if (packagesError) throw new Error(`Failed to fetch packages: ${packagesError.message}`)
  if (!packages || packages.length === 0) {
    throw new Error('No packages found. Please run create_demo_skeleton first.')
  }

  // Fetch welders
  const { data: welders, error: weldersError } = await supabase
    .from('welders')
    .select('id, stencil, stencil_norm')
    .eq('project_id', projectId)

  if (weldersError) throw new Error(`Failed to fetch welders: ${weldersError.message}`)
  if (!welders || welders.length === 0) {
    throw new Error('No welders found. Please run create_demo_skeleton first.')
  }

  // Fetch progress templates
  const { data: templates, error: templatesError } = await supabase
    .from('progress_templates')
    .select('id, component_type')
    .eq('version', 1)

  if (templatesError) throw new Error(`Failed to fetch templates: ${templatesError.message}`)
  if (!templates || templates.length === 0) {
    throw new Error('No progress templates found.')
  }

  // Build lookup maps
  const areaMap = new Map(areas.map(a => [a.name, a.id]))
  const systemMap = new Map(systems.map(s => [s.name, s.id]))
  const packageMap = new Map(packages.map(p => [p.name, p.id]))
  const welderMap = new Map(welders.map(w => [w.stencil, w.id]))
  const templateMap = new Map(templates.map(t => [t.component_type, t.id]))

  console.log(`[buildSkeletonLookups] Built maps: ${areaMap.size} areas, ${systemMap.size} systems, ${packageMap.size} packages, ${welderMap.size} welders, ${templateMap.size} templates`)

  return { areaMap, systemMap, packageMap, welderMap, templateMap }
}

// =====================================================================
// DRAWING INSERTION
// =====================================================================

async function insertDrawings(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string,
  lookups: SkeletonLookups
): Promise<Map<string, string>> {
  const drawingsToInsert = DEMO_SEED_DATA.drawings.map(drawing => {
    const areaId = lookups.areaMap.get(drawing.area)
    const systemId = lookups.systemMap.get(drawing.system)

    if (!areaId) throw new Error(`Area not found: ${drawing.area}`)
    if (!systemId) throw new Error(`System not found: ${drawing.system}`)

    return {
      project_id: projectId,
      drawing_no_raw: drawing.drawing_number,
      drawing_no_norm: drawing.drawing_number,
      area_id: areaId,
      system_id: systemId,
      rev: 'A'
    }
  })

  // Bulk insert (duplicates will be ignored via unique constraint)
  const { data: insertedDrawings, error } = await supabase
    .from('drawings')
    .insert(drawingsToInsert)
    .select('id, drawing_no_norm')

  // Ignore duplicate key errors (drawings already exist)
  if (error && !error.message.includes('duplicate key')) {
    throw new Error(`Failed to insert drawings: ${error.message}`)
  }

  // Build lookup map
  const drawingMap = new Map<string, string>(
    (insertedDrawings || []).map((d: DrawingRecord) => [d.drawing_no_norm, d.id])
  )

  // If no drawings were inserted (all duplicates), fetch existing ones
  if (drawingMap.size === 0) {
    const { data: existingDrawings, error: fetchError } = await supabase
      .from('drawings')
      .select('id, drawing_no_norm')
      .eq('project_id', projectId)

    if (fetchError) throw new Error(`Failed to fetch existing drawings: ${fetchError.message}`)

    existingDrawings?.forEach((d: DrawingRecord) => {
      drawingMap.set(d.drawing_no_norm, d.id)
    })
  }

  return drawingMap
}

// =====================================================================
// COMPONENT INSERTION
// =====================================================================

async function insertComponents(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string,
  lookups: SkeletonLookups,
  drawingMap: Map<string, string>
): Promise<Map<string, string>> {
  const componentsToInsert = DEMO_SEED_DATA.components.map(component => {
    const drawingId = drawingMap.get(component.drawing)
    const areaId = lookups.areaMap.get(component.area)
    const systemId = lookups.systemMap.get(component.system)
    const packageId = lookups.packageMap.get(component.package)

    const templateId = lookups.templateMap.get(component.type)

    if (!drawingId) throw new Error(`Drawing not found: ${component.drawing}`)
    if (!areaId) throw new Error(`Area not found: ${component.area}`)
    if (!systemId) throw new Error(`System not found: ${component.system}`)
    if (!packageId) throw new Error(`Package not found: ${component.package}`)
    if (!templateId) throw new Error(`Progress template not found for type: ${component.type}`)

    return {
      project_id: projectId,
      component_type: component.type,
      progress_template_id: templateId,
      identity_key: component.identity,  // Already in correct JSONB format
      drawing_id: drawingId,
      area_id: areaId,
      system_id: systemId,
      test_package_id: packageId,
      attributes: {
        ...component.attributes,
        tag: component.tag  // Store tag in attributes
      }
    }
  })

  // Bulk insert (duplicates will be ignored via unique constraint)
  const { data: insertedComponents, error } = await supabase
    .from('components')
    .insert(componentsToInsert)
    .select('id, attributes')

  // Ignore duplicate key errors (components already exist)
  if (error && !error.message.includes('duplicate key')) {
    throw new Error(`Failed to insert components: ${error.message}`)
  }

  // Build lookup map (tag is stored in attributes.tag)
  const componentMap = new Map<string, string>()
  if (insertedComponents) {
    for (const c of insertedComponents) {
      const tag = (c as any).attributes?.tag
      if (tag) {
        componentMap.set(tag, c.id)
      }
    }
  }

  // If no components were inserted (all duplicates), fetch existing ones
  if (componentMap.size === 0) {
    const { data: existingComponents, error: fetchError} = await supabase
      .from('components')
      .select('id, attributes')
      .eq('project_id', projectId)

    if (fetchError) throw new Error(`Failed to fetch existing components: ${fetchError.message}`)

    if (existingComponents) {
      for (const c of existingComponents) {
        const tag = (c as any).attributes?.tag
        if (tag) {
          componentMap.set(tag, c.id)
        }
      }
    }
  }

  return componentMap
}

// =====================================================================
// FIELD WELD INSERTION
// =====================================================================

async function insertFieldWelds(
  supabase: SupabaseClient,
  projectId: string,
  componentMap: Map<string, string>,
  createdBy: string
): Promise<Map<string, string>> {
  const weldsToInsert = DEMO_SEED_DATA.welds.map(weld => {
    const componentId = componentMap.get(weld.component_tag)

    if (!componentId) throw new Error(`Field weld component not found: ${weld.component_tag}`)

    return {
      component_id: componentId,
      project_id: projectId,
      weld_type: weld.type === 'butt' ? 'BW' : 'SW', // Convert to schema types (BW, SW, FW, TW)
      base_metal: weld.material,
      created_by: createdBy
    }
  })

  // Bulk insert with ON CONFLICT DO NOTHING for idempotency
  const { data: insertedWelds, error } = await supabase
    .from('field_welds')
    .upsert(weldsToInsert, {
      onConflict: 'component_id',
      ignoreDuplicates: true
    })
    .select('id, component_id')

  if (error) throw new Error(`Failed to insert field welds: ${error.message}`)

  // Build lookup map (use weld_number as key by reverse-looking up from component tags)
  const weldMap = new Map<string, string>()

  // Create reverse component map (id -> tag)
  const reverseComponentMap = new Map<string, string>()
  for (const [tag, id] of componentMap.entries()) {
    reverseComponentMap.set(id, tag)
  }

  // Map weld IDs to weld numbers
  for (const weld of DEMO_SEED_DATA.welds) {
    const componentId = componentMap.get(weld.component_tag)
    if (componentId) {
      // Find the inserted weld for this component
      const insertedWeld = (insertedWelds || []).find((w: any) => w.component_id === componentId)
      if (insertedWeld) {
        weldMap.set(weld.weld_number, insertedWeld.id)
      }
    }
  }

  // If no welds were inserted (all duplicates), fetch existing ones
  if (weldMap.size === 0) {
    const fieldWeldComponentIds = Array.from(componentMap.values())
      .filter((id) => {
        const tag = reverseComponentMap.get(id)
        return tag?.startsWith('WELD-')
      })

    if (fieldWeldComponentIds.length > 0) {
      const { data: existingWelds, error: fetchError } = await supabase
        .from('field_welds')
        .select('id, component_id')
        .in('component_id', fieldWeldComponentIds)

      if (fetchError) throw new Error(`Failed to fetch existing welds: ${fetchError.message}`)

      for (const weld of DEMO_SEED_DATA.welds) {
        const componentId = componentMap.get(weld.component_tag)
        if (componentId) {
          const existingWeld = existingWelds?.find((w: any) => w.component_id === componentId)
          if (existingWeld) {
            weldMap.set(weld.weld_number, existingWeld.id)
          }
        }
      }
    }
  }

  return weldMap
}

// =====================================================================
// COMPONENT MILESTONE UPDATES
// =====================================================================

async function updateComponentMilestones(
  supabase: SupabaseClient,
  componentMap: Map<string, string>
): Promise<number> {
  let updatedCount = 0

  // Process milestones in batches
  const batchSize = 50
  const milestones = DEMO_SEED_DATA.milestones

  for (let i = 0; i < milestones.length; i += batchSize) {
    const batch = milestones.slice(i, i + batchSize)

    // Update each component individually (required for milestone logic)
    for (const milestone of batch) {
      const componentId = componentMap.get(milestone.component_tag)
      if (!componentId) {
        console.warn(`[updateComponentMilestones] Component not found: ${milestone.component_tag}`)
        continue
      }

      const updates: Record<string, boolean> = {}
      if (milestone.receive !== undefined) updates.receive = milestone.receive
      if (milestone.install !== undefined) updates.install = milestone.install
      if (milestone.erect !== undefined) updates.erect = milestone.erect
      if (milestone.connect !== undefined) updates.connect = milestone.connect
      if (milestone.punch !== undefined) updates.punch = milestone.punch

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('components')
          .update(updates)
          .eq('id', componentId)

        if (error) {
          console.error(`[updateComponentMilestones] Failed to update ${milestone.component_tag}:`, error.message)
        } else {
          updatedCount++
        }
      }
    }
  }

  return updatedCount
}

// =====================================================================
// WELD MILESTONE UPDATES
// =====================================================================

async function updateWeldMilestones(
  supabase: SupabaseClient,
  weldMap: Map<string, string>
): Promise<number> {
  let updatedCount = 0

  // Process milestones in batches
  const batchSize = 50
  const milestones = DEMO_SEED_DATA.weld_milestones

  for (let i = 0; i < milestones.length; i += batchSize) {
    const batch = milestones.slice(i, i + batchSize)

    // Update each weld individually
    for (const milestone of batch) {
      const weldId = weldMap.get(milestone.weld_number)
      if (!weldId) {
        console.warn(`[updateWeldMilestones] Weld not found: ${milestone.weld_number}`)
        continue
      }

      const updates: Record<string, boolean> = {}
      if (milestone.fit_up !== undefined) updates.fit_up = milestone.fit_up
      if (milestone.weld_made !== undefined) updates.weld_made = milestone.weld_made
      if (milestone.punch !== undefined) updates.punch = milestone.punch

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('field_welds')
          .update(updates)
          .eq('id', weldId)

        if (error) {
          console.error(`[updateWeldMilestones] Failed to update ${milestone.weld_number}:`, error.message)
        } else {
          updatedCount++
        }
      }
    }
  }

  return updatedCount
}

// =====================================================================
// WELDER ASSIGNMENTS
// =====================================================================

async function assignWelders(
  supabase: SupabaseClient,
  weldMap: Map<string, string>,
  welderMap: Map<string, string>
): Promise<number> {
  let assignedCount = 0

  // Process assignments in batches
  const batchSize = 50
  const assignments = DEMO_SEED_DATA.weld_assignments

  for (let i = 0; i < assignments.length; i += batchSize) {
    const batch = assignments.slice(i, i + batchSize)

    // Update each weld with welder assignment
    for (const assignment of batch) {
      const weldId = weldMap.get(assignment.weld_number)
      const welderId = welderMap.get(assignment.welder_stencil)

      if (!weldId) {
        console.warn(`[assignWelders] Weld not found: ${assignment.weld_number}`)
        continue
      }

      if (!welderId) {
        console.warn(`[assignWelders] Welder not found: ${assignment.welder_stencil}`)
        continue
      }

      const { error } = await supabase
        .from('field_welds')
        .update({
          welder_id: welderId,
          date_welded: assignment.date_welded
        })
        .eq('id', weldId)

      if (error) {
        console.error(`[assignWelders] Failed to assign welder to ${assignment.weld_number}:`, error.message)
      } else {
        assignedCount++
      }
    }
  }

  return assignedCount
}
