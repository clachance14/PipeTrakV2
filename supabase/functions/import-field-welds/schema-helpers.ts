/**
 * Type-safe insert helpers for import-field-welds edge function
 * Generated from schema - keep in sync with database
 *
 * IMPORTANT: When schema changes, regenerate this file:
 * 1. Run: supabase gen types typescript --linked > src/types/database.types.ts
 * 2. Copy relevant types here
 * 3. Update builder functions
 */

/**
 * Components table insert type (from database.types.ts)
 */
export interface ComponentInsert {
  // Required fields
  project_id: string
  component_type: string
  progress_template_id: string
  identity_key: Record<string, unknown>
  current_milestones: Record<string, unknown>
  percent_complete: number

  // Optional fields
  id?: string
  drawing_id?: string | null
  area_id?: string | null
  system_id?: string | null
  test_package_id?: string | null
  attributes?: Record<string, unknown> | null
  created_at?: string
  created_by?: string | null
  last_updated_at?: string
  last_updated_by?: string | null
  is_retired?: boolean
  retire_reason?: string | null
}

/**
 * Field welds table insert type (from database.types.ts)
 */
export interface FieldWeldInsert {
  // Required fields
  component_id: string
  project_id: string
  weld_type: 'BW' | 'SW' | 'FW' | 'TW'
  created_by: string

  // Optional with defaults
  nde_required?: boolean
  status?: 'active' | 'accepted' | 'rejected'

  // Optional fields
  id?: string
  weld_size?: string | null
  schedule?: string | null
  base_metal?: string | null
  spec?: string | null
  welder_id?: string | null
  date_welded?: string | null
  nde_type?: 'RT' | 'UT' | 'PT' | 'MT' | 'VT' | null
  nde_result?: 'PASS' | 'FAIL' | 'PENDING' | null
  nde_date?: string | null
  nde_notes?: string | null
  original_weld_id?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Build component insert object for field_weld type
 *
 * This builder ensures all required fields are present and prevents typos
 */
export function buildFieldWeldComponent(params: {
  projectId: string
  drawingId: string
  progressTemplateId: string
  weldNumber: string
  areaId?: string | null
  systemId?: string | null
  testPackageId?: string | null
  userId: string
}): ComponentInsert {
  return {
    project_id: params.projectId,
    drawing_id: params.drawingId,
    component_type: 'field_weld',
    progress_template_id: params.progressTemplateId,
    identity_key: {
      weld_number: params.weldNumber, // Validated by chk_identity_key_structure
    },
    area_id: params.areaId,
    system_id: params.systemId,
    test_package_id: params.testPackageId,
    percent_complete: 0,
    current_milestones: {},
    created_by: params.userId,
    last_updated_by: params.userId,
    last_updated_at: new Date().toISOString(),
  }
}

/**
 * Build field_weld insert object
 *
 * This builder ensures all required fields are present and prevents typos
 */
export function buildFieldWeld(params: {
  componentId: string
  projectId: string
  weldType: 'BW' | 'SW' | 'FW' | 'TW'
  userId: string
  weldSize?: string | null
  schedule?: string | null
  baseMetal?: string | null
  spec?: string | null
  welderId?: string | null
  dateWelded?: string | null
  ndeRequired?: boolean
  ndeType?: 'RT' | 'UT' | 'PT' | 'MT' | 'VT' | null
  ndeResult?: 'PASS' | 'FAIL' | 'PENDING' | null
  status?: 'active' | 'accepted' | 'rejected'
}): FieldWeldInsert {
  return {
    component_id: params.componentId,
    project_id: params.projectId,
    weld_type: params.weldType,
    weld_size: params.weldSize,
    schedule: params.schedule,
    base_metal: params.baseMetal,
    spec: params.spec,
    welder_id: params.welderId,
    date_welded: params.dateWelded,
    nde_required: params.ndeRequired ?? false,
    nde_type: params.ndeType,
    nde_result: params.ndeResult,
    status: params.status ?? 'active',
    created_by: params.userId,
  }
}

/**
 * Validate field_weld identity_key structure
 * Mirrors the database constraint: validate_component_identity_key()
 */
export function validateFieldWeldIdentityKey(identityKey: Record<string, unknown>): boolean {
  return (
    'weld_number' in identityKey &&
    typeof identityKey.weld_number === 'string' &&
    identityKey.weld_number.trim() !== ''
  )
}
