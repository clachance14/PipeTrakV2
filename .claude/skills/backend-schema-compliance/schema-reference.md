# Schema Reference - Current State

---
**⚠️ QUICK REFERENCE ONLY - Not the source of truth**

**Source of Truth**: Supabase Dashboard Schema Export (last updated: 2025-11-21)

**Validation**: The SKILL will always read migration files directly when enforcing compliance. This reference is for quick lookup only.

**When to Update**: After any migration that modifies table structure

**Auto-Update**: Run `npm run sync-skill-docs` after schema changes
---

## Table: `components`

**Purpose**: Core entity representing physical pipe components (supports 1M+ rows)

### Required Fields (NOT NULL without DEFAULT)

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `project_id` | uuid | FK → projects | RLS filter key |
| `component_type` | text | One of 11 types | NOT `type`! See identity key structures |
| `progress_template_id` | uuid | FK → progress_templates | Required before insert |
| `identity_key` | jsonb | CHECK constraint | Structure must match component_type |
| `current_milestones` | jsonb | Default `{}` | **Numeric values (0-1), NOT boolean** |
| `percent_complete` | numeric(5,2) | 0.00-100.00 | Auto-calculated via trigger |
| `created_at` | timestamptz | Default now() | Auto-set |
| `last_updated_at` | timestamptz | Default now() | Auto-set |

### Optional Fields

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Auto-generated if omitted |
| `drawing_id` | uuid | FK → drawings, nullable |
| `area_id` | uuid | FK → areas, nullable |
| `system_id` | uuid | FK → systems, nullable |
| `test_package_id` | uuid | FK → test_packages, nullable |
| `attributes` | jsonb | Max 10KB (CHECK constraint) |
| `created_by` | uuid | FK → users, should always be set |
| `last_updated_by` | uuid | FK → users, should match created_by on insert |
| `is_retired` | boolean | Default false (soft delete) |
| `retire_reason` | text | Only if is_retired = true |
| `version` | integer | Default 1, optimistic locking |

### Critical Constraints

1. **identity_key structure** - Validated by `validate_component_identity_key()` function
   - See `identity-key-structures.md` for per-type requirements

2. **percent_complete range** - Must be 0.00 to 100.00

3. **attributes max size** - 10KB (10,240 bytes)

4. **Unique identity** - `(project_id, component_type, identity_key)` must be unique where NOT retired

### Common Mistakes

❌ Using `type` instead of `component_type`
❌ Missing `progress_template_id` (required!)
❌ Wrong identity_key structure for component_type
❌ Boolean values in `current_milestones` (use numeric 0-1)
❌ Forgetting `last_updated_by` on insert (should match `created_by`)

### Triggers

- `update_component_percent_on_milestone_change` - Auto-recalculates `percent_complete` when `current_milestones` changes

---

## Table: `field_welds`

**Purpose**: Field weld specific data (1:1 with field_weld components)

### Required Fields (NOT NULL without DEFAULT)

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `component_id` | uuid | FK → components, UNIQUE | 1:1 relationship |
| `project_id` | uuid | FK → projects | Must match component's project_id |
| `weld_type` | text | CHECK: BW, SW, FW, TW | No other values allowed |
| `created_by` | uuid | FK → users | Always required |

### Optional with Defaults

| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| `nde_required` | boolean | false | - |
| `status` | text | 'active' | CHECK: active, accepted, rejected |
| `created_at` | timestamptz | now() | Auto-set |
| `updated_at` | timestamptz | now() | Auto-set |
| `is_unplanned` | boolean | false | Added in recent migration |

### Optional Fields (Nullable)

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `weld_size` | text | - | - |
| `schedule` | text | - | - |
| `base_metal` | text | - | - |
| `spec` | text | - | - |
| `welder_id` | uuid | FK → welders | Set when "Weld Made" milestone complete |
| `date_welded` | date | - | Set when "Weld Made" milestone complete |
| `nde_type` | text | CHECK: RT, UT, PT, MT, VT or null | - |
| `nde_result` | text | CHECK: PASS, FAIL, PENDING or null | - |
| `nde_date` | date | - | - |
| `nde_notes` | text | - | - |
| `xray_percentage` | numeric | CHECK: 0-100 or null | Added in recent migration |
| `original_weld_id` | uuid | FK → field_welds (self) | If this is a repair weld |
| `is_repair` | boolean | Computed from original_weld_id | Auto-set |
| `notes` | text | - | - |

### Critical Constraints

1. **weld_type** - Must be exactly 'BW', 'SW', 'FW', or 'TW' (case-sensitive)
2. **nde_type** - Must be 'RT', 'UT', 'PT', 'MT', 'VT', or null
3. **nde_result** - Must be 'PASS', 'FAIL', 'PENDING', or null
4. **xray_percentage** - If set, must be 0-100
5. **component_id** - UNIQUE (only one field_welds row per component)

### Common Mistakes

❌ Invalid weld_type (e.g., 'butt weld' instead of 'BW')
❌ Invalid nde_type (e.g., 'X-Ray' instead of 'RT')
❌ Forgetting to set component_id (required!)
❌ Mismatched project_id between field_weld and component

---

## Table: `welders`

**Purpose**: Welder registry per project

### Required Fields

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `project_id` | uuid | FK → projects | - |
| `name` | text | NOT NULL | Full name |
| `stencil` | text | NOT NULL | Raw stencil value |
| `stencil_norm` | text | CHECK: ^[A-Z0-9-]{2,12}$ | Normalized, uppercase |

### Optional with Defaults

| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| `status` | text | 'unverified' | CHECK: unverified, verified |
| `created_at` | timestamptz | now() | - |
| `updated_at` | timestamptz | now() | - |

### Optional Fields

| Column | Type | Notes |
|--------|------|-------|
| `created_by` | uuid | FK → users |
| `verified_at` | timestamptz | Set when status → 'verified' |
| `verified_by` | uuid | FK → users who verified |

### Critical Constraints

1. **stencil_norm** - Must match regex `^[A-Z0-9-]{2,12}$` (2-12 chars, uppercase alphanumeric + hyphen)
2. **Unique per project** - `(project_id, stencil_norm)` must be unique

---

## Table: `milestone_events`

**Purpose**: Audit trail of milestone state changes

### Required Fields

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `component_id` | uuid | FK → components | - |
| `milestone_name` | text | NOT NULL | Must match template milestone |
| `action` | text | CHECK: complete, rollback, update | - |
| `user_id` | uuid | FK → users | Who made the change |

### Optional Fields

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `value` | numeric(5,2) | - | New value (for partial % milestones) |
| `previous_value` | numeric(5,2) | - | Old value before change |
| `created_at` | timestamptz | Default now() | Auto-set |
| `metadata` | jsonb | Max 5KB | Welder info, out-of-sequence warnings |

### Critical Constraints

1. **action** - Must be 'complete', 'rollback', or 'update'
2. **metadata max size** - 5KB (5,120 bytes)

---

## Table: `drawings`

**Purpose**: Drawing registry per project

### Required Fields

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| `project_id` | uuid | FK → projects | - |
| `drawing_no_raw` | text | NOT NULL | Original input |
| `drawing_no_norm` | text | NOT NULL, CHECK: length > 0 | Normalized, trimmed |

### Optional with Defaults

| Column | Type | Default |
|--------|------|---------|
| `created_at` | timestamptz | now() |
| `is_retired` | boolean | false |

### Optional Fields

| Column | Type | Notes |
|--------|------|-------|
| `title` | text | - |
| `rev` | text | Revision |
| `area_id` | uuid | FK → areas |
| `system_id` | uuid | FK → systems |
| `test_package_id` | uuid | FK → test_packages |
| `retire_reason` | text | Only if is_retired = true |

---

## Audit Fields Pattern

Most tables follow this audit pattern:

```typescript
{
  created_at: timestamptz  // Default now(), auto-set
  created_by: uuid         // Should always be set (user context)
  updated_at?: timestamptz // If table supports updates
  last_updated_by?: uuid   // For components table specifically
}
```

**Best Practice**: Always set `created_by` to current user ID, even if nullable.

---

## JSONB Milestone Values

**CRITICAL**: `components.current_milestones` must use **numeric values (0-1), NOT booleans**.

### ❌ WRONG (causes 400 errors)
```json
{
  "Receive": true,
  "Erect": false
}
```

### ✅ CORRECT
```json
{
  "Receive": 1,
  "Erect": 0,
  "Fabricate": 0.75  // Partial milestone (75% complete)
}
```

**Why**: The `update_component_milestone` RPC expects numeric values. Boolean values cause:
```
ERROR: invalid input syntax for type numeric: "true"
```

**See**: Migration 00084 bug fix, BUG-FIXES.md

---

## Quick Checklist Before Insert

### For `components` table:
- [ ] Used `component_type`, NOT `type`
- [ ] Included `progress_template_id` (required)
- [ ] `identity_key` matches component_type structure
- [ ] `current_milestones` uses numeric values (0-1), NOT boolean
- [ ] Set `created_by` and `last_updated_by` to same user ID
- [ ] If using attributes, size ≤ 10KB

### For `field_welds` table:
- [ ] `weld_type` is exactly 'BW', 'SW', 'FW', or 'TW'
- [ ] `component_id` references valid field_weld component
- [ ] `project_id` matches component's project_id
- [ ] Set `created_by` to current user ID
- [ ] If using nde_type, value is 'RT', 'UT', 'PT', 'MT', or 'VT'
- [ ] If using xray_percentage, value is 0-100

### For `welders` table:
- [ ] `stencil_norm` matches regex: `^[A-Z0-9-]{2,12}$`
- [ ] `stencil_norm` is uppercase
- [ ] Set `created_by` to current user ID
