/**
 * Type-safe insert helpers for process-drawing edge function
 * Generated from schema - keep in sync with database
 *
 * IMPORTANT: When schema changes, regenerate this file:
 * 1. Run: supabase gen types typescript --linked > src/types/database.types.ts
 * 2. Copy relevant types here
 * 3. Update builder functions
 */

/**
 * drawing_bom_items table insert type (from migration 20260316200400)
 */
export interface DrawingBomItemInsert {
  // Required fields
  drawing_id: string;
  project_id: string;
  item_type: string;
  classification: string;
  section: string;

  // Optional fields
  id?: string;
  description?: string | null;
  size?: string | null;
  size_2?: string | null;
  quantity?: number;
  uom?: string | null;
  spec?: string | null;
  material_grade?: string | null;
  schedule?: string | null;
  schedule_2?: string | null;
  rating?: string | null;
  commodity_code?: string | null;
  end_connection?: string | null;
  item_number?: number | null;
  needs_review?: boolean;
  review_reason?: string | null;
  is_tracked?: boolean;
  created_by?: string | null;
  created_at?: string;
  subsection?: string | null;
}

/**
 * ai_usage_log table insert type (from migration 20260316200400)
 */
export interface AiUsageLogInsert {
  // Required fields
  project_id: string;
  operation: string;
  model: string;

  // Optional fields
  id?: string;
  drawing_id?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_cost?: number | null;
  created_at?: string;
}

/**
 * Build drawing_bom_item insert object
 *
 * This builder ensures all required fields are present and prevents typos
 */
export function buildDrawingBomItem(params: {
  drawingId: string;
  projectId: string;
  itemType: 'material' | 'support';
  classification: string;
  section: 'shop' | 'field';
  userId: string;
  description?: string | null;
  size?: string | null;
  size2?: string | null;
  quantity?: number;
  uom?: string | null;
  spec?: string | null;
  materialGrade?: string | null;
  schedule?: string | null;
  schedule2?: string | null;
  rating?: string | null;
  commodityCode?: string | null;
  endConnection?: string | null;
  itemNumber?: number | null;
  needsReview?: boolean;
  reviewReason?: string | null;
  subsection?: string | null;
}): DrawingBomItemInsert {
  return {
    drawing_id: params.drawingId,
    project_id: params.projectId,
    item_type: params.itemType,
    classification: params.classification,
    section: params.section,
    description: params.description ?? null,
    size: params.size ?? null,
    size_2: params.size2 ?? null,
    quantity: params.quantity ?? 1,
    uom: params.uom ?? null,
    spec: params.spec ?? null,
    material_grade: params.materialGrade ?? null,
    schedule: params.schedule ?? null,
    schedule_2: params.schedule2 ?? null,
    rating: params.rating ?? null,
    commodity_code: params.commodityCode ?? null,
    end_connection: params.endConnection ?? null,
    item_number: params.itemNumber ?? null,
    needs_review: params.needsReview ?? false,
    review_reason: params.reviewReason ?? null,
    is_tracked: false,
    created_by: params.userId,
    subsection: params.subsection ?? null,
  };
}

/**
 * Build ai_usage_log insert object
 *
 * This builder ensures all required fields are present and prevents typos
 */
export function buildAiUsageLog(params: {
  projectId: string;
  operation: string;
  model: string;
  drawingId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalCost?: number | null;
}): AiUsageLogInsert {
  return {
    project_id: params.projectId,
    operation: params.operation,
    model: params.model,
    drawing_id: params.drawingId ?? null,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    total_cost: params.totalCost ?? null,
  };
}
