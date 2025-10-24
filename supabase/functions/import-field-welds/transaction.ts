/**
 * Transaction Processor for Field Weld Import (Feature 014)
 * Handles atomic database inserts with auto-created welders and progress initialization
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParsedRow } from './parser.ts'
import { normalizeDrawingNumber } from './validator.ts'

interface ProcessResult {
  success_count: number
  error_count: number
  errors: Array<{
    row: number
    message: string
  }>
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
    // Step 1: Fetch all drawings for this project (for validation)
    const { data: drawings, error: drawingsError } = await supabase
      .from('drawings')
      .select('id, drawing_no_norm')
      .eq('project_id', projectId)

    if (drawingsError) {
      throw new Error(`Failed to fetch drawings: ${drawingsError.message}`)
    }

    const drawingMap = new Map(
      drawings?.map((d) => [d.drawing_no_norm, d.id]) || []
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
          const drawingId = drawingMap.get(drawingNoNorm)
          if (!drawingId) {
            errors.push({
              row: rowNumber,
              message: `Drawing not found: ${row['Drawing / Isometric Number']} (normalized: ${drawingNoNorm})`,
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

          // Create component first
          const { data: component, error: componentError } = await supabase
            .from('components')
            .insert({
              project_id: projectId,
              drawing_id: drawingId,
              type: 'field_weld',
              identity_key: {
                weld_id: row['Weld ID Number'],
              },
              percent_complete: 0,
              progress_state: {},
              created_by: userId,
            })
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
          const ndeRequired = !!row['X-RAY %']?.trim()

          // Create field_weld
          const { error: fieldWeldError } = await supabase
            .from('field_welds')
            .insert({
              component_id: component.id,
              project_id: projectId,
              weld_type: row['Weld Type'].toUpperCase().trim(),
              weld_size: row['Weld Size']?.trim() || null,
              schedule: row['Schedule']?.trim() || null,
              base_metal: row['Base Metal']?.trim() || null,
              spec: row['SPEC']?.trim() || null,
              welder_id: welderId,
              date_welded: row['Date Welded']?.trim() || null,
              nde_required: ndeRequired,
              nde_type: ndeType,
              nde_result: ndeResult,
              status: ndeResult === 'FAIL' ? 'rejected' : 'active',
              created_by: userId,
            })

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
            // Weld Complete milestone
            progressState = { 'Weld Complete': true }
            percentComplete = 95 // Fit-up (30%) + Weld Complete (65%)
          }

          if (ndeResult === 'PASS') {
            // All milestones complete
            progressState = {
              'Fit-up': true,
              'Weld Complete': true,
              'Accepted': true,
            }
            percentComplete = 100
          } else if (ndeResult === 'FAIL') {
            // Trigger will mark as 100% rejected
            progressState = {
              'Fit-up': true,
              'Weld Complete': true,
              'Accepted': true,
            }
            percentComplete = 100
          }

          // Update component progress if needed
          if (percentComplete > 0) {
            await supabase
              .from('components')
              .update({
                progress_state: progressState,
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
