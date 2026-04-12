/**
 * Process Drawing Edge Function
 * Accepts a storage file path, extracts title block and BOM via AI,
 * and stores the results in drawing_bom_items + creates components.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PDFDocument } from 'pdf-lib';
import type { ProcessDrawingRequest, ProcessingResult, TitleBlockData, BomItem } from './types.ts';
import { extractTitleBlock } from './title-block-reader.ts';
import { extractBom } from './bom-extractor.ts';
import { extractSpools } from './spool-extractor.ts';
import { trackGeminiUsage, GEMINI_FLASH, GEMINI_PRO } from './gemini-client.ts';
import { mapBomToComponentType, isTrackedItem, applyThreadedPipeOverrides } from './component-mapper.ts';
import { applyInstrumentFieldOverride, resolveSpecConflict } from './post-processor.ts';
import { buildDrawingBomItem } from './schema-helpers.ts';
import { normalizeDrawing } from '../_shared/normalize-drawing.ts';
import {
  isAggregateType,
  isNoExplosionType,
  isExplodedType,
  generatePipeAggregateId,
  buildIdentityKey,
  buildIdentityLookupKey,
  getDefaultAggregateMilestones,
  normalizeSize,
} from '../_shared/component-builder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Helper: Extract drawing number from file path as fallback
// ---------------------------------------------------------------------------

function extractFilenameAsDrawingNo(filePath: string): string {
  const parts = filePath.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace(/\.pdf$/i, '').replace(/_p\d+$/, '');
}

// ---------------------------------------------------------------------------
// Main processing pipeline
// ---------------------------------------------------------------------------

async function processDrawing(
  projectId: string,
  filePath: string,
  userId: string,
  supabaseAdmin: SupabaseClient,
  pageNumber?: number,
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: false,
    drawingsProcessed: 0,
    componentsCreated: 0,
    bomItemsStored: 0,
    spoolsCreated: 0,
    errors: [],
  };

  // ── Step 1: Fetch PDF from storage ────────────────────────────────────

  const { data: pdfData, error: storageError } = await supabaseAdmin.storage
    .from('drawing-pdfs')
    .download(filePath);

  if (storageError || !pdfData) {
    throw new Error(`Failed to fetch PDF: ${storageError?.message ?? 'No data returned'}`);
  }

  const fullBuffer = await pdfData.arrayBuffer();

  // If pageNumber is specified, extract just that page into a single-page PDF
  let pdfBytes: Uint8Array;
  if (pageNumber && pageNumber >= 1) {
    const srcDoc = await PDFDocument.load(fullBuffer);
    const pageIndex = pageNumber - 1; // 0-based
    if (pageIndex >= srcDoc.getPageCount()) {
      throw new Error(`Page ${pageNumber} does not exist (PDF has ${srcDoc.getPageCount()} pages)`);
    }
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [pageIndex]);
    singlePageDoc.addPage(copiedPage);
    pdfBytes = await singlePageDoc.save();
  } else {
    pdfBytes = new Uint8Array(fullBuffer);
  }

  // Convert to base64 in chunks to avoid stack overflow on large PDFs
  const CHUNK_SIZE = 8192;
  let binaryStr = '';
  for (let i = 0; i < pdfBytes.length; i += CHUNK_SIZE) {
    const chunk = pdfBytes.subarray(i, i + CHUNK_SIZE);
    binaryStr += String.fromCharCode(...chunk);
  }
  const base64Pdf = btoa(binaryStr);

  // ── Step 2: Extract title block first, then BOM with context ──────────
  // Title block runs first (Call 1) so its metadata can be injected into
  // the BOM prompt (Call 2), improving classification accuracy.

  let titleBlock: TitleBlockData | null = null;
  let titleBlockUsage: { inputTokens: number; outputTokens: number } | null = null;
  let bomItems: BomItem[] = [];
  let isThreadedPipe = false;
  let bomUsage: { inputTokens: number; outputTokens: number } | null = null;
  let spoolLabels: string[] = [];

  // Call 1: Title block extraction
  const titleBlockResult = await Promise.allSettled([extractTitleBlock(base64Pdf)]);
  const tbResult = titleBlockResult[0];

  if (tbResult.status === 'fulfilled') {
    titleBlock = tbResult.value.data;
    titleBlockUsage = {
      inputTokens: tbResult.value.inputTokens,
      outputTokens: tbResult.value.outputTokens,
    };
  } else {
    result.errors.push(
      `Title block extraction failed: ${tbResult.reason instanceof Error ? tbResult.reason.message : String(tbResult.reason)}`,
    );
  }

  // Call 2: BOM extraction with title block context
  const bomResult = await Promise.allSettled([extractBom(base64Pdf, titleBlock)]);
  const br = bomResult[0];

  if (br.status === 'fulfilled') {
    bomItems = br.value.data.items;
    isThreadedPipe = br.value.data.is_threaded_pipe;
    bomUsage = {
      inputTokens: br.value.inputTokens,
      outputTokens: br.value.outputTokens,
    };
  } else {
    result.errors.push(
      `BOM extraction failed: ${br.reason instanceof Error ? br.reason.message : String(br.reason)}`,
    );
  }

  // ── Step 3: Create or update drawing record ───────────────────────────

  const drawingNoRaw = titleBlock?.drawing_number || extractFilenameAsDrawingNo(filePath);
  const drawingNoNorm = normalizeDrawing(drawingNoRaw);
  // Sheet number comes from the drawing title block metadata
  const sheetNumber = titleBlock?.sheet_number ?? '1';

  // Check if drawing already exists
  const { data: existingDrawing } = await supabaseAdmin
    .from('drawings')
    .select('id')
    .eq('project_id', projectId)
    .eq('drawing_no_norm', drawingNoNorm)
    .eq('sheet_number', sheetNumber)
    .eq('is_retired', false)
    .maybeSingle();

  let drawingId: string;

  if (existingDrawing) {
    // Update existing drawing with new metadata
    drawingId = existingDrawing.id;
    const { error: updateError } = await supabaseAdmin
      .from('drawings')
      .update({
        file_path: filePath,
        source_page: pageNumber ?? null,
        line_number: titleBlock?.line_number,
        material: titleBlock?.material,
        schedule: titleBlock?.schedule,
        spec: titleBlock?.spec,
        nde_class: titleBlock?.nde_class,
        pwht: titleBlock?.pwht ?? false,
        rev: titleBlock?.revision,
        hydro: titleBlock?.hydro,
        insulation: titleBlock?.insulation,
        drawing_type: titleBlock?.drawing_type ?? null,
        has_spools: titleBlock?.has_spools ?? null,
        processing_status: 'processing',
        processing_note: null,
      })
      .eq('id', drawingId);

    if (updateError) {
      result.errors.push(`Failed to update drawing: ${updateError.message}`);
    }
  } else {
    // Insert new drawing
    const { data: newDrawing, error: drawingError } = await supabaseAdmin
      .from('drawings')
      .insert({
        project_id: projectId,
        drawing_no_raw: drawingNoRaw,
        drawing_no_norm: drawingNoNorm,
        sheet_number: sheetNumber,
        file_path: filePath,
        source_page: pageNumber ?? null,
        title: titleBlock?.line_number ? `Line ${titleBlock.line_number}` : null,
        rev: titleBlock?.revision,
        line_number: titleBlock?.line_number,
        material: titleBlock?.material,
        schedule: titleBlock?.schedule,
        spec: titleBlock?.spec,
        nde_class: titleBlock?.nde_class,
        pwht: titleBlock?.pwht ?? false,
        hydro: titleBlock?.hydro,
        insulation: titleBlock?.insulation,
        drawing_type: titleBlock?.drawing_type ?? null,
        has_spools: titleBlock?.has_spools ?? null,
        processing_status: 'processing',
      })
      .select('id')
      .single();

    if (drawingError || !newDrawing) {
      throw new Error(`Failed to create drawing: ${drawingError?.message ?? 'No data returned'}`);
    }
    drawingId = newDrawing.id;
  }

  result.drawingsProcessed++;

  // Now log title block AI usage (we have drawingId)
  if (titleBlockUsage) {
    await trackGeminiUsage(
      { data: titleBlock, ...titleBlockUsage },
      'title_block',
      projectId,
      drawingId,
      supabaseAdmin,
      GEMINI_FLASH,
    );
  }

  // Check BOM failure after drawing creation (need drawingId for error status)
  if (br.status === 'rejected') {
    await supabaseAdmin
      .from('drawings')
      .update({
        processing_status: 'error',
        processing_note: `BOM extraction failed: ${br.reason instanceof Error ? br.reason.message : String(br.reason)}`,
      })
      .eq('id', drawingId);
    return result;
  }

  // Track BOM usage (after drawingId exists)
  if (bomUsage) {
    await trackGeminiUsage(
      { data: bomItems, ...bomUsage },
      'bom_extraction',
      projectId,
      drawingId,
      supabaseAdmin,
      GEMINI_PRO,
    );
  }

  // ── Post-processing domain rules ────────────────────────────────────
  bomItems = applyInstrumentFieldOverride(bomItems);

  // Resolve spec conflicts (title block wins, instrument tags discarded)
  if (titleBlock?.spec) {
    bomItems = bomItems.map((item) => ({
      ...item,
      spec: resolveSpecConflict(item.spec, titleBlock!.spec),
    }));
  }

  // ── Conditional spool extraction (Call 3 — Flash) ──────────────
  const shouldExtractSpools =
    titleBlock?.has_spools === true ||
    bomItems.some((item) => /\bspool\b/i.test(item.description ?? ''));

  if (shouldExtractSpools) {
    try {
      const spoolResult = await extractSpools(base64Pdf);
      spoolLabels = spoolResult.data;
      await trackGeminiUsage(
        { data: null, inputTokens: spoolResult.inputTokens, outputTokens: spoolResult.outputTokens },
        'spool_extraction',
        projectId,
        drawingId,
        supabaseAdmin,
        GEMINI_FLASH,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Spool extraction failed: ${msg}`);
    }
  }

  // ── Step 4b: Apply threaded pipe overrides ──────────────────────────
  // Detect threaded pipe drawings (FTE/NPT/NPTF connections, A53 Type F pipe)
  // and reclassify pipe→threaded_pipe, shop→field for pipe/valves/fittings
  bomItems = applyThreadedPipeOverrides(bomItems, titleBlock?.material ?? null, isThreadedPipe);

  // ── Step 5: Store ALL BOM items in drawing_bom_items ──────────────────

  // Delete any existing BOM items for this drawing (re-processing case)
  await supabaseAdmin.from('drawing_bom_items').delete().eq('drawing_id', drawingId);

  if (bomItems.length > 0) {
    const bomInserts = bomItems.map((item) =>
      buildDrawingBomItem({
        drawingId,
        projectId,
        itemType: item.item_type,
        classification: item.classification,
        section: item.section,
        subsection: item.subsection,
        description: item.description,
        size: item.size,
        size2: item.size_2,
        quantity: item.quantity,
        uom: item.uom,
        spec: item.spec,
        materialGrade: item.material_grade,
        schedule: item.schedule,
        schedule2: item.schedule_2,
        rating: item.rating,
        commodityCode: item.commodity_code,
        endConnection: item.end_connection,
        itemNumber: item.item_number,
        needsReview: item.needs_review,
        reviewReason: item.review_reason,
        userId,
      }),
    );

    const { error: bomError } = await supabaseAdmin
      .from('drawing_bom_items')
      .insert(bomInserts);

    if (bomError) {
      result.errors.push(`Failed to store BOM items: ${bomError.message}`);
    } else {
      result.bomItemsStored = bomInserts.length;
    }
  }

  // ── Step 6: Filter tracked field items and create components ──────────

  const trackedItems = bomItems.filter((item) =>
    isTrackedItem(item.classification, item.section, item.description),
  );

  // Fetch progress templates (latest version per type)
  const { data: templates } = await supabaseAdmin
    .from('progress_templates')
    .select('id, component_type, version')
    .order('version', { ascending: false });

  const templateMap = new Map<string, string>();
  for (const t of templates || []) {
    const key = t.component_type.toLowerCase();
    if (!templateMap.has(key)) {
      templateMap.set(key, t.id);
    }
  }

  // Fetch existing components for deduplication
  const trackedTypes = new Set(
    trackedItems.map((item) => mapBomToComponentType(item.classification, item.subsection, item.commodity_code)),
  );

  const existingKeys = new Set<string>();
  for (const compType of trackedTypes) {
    const { data: existing } = await supabaseAdmin
      .from('components')
      .select('identity_key, component_type')
      .eq('project_id', projectId)
      .eq('component_type', compType)
      .eq('is_retired', false);

    for (const c of existing || []) {
      existingKeys.add(buildIdentityLookupKey(c.component_type, c.identity_key));
    }
  }

  // Load existing spool identity keys for cross-sheet and re-processing dedup.
  // Loads all project spools (not scoped by drawing) since spool IDs are project-unique.
  const { data: existingSpoolComps } = await supabaseAdmin
    .from('components')
    .select('identity_key')
    .eq('project_id', projectId)
    .eq('component_type', 'spool')
    .eq('is_retired', false);

  for (const c of existingSpoolComps || []) {
    existingKeys.add(buildIdentityLookupKey('spool', c.identity_key as Record<string, unknown>));
  }

  // Track aggregate pipe/threaded_pipe items to merge within this batch
  const pipeAggregates = new Map<
    string,
    {
      componentType: string;
      identityKey: { pipe_id: string };
      templateId: string;
      attributes: Record<string, unknown>;
      currentMilestones: Record<string, number>;
    }
  >();

  // Discrete (non-aggregate) components to batch insert
  const componentInserts: Array<Record<string, unknown>> = [];

  // Track which BOM classifications were mapped to components
  const trackedClassifications = new Set<string>();

  // Count sequence numbers per (componentType, drawingNorm, cmdtyCode, sizeNorm) for exploded types
  const seqCounters = new Map<string, number>();

  for (const item of trackedItems) {
    const componentType = mapBomToComponentType(item.classification, item.subsection, item.commodity_code);
    const templateId = templateMap.get(componentType);

    if (!templateId) {
      result.errors.push(
        `No template found for component type: ${componentType} (from "${item.classification}")`,
      );
      continue;
    }

    // Build a synthetic commodity code from classification + spec + size for identity key
    // BOM extraction may not always have a commodity code
    const cmdtyCode =
      item.commodity_code || item.classification.replace(/\s+/g, '_').toUpperCase();
    const sizeNorm = normalizeSize(item.size);

    if (isAggregateType(componentType)) {
      // ── Pipe / Threaded Pipe: aggregate model ──
      const pipeId = generatePipeAggregateId(drawingNoNorm, item.size, cmdtyCode);
      const lookupKey = buildIdentityLookupKey(componentType, { pipe_id: pipeId });

      if (pipeAggregates.has(pipeId)) {
        // Merge linear feet into existing batch aggregate
        const existing = pipeAggregates.get(pipeId)!;
        (existing.attributes as Record<string, unknown>).total_linear_feet =
          ((existing.attributes.total_linear_feet as number) || 0) + item.quantity;
      } else if (existingKeys.has(lookupKey)) {
        // Aggregate exists in database — update total_linear_feet
        const { data: existingComp } = await supabaseAdmin
          .from('components')
          .select('id, attributes')
          .eq('project_id', projectId)
          .eq('component_type', componentType)
          .eq('identity_key->>pipe_id', pipeId)
          .eq('is_retired', false)
          .single();

        if (existingComp) {
          const existingAttrs = (existingComp.attributes ?? {}) as Record<string, unknown>;
          const existingLf = (existingAttrs.total_linear_feet as number) || 0;
          const { error: updateErr } = await supabaseAdmin
            .from('components')
            .update({
              attributes: {
                ...existingAttrs,
                total_linear_feet: existingLf + item.quantity,
              },
              last_updated_by: userId,
            })
            .eq('id', existingComp.id);

          if (updateErr) {
            result.errors.push(`Failed to update aggregate ${pipeId}: ${updateErr.message}`);
          } else {
            trackedClassifications.add(item.classification);
          }
        }
      } else {
        // New aggregate — add to batch
        const defaultMilestones = getDefaultAggregateMilestones(componentType) ?? {};
        pipeAggregates.set(pipeId, {
          componentType,
          identityKey: { pipe_id: pipeId },
          templateId,
          attributes: {
            description: item.description ?? '',
            size: item.size ?? '',
            spec: item.spec ?? '',
            schedule: item.schedule ?? '',
            material_grade: item.material_grade ?? '',
            cmdty_code: cmdtyCode,
            total_linear_feet: item.quantity,
            item_number: item.item_number,
          },
          currentMilestones: defaultMilestones,
        });
        trackedClassifications.add(item.classification);
      }
    } else if (isNoExplosionType(componentType)) {
      // ── Instrument: no quantity explosion, seq always 1 ──
      const identityKey = buildIdentityKey(
        componentType,
        drawingNoNorm,
        cmdtyCode,
        item.size,
        1,
      );
      const lookupKey = buildIdentityLookupKey(
        componentType,
        identityKey as Record<string, unknown>,
      );

      if (!existingKeys.has(lookupKey)) {
        componentInserts.push({
          project_id: projectId,
          component_type: componentType,
          drawing_id: drawingId,
          progress_template_id: templateId,
          identity_key: identityKey,
          attributes: {
            description: item.description ?? '',
            size: item.size ?? '',
            size_2: item.size_2 ?? '',
            spec: item.spec ?? '',
            schedule: item.schedule ?? '',
            material_grade: item.material_grade ?? '',
            rating: item.rating ?? '',
            cmdty_code: cmdtyCode,
            end_connection: item.end_connection ?? '',
            item_number: item.item_number,
          },
          current_milestones: {},
          created_by: userId,
        });
        existingKeys.add(lookupKey);
        trackedClassifications.add(item.classification);
      }
    } else if (isExplodedType(componentType)) {
      // ── Valve/Flange/Support/Fitting/Tubing/Hose/Misc: quantity explosion ──
      const seqKey = `${componentType}::${drawingNoNorm}::${cmdtyCode}::${sizeNorm}`;

      for (let i = 0; i < item.quantity; i++) {
        // Get the next available sequence number for this key
        const currentSeq = (seqCounters.get(seqKey) ?? 0) + 1;
        seqCounters.set(seqKey, currentSeq);

        const identityKey = buildIdentityKey(
          componentType,
          drawingNoNorm,
          cmdtyCode,
          item.size,
          currentSeq,
        );
        const lookupKey = buildIdentityLookupKey(
          componentType,
          identityKey as Record<string, unknown>,
        );

        if (!existingKeys.has(lookupKey)) {
          componentInserts.push({
            project_id: projectId,
            component_type: componentType,
            drawing_id: drawingId,
            progress_template_id: templateId,
            identity_key: identityKey,
            attributes: {
              description: item.description ?? '',
              size: item.size ?? '',
              size_2: item.size_2 ?? '',
              spec: item.spec ?? '',
              schedule: item.schedule ?? '',
              material_grade: item.material_grade ?? '',
              rating: item.rating ?? '',
              cmdty_code: cmdtyCode,
              end_connection: item.end_connection ?? '',
              item_number: item.item_number,
            },
            current_milestones: {},
            created_by: userId,
          });
          existingKeys.add(lookupKey);
          trackedClassifications.add(item.classification);
        }
      }
    }
  }

  // ── Step 6b: Batch insert aggregate pipe components ──────────────────

  if (pipeAggregates.size > 0) {
    const aggInserts = Array.from(pipeAggregates.values()).map((agg) => ({
      project_id: projectId,
      component_type: agg.componentType,
      drawing_id: drawingId,
      progress_template_id: agg.templateId,
      identity_key: agg.identityKey,
      attributes: agg.attributes,
      current_milestones: agg.currentMilestones,
      created_by: userId,
    }));

    const { error: aggError } = await supabaseAdmin.from('components').upsert(aggInserts, { ignoreDuplicates: true });

    if (aggError) {
      result.errors.push(`Failed to insert aggregate components: ${aggError.message}`);
    } else {
      result.componentsCreated += aggInserts.length;
    }
  }

  // ── Step 6c: Batch insert discrete components ─────────────────────────

  if (componentInserts.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < componentInserts.length; i += BATCH_SIZE) {
      const batch = componentInserts.slice(i, i + BATCH_SIZE);
      const { error: compError } = await supabaseAdmin.from('components').upsert(batch, { ignoreDuplicates: true });

      if (compError) {
        result.errors.push(
          `Failed to create components (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${compError.message}`,
        );
      } else {
        result.componentsCreated += batch.length;
      }
    }
  }

  // ── Step 6d: Mark tracked BOM items ───────────────────────────────────

  if (trackedClassifications.size > 0) {
    const classArray = Array.from(trackedClassifications);
    await supabaseAdmin
      .from('drawing_bom_items')
      .update({ is_tracked: true })
      .eq('drawing_id', drawingId)
      .eq('section', 'field')
      .in('classification', classArray);
  }

  // ── Step 7: Create spool components from extracted callouts ────────────

  const spoolTemplateId = templateMap.get('spool');

  if (spoolLabels.length > 0 && spoolTemplateId) {
    // Use base drawing number (strip sheet designation like "2OF2") for spool IDs,
    // since spools are identified at the drawing level, not the sheet level.
    const baseDwg = drawingNoNorm.replace(/\s+\d+OF\d+$/i, '').trim();
    const baseDwgSpaced = baseDwg.replace(/_/g, ' ');
    // Gemini may render underscores as dashes in the drawing number
    const baseDwgDashed = baseDwg.replace(/_/g, '-');

    const spoolInserts: Array<Record<string, unknown>> = [];

    for (const label of spoolLabels) {
      // Gemini often includes the drawing number in the spool label (e.g., "A-89246 SPOOL8").
      // Strip it to avoid redundant prefix: "A-89246-A-89246 SPOOL8" → "A-89246-SPOOL8".
      let cleanLabel = label;
      if (cleanLabel.startsWith(`${baseDwgSpaced} `)) {
        cleanLabel = cleanLabel.slice(baseDwgSpaced.length).trim();
      } else if (cleanLabel.startsWith(`${baseDwg} `) || cleanLabel.startsWith(`${baseDwg}-`)) {
        cleanLabel = cleanLabel.slice(baseDwg.length).replace(/^[\s-]+/, '').trim();
      } else if (baseDwgDashed !== baseDwg && cleanLabel.startsWith(`${baseDwgDashed}-`)) {
        cleanLabel = cleanLabel.slice(baseDwgDashed.length).replace(/^[\s-]+/, '').trim();
      }

      // If stripping left nothing meaningful, keep the original label
      if (!cleanLabel) cleanLabel = label;

      const spoolId = `${baseDwg}-${cleanLabel}`;
      const identityKey = { spool_id: spoolId };
      const lookupKey = buildIdentityLookupKey('spool', identityKey);

      if (existingKeys.has(lookupKey)) {
        continue; // Already exists (cross-sheet dedup or re-processing)
      }

      spoolInserts.push({
        project_id: projectId,
        component_type: 'spool',
        drawing_id: drawingId,
        progress_template_id: spoolTemplateId,
        identity_key: identityKey,
        attributes: { description: cleanLabel, drawing_no: baseDwg },
        current_milestones: {},
        created_by: userId,
      });
      existingKeys.add(lookupKey); // Prevent duplicates within same page
    }

    if (spoolInserts.length > 0) {
      const { error: spoolError } = await supabaseAdmin.from('components').upsert(spoolInserts, { ignoreDuplicates: true });

      if (spoolError) {
        result.errors.push(`Failed to create spool components: ${spoolError.message}`);
      } else {
        result.spoolsCreated += spoolInserts.length;
      }
    }
  } else if (spoolLabels.length > 0 && !spoolTemplateId) {
    result.errors.push('No progress template found for component type: spool');
  }

  // ── Step 8: Refresh materialized view so drawing table sees new components ─

  if (result.componentsCreated > 0 || result.spoolsCreated > 0) {
    await supabaseAdmin.rpc('refresh_materialized_views');
  }

  // ── Step 9: Update drawing processing status ──────────────────────────

  const finalStatus = result.errors.length > 0 ? 'error' : 'complete';
  const finalNote = result.errors.length > 0 ? result.errors.join('; ') : null;

  await supabaseAdmin
    .from('drawings')
    .update({
      processing_status: finalStatus,
      processing_note: finalNote,
    })
    .eq('id', drawingId);

  result.success = result.errors.length === 0;
  return result;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        spoolsCreated: 0,
        errors: ['Missing authorization header'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Extract JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth to verify identity
    const supabaseAuth = createClient(supabaseUrl, anonKey);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        spoolsCreated: 0,
        errors: ['Invalid or expired authentication token'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;

    // Parse request body as JSON
    let body: ProcessDrawingRequest;
    try {
      const raw = await req.json();

      if (!raw.projectId || typeof raw.projectId !== 'string') {
        const errorResult: ProcessingResult = {
          success: false,
          drawingsProcessed: 0,
          componentsCreated: 0,
          bomItemsStored: 0,
          spoolsCreated: 0,
          errors: ['Missing required field: projectId'],
        };

        return new Response(
          JSON.stringify(errorResult),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!raw.filePath || typeof raw.filePath !== 'string') {
        const errorResult: ProcessingResult = {
          success: false,
          drawingsProcessed: 0,
          componentsCreated: 0,
          bomItemsStored: 0,
          spoolsCreated: 0,
          errors: ['Missing required field: filePath'],
        };

        return new Response(
          JSON.stringify(errorResult),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Validate filePath: must start with projectId prefix and not contain traversal
      const filePath = String(raw.filePath);
      if (!filePath.startsWith(`${raw.projectId}/`) || filePath.includes('..')) {
        const errorResult: ProcessingResult = {
          success: false,
          drawingsProcessed: 0,
          componentsCreated: 0,
          bomItemsStored: 0,
          spoolsCreated: 0,
          errors: ['Invalid filePath: must be within the project storage scope'],
        };

        return new Response(
          JSON.stringify(errorResult),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      body = {
        projectId: raw.projectId,
        filePath,
        pageNumber: typeof raw.pageNumber === 'number' ? raw.pageNumber : undefined,
        totalPages: typeof raw.totalPages === 'number' ? raw.totalPages : undefined,
      };
    } catch (parseError) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        spoolsCreated: 0,
        errors: [
          `Invalid JSON payload: ${parseError instanceof Error ? parseError.message : 'Failed to parse JSON'}`,
        ],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', body.projectId)
      .single();

    if (projectError || !project) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        spoolsCreated: 0,
        errors: ['Project not found or access denied'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify user belongs to the project's organization and has sufficient role
    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    if (!userRecord || userRecord.organization_id !== project.organization_id) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        spoolsCreated: 0,
        errors: ['Unauthorized: You do not have access to this project'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Only owner, admin, and project_manager can trigger AI drawing processing
    const allowedRoles = ['owner', 'admin', 'project_manager'];
    if (!allowedRoles.includes(userRecord.role)) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        spoolsCreated: 0,
        errors: ['Insufficient permissions: Only admins and project managers can import drawings'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Process the drawing
    let result: ProcessingResult;
    try {
      result = await processDrawing(body.projectId, body.filePath, userId, supabase, body.pageNumber);
    } catch (processingError) {
      console.error('Drawing processing error:', processingError);
      result = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        spoolsCreated: 0,
        errors: [
          `Processing failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`,
        ],
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const errorResult: ProcessingResult = {
      success: false,
      drawingsProcessed: 0,
      componentsCreated: 0,
      bomItemsStored: 0,
      spoolsCreated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
