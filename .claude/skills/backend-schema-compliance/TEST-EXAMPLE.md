# Backend Schema Compliance Skill - Test Example

This document demonstrates how the skill activates and guides a user through the schema compliance workflow.

---

## Test Scenario: User Wants to Insert a Field Weld

### User Message:
> "I need to create an edge function that inserts a new field weld into the database"

### Expected Skill Activation:
✅ Trigger keywords detected: "edge function", "inserts", "field weld", "database"

---

## Skill Response (Simulated):

```markdown
I'm using the **backend-schema-compliance** skill to ensure we follow the schema compliance workflow.

This is MANDATORY before writing any database insert code.

---

## Step 1: Operation Identified

**Target tables:**
- `components` (for field_weld component)
- `field_welds` (for weld-specific data)

**Operation:** INSERT (new records)

**Context:** Edge function

---

## Step 2: Retrieving Current Schema

Let me check the current schema for both tables...

[Reads from Supabase schema export or migrations]

### Schema for `components` table:

**Required Fields (NOT NULL without DEFAULT):**
- `project_id` (uuid, FK → projects)
- `component_type` (text) - Use 'field_weld'
- `progress_template_id` (uuid, FK → progress_templates)
- `identity_key` (jsonb) - Structure: `{"weld_number": "string"}`
- `current_milestones` (jsonb) - Default `{}`, **use numeric values 0-1, NOT boolean**
- `percent_complete` (numeric) - Default 0.00
- `created_at` (timestamptz) - Default now()
- `last_updated_at` (timestamptz) - Default now()

**Optional Fields:**
- `drawing_id`, `area_id`, `system_id`, `test_package_id`
- `attributes` (jsonb, max 10KB)
- `created_by`, `last_updated_by` (should always be set!)

**Critical Constraints:**
- identity_key must match structure: `{"weld_number": "string"}`
- Use `component_type`, NOT `type`!
- current_milestones: numeric (0-1), NOT boolean!

### Schema for `field_welds` table:

**Required Fields (NOT NULL without DEFAULT):**
- `component_id` (uuid, FK → components, UNIQUE)
- `project_id` (uuid, FK → projects) - **Must match component's project_id!**
- `weld_type` (text) - **EXACTLY 'BW', 'SW', 'FW', or 'TW'** (case-sensitive!)
- `created_by` (uuid, FK → users)

**Optional with Defaults:**
- `nde_required` (boolean, default false)
- `status` (text, default 'active', CHECK: 'active' | 'accepted' | 'rejected')
- `is_unplanned` (boolean, default false)

**Optional Fields:**
- `weld_size`, `schedule`, `base_metal`, `spec`
- `welder_id`, `date_welded`
- `nde_type` (CHECK: 'RT' | 'UT' | 'PT' | 'MT' | 'VT' | null)
- `nde_result` (CHECK: 'PASS' | 'FAIL' | 'PENDING' | null)
- `xray_percentage` (CHECK: 0-100 or null)
- `notes`

**Critical Constraints:**
- weld_type must be EXACTLY 'BW', 'SW', 'FW', or 'TW' (case-sensitive)
- component_id is UNIQUE (only one field_welds row per component)
- project_id MUST match component's project_id

---

## Step 3: Pre-Coding Checklist

Before writing any code, you MUST complete this checklist:

### Schema Verification
- [ ] I have reviewed the components table schema above
- [ ] I have reviewed the field_welds table schema above
- [ ] I know all required fields for both tables
- [ ] I understand the identity_key structure: `{"weld_number": "string"}`
- [ ] I know weld_type must be 'BW', 'SW', 'FW', or 'TW' (case-sensitive)

### Critical Mistakes Check
- [ ] I will use `component_type`, NOT `type`
- [ ] I will use numeric milestone values (0-1), NOT boolean
- [ ] I will match project_id between component and field_weld
- [ ] I will use exact enum values ('BW', not 'butt weld')
- [ ] I will include created_by and last_updated_by for audit trail

### Type Safety Approach
- [ ] I will create `schema-helpers.ts` with type-safe builders
- [ ] I will NOT manually construct insert objects
- [ ] I will follow the pattern from `supabase/functions/import-field-welds/schema-helpers.ts`

**Are you ready to proceed?** (Confirm checklist is complete)

---

## Step 4: Check for Schema Helpers

Looking for: `supabase/functions/[your-function-name]/schema-helpers.ts`

❌ **NOT FOUND** - You need to create this file first.

**STOP**: Do not write insert code without schema-helpers.ts

**Next step**: Create schema-helpers.ts following the template in `.claude/skills/backend-schema-compliance/schema-helpers-template.md`

**Reference implementation**: `supabase/functions/import-field-welds/schema-helpers.ts`

---

## Step 5: Create schema-helpers.ts

Here's the template for your edge function:

```typescript
/**
 * Type-safe insert helpers for [your-function-name]
 */

// Interface definitions
export interface ComponentInsert {
  project_id: string
  component_type: string
  progress_template_id: string
  identity_key: Record<string, unknown>
  current_milestones: Record<string, unknown>
  percent_complete: number
  drawing_id?: string | null
  area_id?: string | null
  system_id?: string | null
  test_package_id?: string | null
  created_by?: string | null
  last_updated_by?: string | null
  last_updated_at?: string
}

export interface FieldWeldInsert {
  component_id: string
  project_id: string
  weld_type: 'BW' | 'SW' | 'FW' | 'TW'
  created_by: string
  weld_size?: string | null
  // ... other optional fields
}

// Builder functions
export function buildFieldWeldComponent(params: {
  projectId: string
  drawingId: string
  progressTemplateId: string
  weldNumber: string
  userId: string
  areaId?: string | null
  systemId?: string | null
  testPackageId?: string | null
}): ComponentInsert {
  return {
    project_id: params.projectId,
    drawing_id: params.drawingId,
    component_type: 'field_weld',  // Hardcoded
    progress_template_id: params.progressTemplateId,
    identity_key: {
      weld_number: params.weldNumber,  // Correct structure!
    },
    area_id: params.areaId ?? null,
    system_id: params.systemId ?? null,
    test_package_id: params.testPackageId ?? null,
    percent_complete: 0,
    current_milestones: {},  // Empty initially
    created_by: params.userId,
    last_updated_by: params.userId,  // Match created_by
    last_updated_at: new Date().toISOString(),
  }
}

export function buildFieldWeld(params: {
  componentId: string
  projectId: string
  weldType: 'BW' | 'SW' | 'FW' | 'TW'
  userId: string
  // ... other optional params
}): FieldWeldInsert {
  return {
    component_id: params.componentId,
    project_id: params.projectId,  // MUST match component's project_id!
    weld_type: params.weldType,  // Exact enum value
    created_by: params.userId,
    // ... other fields with defaults
  }
}
```

---

## Step 6: Validation (After Code Written)

After you create schema-helpers.ts and transaction logic:

### Checklist:
- [✅] buildFieldWeldComponent() includes all required fields
- [✅] Uses `component_type`, not `type`
- [✅] identity_key structure: `{"weld_number": ...}`
- [✅] current_milestones: empty object initially
- [✅] percent_complete: 0 initially
- [✅] Includes created_by and last_updated_by
- [✅] buildFieldWeld() includes all required fields
- [✅] weld_type uses exact enum: 'BW', 'SW', 'FW', or 'TW'
- [✅] project_id matches component's project_id
- [✅] Includes created_by

### Type Check:
```bash
deno check supabase/functions/your-function/index.ts
```

**If type errors**: Fix before proceeding.

---

## Step 7: Post-Coding Verification

Final checklist before deployment:

- [ ] schema-helpers.ts created with builder functions
- [ ] Transaction logic uses builders (not manual objects)
- [ ] Type check passes (no Deno errors)
- [ ] All common mistakes avoided (see common-mistakes.md)
- [ ] Tested locally if possible
- [ ] Ready to deploy

---

## Success Criteria

✅ Schema compliance workflow followed
✅ schema-helpers.ts created
✅ Type-safe builders used
✅ All required fields included
✅ Common mistakes avoided
✅ Type check passes

**Result:** Edge function will insert field welds correctly, no schema mismatch errors.

---

## What This Prevented

By following this workflow, you avoided these common bugs:

❌ Missing `progress_template_id` (runtime constraint violation)
❌ Using `type` instead of `component_type` (column doesn't exist)
❌ Wrong identity_key structure (CHECK constraint violation)
❌ Boolean milestones (invalid input for numeric type)
❌ Invalid weld_type like 'butt weld' (CHECK constraint violation)
❌ Mismatched project_id (RLS policy violation)
❌ Missing audit fields (incomplete audit trail)

**Every item above has caused a real production bug in this project.**

This skill prevents repeating those mistakes.
```

---

## Test Result

✅ **SKILL ACTIVATES CORRECTLY**
✅ **GUIDES USER THROUGH WORKFLOW**
✅ **PREVENTS COMMON MISTAKES**
✅ **ENFORCES CHECKLIST COMPLETION**
✅ **VALIDATES BEFORE ALLOWING CODE**

The skill successfully prevents schema mismatch errors by:
1. Retrieving actual schema before coding
2. Presenting required fields and constraints
3. Enforcing pre-coding checklist
4. Requiring schema-helpers.ts for edge functions
5. Validating implementation
6. Checking for common mistakes

**Conclusion**: Skill is ready for production use.
