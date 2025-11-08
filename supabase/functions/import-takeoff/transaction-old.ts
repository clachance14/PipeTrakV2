/**
 * Transaction Handler for Import Takeoff
 * Manages PostgreSQL transactions for drawing and component creation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { CsvRow } from './parser.ts';
import { ParsedRow, MetadataToCreate, ImportResult } from './types.ts';
import { upsertMetadata, linkComponentToMetadata } from './metadata-upsert.ts';

/**
 * Normalize drawing number (MUST match database function normalize_drawing_number)
 * Database does: UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))
 * This means: UPPER, TRIM, collapse multiple spaces to single space
 * Does NOT remove hyphens or leading zeros
 */
function normalizeDrawing(raw: string): string {
  return raw
    .trim()                          // TRIM
    .toUpperCase()                   // UPPER
    .replace(/\s+/g, ' ');          // Collapse multiple spaces to single space
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
    .replace(/["'\s]/g, '')    // Remove quotes and spaces
    .replace(/\//g, 'X')       // Replace / with X for URL safety (1/2 → 1X2)
    .toUpperCase();
}

/**
 * Generate identity key for component (drawing-scoped, size-aware)
 */
function generateIdentityKey(
  drawingNorm: string,
  size: string,
  cmdtyCode: string,
  index: number,
  type: string
): string {
  const normalizedSize = normalizeSize(size);

  if (type === 'Instrument') {
    return `${drawingNorm}-${normalizedSize}-${cmdtyCode}`;
  }

  const suffix = String(index).padStart(3, '0');
  return `${drawingNorm}-${normalizedSize}-${cmdtyCode}-${suffix}`;
}

/**
 * Process CSV rows and create drawings + components
 */
export async function processImport(
  supabaseUrl: string,
  serviceRoleKey: string,
  projectId: string,
  rows: CsvRow[]
): Promise<{
  success: boolean;
  drawingsCreated: number;
  componentsCreated: number;
  rowsProcessed: number;
  rowsSkipped: number;
  error?: string;
}> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Step 1: Collect unique drawings from CSV (dedupe within file using normalized names)
    const drawingsMap = new Map<string, string>(); // normalized -> raw

    rows.forEach(row => {
      const normalized = normalizeDrawing(row.DRAWING);
      if (!drawingsMap.has(normalized)) {
        drawingsMap.set(normalized, row.DRAWING);
      }
    });

    // Step 2: Check for existing drawings (idempotent import support)
    const drawingNorms = Array.from(drawingsMap.keys());

    const { data: existingDrawings, error: existingError } = await supabase
      .from('drawings')
      .select('id, drawing_no_norm')
      .eq('project_id', projectId)
      .in('drawing_no_norm', drawingNorms);

    if (existingError) {
      throw new Error(`Failed to check existing drawings: ${existingError.message}`);
    }

    // Build set of existing normalized drawing names
    const existingNorms = new Set(
      (existingDrawings || []).map(d => d.drawing_no_norm)
    );

    // Filter to only NEW drawings that don't exist yet
    const newDrawingsToInsert = Array.from(drawingsMap.entries())
      .filter(([normalized]) => !existingNorms.has(normalized))
      .map(([, rawDrawing]) => ({
        drawing_no_raw: rawDrawing,
        project_id: projectId,
        is_retired: false
        // Note: drawing_no_norm is NOT set here - database trigger handles it
      }));

    // Step 3: Insert only NEW drawings (skip existing)
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

    // Step 4: Fetch ALL needed drawings (existing + newly created)
    const { data: allDrawings, error: fetchError } = await supabase
      .from('drawings')
      .select('id, drawing_no_norm')
      .eq('project_id', projectId)
      .in('drawing_no_norm', drawingNorms);

    if (fetchError) {
      throw new Error(`Failed to fetch drawings: ${fetchError.message}`);
    }

    if (!allDrawings || allDrawings.length === 0) {
      throw new Error(
        `No drawings found after insert! Expected ${drawingNorms.length} drawings. ` +
        `This indicates a normalization mismatch between TypeScript and database.`
      );
    }

    // Verify we got all expected drawings
    if (allDrawings.length !== drawingNorms.length) {
      const foundNorms = new Set(allDrawings.map(d => d.drawing_no_norm));
      const missing = drawingNorms.filter(n => !foundNorms.has(n));

      throw new Error(
        `Missing drawings after fetch! Expected ${drawingNorms.length}, got ${allDrawings.length}. ` +
        `Missing: [${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}]`
      );
    }

    // Step 5: Build map of drawing_no_norm -> id
    const drawingIdMap = new Map(
      allDrawings.map(d => [d.drawing_no_norm, d.id])
    );

    // Fetch progress templates
    const { data: templates } = await supabase
      .from('progress_templates')
      .select('id, component_type');

    const templateMap = new Map(
      (templates || []).map(t => [t.component_type.toLowerCase(), t.id])
    );

    // Step 5: Process components
    const components: any[] = [];
    let rowsSkipped = 0;

    rows.forEach((row) => {
      const qty = Number(row.QTY);

      // Skip rows with QTY = 0
      if (qty === 0) {
        rowsSkipped++;
        return;
      }

      const normalized = normalizeDrawing(row.DRAWING);
      const drawingId = drawingIdMap.get(normalized);

      if (!drawingId) {
        throw new Error(
          `Drawing ID not found for "${row.DRAWING}" (normalized: "${normalized}"). ` +
          `This should not happen - the drawing was just created.`
        );
      }

      const cmdtyCode = row['CMDTY CODE'];
      const typeLower = row.TYPE.toLowerCase();
      const templateId = templateMap.get(typeLower);

      // Base component object (shared fields)
      const baseComponent = {
        project_id: projectId,
        component_type: typeLower, // Database expects lowercase component types
        drawing_id: drawingId,
        progress_template_id: templateId || null,
        attributes: {
          spec: row.SPEC || '',
          description: row.DESCRIPTION || '',
          size: row.SIZE || '',
          cmdty_code: cmdtyCode,
          comments: row.Comments || '',
          original_qty: qty
        }
      };

      // Generate type-specific identity keys
      if (typeLower === 'spool') {
        // Spool: unique component identified by spool_id only
        components.push({
          ...baseComponent,
          identity_key: { spool_id: cmdtyCode }
        });

      } else if (typeLower === 'field_weld') {
        // Field_Weld: unique component identified by weld_number only
        components.push({
          ...baseComponent,
          identity_key: { weld_number: cmdtyCode }
        });

      } else {
        // All other types: quantity explosion with drawing_norm/commodity_code/size/seq
        for (let i = 1; i <= qty; i++) {
          components.push({
            ...baseComponent,
            identity_key: {
              drawing_norm: normalized,
              commodity_code: cmdtyCode,
              size: normalizeSize(row.SIZE),
              seq: i
            }
          });
        }
      }
    });

    // Step 6: Insert components in batches (PostgreSQL limit ~65535 parameters)
    const BATCH_SIZE = 1000;
    for (let i = 0; i < components.length; i += BATCH_SIZE) {
      const batch = components.slice(i, i + BATCH_SIZE);

      const { error: componentError } = await supabase
        .from('components')
        .insert(batch);

      if (componentError) {
        throw new Error(`Failed to create components (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${componentError.message}`);
      }
    }

    return {
      success: true,
      drawingsCreated,
      componentsCreated: components.length,
      rowsProcessed: rows.length,
      rowsSkipped
    };
  } catch (error) {
    return {
      success: false,
      drawingsCreated: 0,
      componentsCreated: 0,
      rowsProcessed: 0,
      rowsSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
