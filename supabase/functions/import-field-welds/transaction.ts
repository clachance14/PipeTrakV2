/**
 * Transaction Processor for Field Weld Import (Feature 014)
 * Handles atomic database inserts with auto-created welders and progress initialization
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParsedRow } from './parser.ts'
import { normalizeDrawingNumber } from './validator.ts'
import { buildFieldWeldComponent, buildFieldWeld } from './schema-helpers.ts'

interface ProcessResult {
  success_count: number
  error_count: number
  errors: Array<{
    row: number
    message: string
  }>
}

/**
 * Parse X-RAY % value from CSV
 * Handles multiple formats:
 * - "5%", "10%", "100%" → 5.0, 10.0, 100.0
 * - "5", "10", "100" → 5.0, 10.0, 100.0
 * - "0.05", "0.1", "1.0" (decimal format) → 5.0, 10.0, 100.0
 * @param xrayValue - Raw X-RAY % value from CSV
 * @returns Numeric percentage (5.0, 10.0, 100.0) or null if empty/invalid
 */
function parseXrayPercentage(xrayValue: string | undefined): number | null {
  if (!xrayValue?.trim()) {
    return null
  }

  // Remove % sign and any whitespace
  const cleanValue = xrayValue.trim().replace('%', '').trim()

  // Parse as float
  let numericValue = parseFloat(cleanValue)

  if (isNaN(numericValue)) {
    return null
  }

  // If value is between 0 and 1 (decimal format like 0.05), convert to percentage
  if (numericValue > 0 && numericValue <= 1) {
    numericValue = numericValue * 100
  }

  // Validate: must be a number between 0 and 100
  if (numericValue < 0 || numericValue > 100) {
    return null
  }

  return numericValue
}

/**
 * Process validated CSV rows in a transaction
 * @param supabase - Supabase client
 * @param rows - Validated CSV rows
 * @param projectId - Project UUID
 * @param userId - User UUID (for created_by)
 * @returns Processing result summary
 */
export async function processTransaction(
  supabase: SupabaseClient,
  rows: ParsedRow[],
  projectId: string,
  userId: string
): Promise<ProcessResult> {
  const errors: Array<{ row: number; message: string }> = []
  let successCount = 0

  try {
    // Step 0: Fetch progress template for field_weld
    const { data: progressTemplate, error: templateError } = await supabase
      .from('progress_templates')
      .select('id')
      .eq('component_type', 'field_weld')
      .limit(1)
      .single()

    if (templateError || !progressTemplate) {
      throw new Error('Progress template not found for field_weld component type')
    }

    const progressTemplateId = progressTemplate.id

    // Step 1: Fetch all drawings for this project (for validation and metadata)
    const { data: drawings, error: drawingsError } = await supabase
      .from('drawings')
      .select('id, drawing_no_norm, area_id, system_id, test_package_id')
      .eq('project_id', projectId)

    if (drawingsError) {
      throw new Error(`Failed to fetch drawings: ${drawingsError.message}`)
    }

    const drawingMap = new Map(
      drawings?.map((d) => [d.drawing_no_norm, d]) || []
    )

    // Step 2: Fetch existing welders for this project
    const { data: existingWelders, error: weldersError } = await supabase
      .from('welders')
      .select('id, stencil_norm')
      .eq('project_id', projectId)

    if (weldersError) {
      throw new Error(`Failed to fetch welders: ${weldersError.message}`)
    }

    const welderMap = new Map(
      existingWelders?.map((w) => [w.stencil_norm, w.id]) || []
    )

    // Step 3: Process rows in batches of 100
    const batchSize = 100
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)

      for (const [batchIndex, row] of batch.entries()) {
        const rowNumber = i + batchIndex + 2 // +2 for header and 1-indexed

        try {
          // Normalize drawing number
          const drawingNoNorm = normalizeDrawingNumber(
            row['Drawing / Isometric Number']
          )

          // Validate drawing exists
          const drawing = drawingMap.get(drawingNoNorm)
          if (!drawing) {
            // Check if similar drawings exist (e.g., with sheet numbers)
            const baseDrawing = drawingNoNorm.split('-')[0] // Get base before first hyphen
            const similarDrawings = Array.from(drawingMap.keys())
              .filter(key => key.startsWith(baseDrawing + '-'))
              .slice(0, 5) // Limit to first 5 matches

            let errorMessage = `Drawing not found: ${row['Drawing / Isometric Number']}`
            if (similarDrawings.length > 0) {
              errorMessage += ` (found similar: ${similarDrawings.join(', ')} - did you forget the sheet number?)`
            } else {
              errorMessage += ` (normalized: ${drawingNoNorm})`
            }

            errors.push({
              row: rowNumber,
              message: errorMessage,
            })
            continue
          }

          // Get or create welder (if stencil provided)
          let welderId: string | null = null
          const welderStencil = row['Welder Stencil']?.trim()
          if (welderStencil) {
            const stencilNorm = welderStencil.toUpperCase().trim()

            // Check if welder already exists
            if (welderMap.has(stencilNorm)) {
              welderId = welderMap.get(stencilNorm)!
            } else {
              // Create new welder
              const { data: newWelder, error: welderError } = await supabase
                .from('welders')
                .insert({
                  project_id: projectId,
                  stencil: welderStencil,
                  stencil_norm: stencilNorm,
                  name: 'Auto-created from import',
                  status: 'unverified',
                  created_by: userId,
                })
                .select('id')
                .single()

              if (welderError) {
                errors.push({
                  row: rowNumber,
                  message: `Failed to create welder: ${welderError.message}`,
                })
                continue
              }

              welderId = newWelder.id
              welderMap.set(stencilNorm, welderId)
            }
          }

          // Create component first (using type-safe helper)
          const componentData = buildFieldWeldComponent({
            projectId,
            drawingId: drawing.id,
            progressTemplateId,
            weldNumber: row['Weld ID Number'],
            areaId: drawing.area_id,
            systemId: drawing.system_id,
            testPackageId: drawing.test_package_id,
            userId,
          })

          const { data: component, error: componentError } = await supabase
            .from('components')
            .insert(componentData)
            .select('id')
            .single()

          if (componentError) {
            errors.push({
              row: rowNumber,
              message: `Failed to create component: ${componentError.message}`,
            })
            continue
          }

          // Parse NDE data
          const ndeType = row['Type of NDE Performed']?.toUpperCase().trim() || null
          const ndeResult = row['NDE Result']?.toUpperCase().trim() || null
          const xrayPercentage = parseXrayPercentage(row['X-RAY %'])
          const ndeRequired = xrayPercentage !== null

          // Validate NDE type if present
          const validNdeTypes = ['RT', 'UT', 'PT', 'MT', 'VT']
          const validatedNdeType = ndeType && validNdeTypes.includes(ndeType)
            ? (ndeType as 'RT' | 'UT' | 'PT' | 'MT' | 'VT')
            : null

          // Validate NDE result if present
          const validNdeResults = ['PASS', 'FAIL', 'PENDING']
          const validatedNdeResult = ndeResult && validNdeResults.includes(ndeResult)
            ? (ndeResult as 'PASS' | 'FAIL' | 'PENDING')
            : null

          // Create field_weld (using type-safe helper)
          const fieldWeldData = buildFieldWeld({
            componentId: component.id,
            projectId,
            weldType: row['Weld Type'].toUpperCase().trim() as 'BW' | 'SW' | 'FW' | 'TW',
            weldSize: row['Weld Size']?.trim() || null,
            schedule: row['Schedule']?.trim() || null,
            baseMetal: row['Base Metal']?.trim() || null,
            spec: row['SPEC']?.trim() || null,
            welderId,
            dateWelded: row['Date Welded']?.trim() || null,
            ndeRequired,
            ndeType: validatedNdeType,
            ndeResult: validatedNdeResult,
            xrayPercentage,
            status: validatedNdeResult === 'FAIL' ? 'rejected' : 'active',
            userId,
          })

          const { error: fieldWeldError } = await supabase
            .from('field_welds')
            .insert(fieldWeldData)

          if (fieldWeldError) {
            // Rollback component creation
            await supabase.from('components').delete().eq('id', component.id)

            errors.push({
              row: rowNumber,
              message: `Failed to create field weld: ${fieldWeldError.message}`,
            })
            continue
          }

          // Initialize progress based on CSV data
          let progressState = {}
          let percentComplete = 0

          if (row['Date Welded']?.trim()) {
            // Weld Complete milestone (use numeric 1, not boolean true)
            progressState = { 'Weld Complete': 1 }
            percentComplete = 95 // Fit-up (30%) + Weld Complete (65%)
          }

          if (ndeResult === 'PASS') {
            // All milestones complete (use numeric 1, not boolean true)
            progressState = {
              'Fit-up': 1,
              'Weld Complete': 1,
              'Accepted': 1,
            }
            percentComplete = 100
          } else if (ndeResult === 'FAIL') {
            // Trigger will mark as 100% rejected (use numeric 1, not boolean true)
            progressState = {
              'Fit-up': 1,
              'Weld Complete': 1,
              'Accepted': 1,
            }
            percentComplete = 100
          }

          // Update component progress if needed
          if (percentComplete > 0) {
            await supabase
              .from('components')
              .update({
                current_milestones: progressState,
                percent_complete: percentComplete,
              })
              .eq('id', component.id)
          }

          successCount++
        } catch (error) {
          errors.push({
            row: rowNumber,
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    return {
      success_count: successCount,
      error_count: errors.length,
      errors,
    }
  } catch (error) {
    // Fatal error - return all as errors
    return {
      success_count: 0,
      error_count: rows.length,
      errors: [
        {
          row: 0,
          message: error instanceof Error ? error.message : 'Transaction failed',
        },
      ],
    }
  }
}
