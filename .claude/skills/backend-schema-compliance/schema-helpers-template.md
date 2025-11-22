# Schema Helpers Template

---
**⚠️ EDGE FUNCTION PATTERN**

This template shows how to create type-safe insert helpers for Supabase edge functions.

**Reference Implementation**: `supabase/functions/import-field-welds/schema-helpers.ts`

**When to use**: Every edge function that inserts data into the database

**Why**: Prevents schema mismatch errors by enforcing type safety and providing a single source of truth for insert object construction.
---

## File Location

```
supabase/functions/your-function/
├── index.ts          # Entry point
├── schema-helpers.ts # ⭐ Type-safe insert builders (THIS FILE)
├── transaction.ts    # Business logic (uses helpers)
└── validator.ts      # Input validation
```

---

## Template: schema-helpers.ts

```typescript
/**
 * Type-safe insert helpers for [function-name] edge function
 * Generated from schema - keep in sync with database
 *
 * IMPORTANT: When schema changes, regenerate this file:
 * 1. Get latest schema from Supabase Dashboard
 * 2. Run: supabase gen types typescript --linked > src/types/database.types.ts
 * 3. Copy relevant types here
 * 4. Update builder functions
 */

// ============================================================================
// TYPE DEFINITIONS (Copy from database.types.ts or schema export)
// ============================================================================

/**
 * [TableName] table insert type
 *
 * Source: Supabase schema export or src/types/database.types.ts
 */
export interface TableNameInsert {
  // Required fields (NOT NULL without DEFAULT)
  required_field_1: string
  required_field_2: number

  // Optional fields with defaults
  optional_with_default?: string

  // Optional fields (nullable)
  optional_field?: string | null

  // Audit fields
  created_at?: string
  created_by?: string | null
  updated_at?: string
}

// ============================================================================
// BUILDER FUNCTIONS
// ============================================================================

/**
 * Build [TableName] insert object
 *
 * This builder ensures all required fields are present and prevents typos.
 *
 * Pattern:
 * - Use camelCase for function parameters (TypeScript convention)
 * - Map to snake_case for database columns
 * - Include all required fields as non-optional params
 * - Include optional fields as optional params
 * - Set defaults explicitly
 * - Include audit fields
 *
 * @param params - Insert parameters (camelCase)
 * @returns Database insert object (snake_case)
 */
export function buildTableNameRecord(params: {
  // Required params (non-optional)
  requiredField1: string
  requiredField2: number
  userId: string  // For audit trail

  // Optional params
  optionalField?: string | null
  optionalWithDefault?: string
}): TableNameInsert {
  return {
    // Map camelCase params to snake_case columns
    required_field_1: params.requiredField1,
    required_field_2: params.requiredField2,

    // Optional fields
    optional_field: params.optionalField ?? null,
    optional_with_default: params.optionalWithDefault ?? 'default_value',

    // Audit fields
    created_by: params.userId,
    created_at: new Date().toISOString(),
  }
}

// ============================================================================
// VALIDATION FUNCTIONS (Optional but recommended)
// ============================================================================

/**
 * Validate [specific constraint] before insert
 *
 * Mirrors database constraint to catch errors early
 *
 * @param value - Value to validate
 * @returns true if valid, false otherwise
 */
export function validateSomeConstraint(value: string): boolean {
  // Example: Validate regex pattern
  return /^[A-Z0-9-]{2,12}$/.test(value)
}

/**
 * Validate JSONB structure for identity_key (if working with components)
 *
 * @param componentType - Component type
 * @param identityKey - Identity key object
 * @returns true if valid, false otherwise
 */
export function validateIdentityKey(
  componentType: string,
  identityKey: Record<string, unknown>
): boolean {
  switch (componentType) {
    case 'field_weld':
      return (
        'weld_number' in identityKey &&
        typeof identityKey.weld_number === 'string' &&
        identityKey.weld_number.trim() !== ''
      )

    case 'support':
    case 'valve':
    // ... other Class-B types
      return (
        'drawing_norm' in identityKey &&
        'commodity_code' in identityKey &&
        'size' in identityKey &&
        'seq' in identityKey &&
        typeof identityKey.seq === 'number'
      )

    default:
      return false
  }
}
```

---

## Example: Building Components Insert

```typescript
/**
 * Components table insert type
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
}

/**
 * Build component insert object for field_weld type
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
    component_type: 'field_weld',  // Hardcoded for this builder
    progress_template_id: params.progressTemplateId,
    identity_key: {
      weld_number: params.weldNumber,  // Validated by chk_identity_key_structure
    },
    area_id: params.areaId ?? null,
    system_id: params.systemId ?? null,
    test_package_id: params.testPackageId ?? null,
    percent_complete: 0,  // Always starts at 0
    current_milestones: {},  // Empty object initially
    created_by: params.userId,
    last_updated_by: params.userId,  // Should match created_by on insert
    last_updated_at: new Date().toISOString(),
  }
}
```

---

## Example: Building Field Welds Insert

```typescript
/**
 * Field welds table insert type
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
  is_unplanned?: boolean

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
  xray_percentage?: number | null
  original_weld_id?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Build field_weld insert object
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
  xrayPercentage?: number | null
  status?: 'active' | 'accepted' | 'rejected'
  isUnplanned?: boolean
}): FieldWeldInsert {
  return {
    component_id: params.componentId,
    project_id: params.projectId,
    weld_type: params.weldType,
    weld_size: params.weldSize ?? null,
    schedule: params.schedule ?? null,
    base_metal: params.baseMetal ?? null,
    spec: params.spec ?? null,
    welder_id: params.welderId ?? null,
    date_welded: params.dateWelded ?? null,
    nde_required: params.ndeRequired ?? false,
    nde_type: params.ndeType ?? null,
    nde_result: params.ndeResult ?? null,
    xray_percentage: params.xrayPercentage ?? null,
    status: params.status ?? 'active',
    is_unplanned: params.isUnplanned ?? false,
    created_by: params.userId,
  }
}
```

---

## Usage in Transaction Functions

```typescript
// transaction.ts
import { buildFieldWeldComponent, buildFieldWeld } from './schema-helpers.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'

export async function importFieldWeld(data: ImportData) {
  // Build type-safe insert objects
  const componentData = buildFieldWeldComponent({
    projectId: data.projectId,
    drawingId: data.drawingId,
    progressTemplateId: data.templateId,
    weldNumber: data.weldNumber,
    userId: data.userId,
  })

  const fieldWeldData = buildFieldWeld({
    componentId: componentData.id!,  // Will be set after component insert
    projectId: data.projectId,
    weldType: data.weldType,
    userId: data.userId,
    // ... other fields
  })

  // Insert using type-safe objects
  const { data: component, error: componentError } = await supabaseAdmin
    .from('components')
    .insert(componentData)
    .select()
    .single()

  if (componentError) throw componentError

  // Use component.id for field_weld
  fieldWeldData.component_id = component.id

  const { error: weldError } = await supabaseAdmin
    .from('field_welds')
    .insert(fieldWeldData)

  if (weldError) throw weldError

  return component
}
```

---

## Benefits of This Pattern

1. **Type Safety** - TypeScript enforces all required parameters
2. **Single Source of Truth** - One place to update when schema changes
3. **Prevents Typos** - Column name mismatches caught at compile time
4. **Self-Documenting** - Function signature shows what's required
5. **Consistent Defaults** - Same defaults used everywhere
6. **Audit Trail** - Audit fields always included correctly

---

## When to Update

Update schema-helpers.ts when:
- [ ] Table schema changes (new columns, removed columns)
- [ ] Required fields change (NOT NULL added/removed)
- [ ] CHECK constraints change (new enum values)
- [ ] Default values change
- [ ] JSONB structure requirements change

**Process**:
1. Apply migration to database
2. Export current schema from Supabase Dashboard
3. Run: `supabase gen types typescript --linked > src/types/database.types.ts`
4. Update interface definitions in schema-helpers.ts
5. Update builder functions
6. Test edge function
7. Deploy

---

## Anti-Patterns to Avoid

### ❌ DON'T: Manual Object Construction

```typescript
// ❌ BAD: Prone to errors
const component = {
  project_id: projectId,
  type: 'field_weld',  // WRONG: column is 'component_type'
  identity_key: { weld_id: weldNumber },  // WRONG: should be 'weld_number'
  // Missing: progress_template_id (required!)
}
```

### ✅ DO: Use Builder Functions

```typescript
// ✅ GOOD: Type-safe, all fields included
const component = buildFieldWeldComponent({
  projectId,
  drawingId,
  progressTemplateId,  // TypeScript forces you to provide this
  weldNumber,
  userId,
})
```

---

## Reference Implementations

See these working examples:
- `supabase/functions/import-field-welds/schema-helpers.ts` - Field weld imports
- Any future edge functions should follow this same pattern
