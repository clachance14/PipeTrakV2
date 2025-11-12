# Data Model: Editable Milestone Weight Templates

**Phase**: 1 (Design & Contracts)
**Date**: 2025-11-10
**Status**: Complete

## Entity Relationship Diagram

```
┌─────────────────┐
│   projects      │
│  (existing)     │
└────────┬────────┘
         │ 1
         │
         │ *
┌────────┴────────────────────────┐
│  project_progress_templates     │ ◄─── Clone from ───┐
│  (NEW)                          │                     │
│  ─────────────────────────      │                     │
│  id (PK)                        │                     │
│  project_id (FK → projects)     │                     │
│  component_type                 │                ┌────┴─────────────┐
│  milestone_name                 │                │ progress_templates│
│  weight (0-100)                 │                │   (existing)     │
│  milestone_order                │                └──────────────────┘
│  is_partial                     │
│  requires_welder                │
│  created_at                     │
│  updated_at                     │
│  UNIQUE(project_id, comp_type,  │
│         milestone_name)         │
└─────────────────────────────────┘
         │ *
         │
         │ 1
┌────────┴────────────────────────┐
│  project_template_changes       │
│  (NEW - audit log)              │
│  ─────────────────────────      │
│  id (PK)                        │
│  project_id (FK → projects)     │
│  component_type                 │
│  changed_by (FK → users)        │
│  old_weights (JSONB)            │
│  new_weights (JSONB)            │
│  applied_to_existing (boolean)  │
│  affected_component_count (int) │
│  changed_at                     │
└─────────────────────────────────┘
```

## Entities

### project_progress_templates (NEW)

**Purpose**: Per-project milestone weight configuration, cloned from system templates.

**Attributes**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `project_id` | `uuid` | REFERENCES projects(id) ON DELETE CASCADE, NOT NULL | Project association |
| `component_type` | `text` | NOT NULL | Component type (e.g., "Field Weld", "Spool") |
| `milestone_name` | `text` | NOT NULL | Milestone name (e.g., "Weld Made", "Fit-Up") |
| `weight` | `integer` | NOT NULL, CHECK (weight >= 0 AND weight <= 100) | Percentage weight (0-100) |
| `milestone_order` | `integer` | NOT NULL | Display order (1-based) |
| `is_partial` | `boolean` | DEFAULT false | True if milestone has partial completion (0-100%) |
| `requires_welder` | `boolean` | DEFAULT false | True if milestone requires welder assignment |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last modification timestamp |

**Constraints**:
- `UNIQUE(project_id, component_type, milestone_name)` - No duplicate milestones within component type
- Trigger `validate_project_template_weights()` - Enforces sum of weights = 100% per (project_id, component_type)

**Indexes**:
```sql
CREATE INDEX idx_project_templates_lookup
ON project_progress_templates(project_id, component_type);
```

**Relationships**:
- **Many-to-One**: `project_id` → `projects.id` (ON DELETE CASCADE)
- **Cloned From**: System `progress_templates` (one-time copy on project creation or manual clone)

**Validation Rules**:
1. **Individual weight range**: 0 ≤ weight ≤ 100 (CHECK constraint)
2. **Weight sum**: SUM(weight) per (project_id, component_type) = 100 (trigger validation)
3. **At least one milestone**: Each component type must have ≥1 milestone with weight > 0

**State Transitions**:
- **Created**: Cloned from `progress_templates` (via trigger or RPC)
- **Updated**: Weight modified by admin/PM (logged in audit table)
- **Deleted**: Cascade deleted when project deleted (rows remain in audit table)

---

### project_template_changes (NEW - Audit Table)

**Purpose**: Immutable audit log of all template weight modifications.

**Attributes**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `project_id` | `uuid` | REFERENCES projects(id) ON DELETE CASCADE, NOT NULL | Project association |
| `component_type` | `text` | NOT NULL | Component type that was modified |
| `changed_by` | `uuid` | REFERENCES users(id) ON DELETE SET NULL | User who made the change |
| `old_weights` | `jsonb` | NOT NULL | Array of {milestone_name, weight} before change |
| `new_weights` | `jsonb` | NOT NULL | Array of {milestone_name, weight} after change |
| `applied_to_existing` | `boolean` | NOT NULL | True if recalculation was applied to existing components |
| `affected_component_count` | `integer` | NOT NULL | Number of components affected by recalculation (0 if not applied) |
| `changed_at` | `timestamptz` | DEFAULT now() | Change timestamp |

**Constraints**:
- No UNIQUE constraints (multiple changes allowed)
- `changed_by` ON DELETE SET NULL (preserve history if user deleted)

**Indexes**:
```sql
CREATE INDEX idx_template_changes_project
ON project_template_changes(project_id, component_type, changed_at DESC);
```

**Relationships**:
- **Many-to-One**: `project_id` → `projects.id` (ON DELETE CASCADE)
- **Many-to-One**: `changed_by` → `users.id` (ON DELETE SET NULL)

**Validation Rules**:
1. **JSONB structure**: `old_weights` and `new_weights` must be arrays of objects with `milestone_name` (text) and `weight` (integer) keys
2. **Immutable**: INSERT only, no UPDATE/DELETE allowed (enforced by RLS policies)

**State Transitions**:
- **Created**: Automatically via trigger on `project_progress_templates` UPDATE (or manual INSERT from RPC)
- **Never Updated/Deleted**: Immutable audit trail

**Example JSONB**:
```json
{
  "old_weights": [
    {"milestone_name": "Fit-Up", "weight": 10},
    {"milestone_name": "Weld Made", "weight": 60},
    {"milestone_name": "Punch", "weight": 10},
    {"milestone_name": "Test", "weight": 15},
    {"milestone_name": "Restore", "weight": 5}
  ],
  "new_weights": [
    {"milestone_name": "Fit-Up", "weight": 10},
    {"milestone_name": "Weld Made", "weight": 70},
    {"milestone_name": "Punch", "weight": 10},
    {"milestone_name": "Test", "weight": 5},
    {"milestone_name": "Restore", "weight": 5}
  ]
}
```

---

### components (EXISTING - Modified Calculation)

**No schema changes** to `components` table. Existing fields:
- `id` (uuid, PK)
- `project_id` (FK → projects)
- `component_type` (text)
- `current_milestones` (jsonb) - milestone completion state
- `percent_complete` (integer) - calculated weighted progress
- `updated_at` (timestamptz)

**Modification**: `calculate_component_percent(component_id)` function updated to:
1. Query `project_progress_templates` first (project-specific weights)
2. Fall back to `progress_templates` if no project templates exist
3. Calculate weighted sum: `SUM(weight × completion)` where completion = 1 for discrete (boolean true), completion = value/100 for partial (numeric 0-100)

**Trigger**: Existing `update_component_percent_on_milestone_change` trigger remains unchanged (calls updated function).

---

### progress_templates (EXISTING - Source for Cloning)

**No schema changes**. Existing fields:
- `id` (uuid, PK)
- `component_type` (text)
- `milestone_name` (text)
- `weight` (integer)
- `milestone_order` (integer)
- `is_partial` (boolean)
- `requires_welder` (boolean)

**Usage**: Source of truth for system-wide defaults. Cloned to `project_progress_templates` on project creation or manual clone.

---

## Validation Rules Summary

### Database-Level Validation

1. **Weight Range**: `CHECK (weight >= 0 AND weight <= 100)` on `project_progress_templates.weight`
2. **Weight Sum**: Trigger `validate_project_template_weights()` fires AFTER INSERT/UPDATE to ensure `SUM(weight) = 100` per (project_id, component_type)
3. **Uniqueness**: `UNIQUE(project_id, component_type, milestone_name)` prevents duplicate milestones
4. **Foreign Keys**: `project_id` references `projects.id`, `changed_by` references `users.id`

### Application-Level Validation (TypeScript)

```typescript
// Zod schema for weight editing form
const templateWeightsSchema = z.object({
  weights: z.array(z.object({
    milestone_name: z.string().min(1),
    weight: z.number().int().min(0).max(100)
  }))
}).refine(
  (data) => {
    const total = data.weights.reduce((sum, w) => sum + w.weight, 0);
    return total === 100;
  },
  {
    message: "Weights must sum to exactly 100%",
    path: ["weights"]
  }
);
```

### RLS Validation (Security)

```sql
-- SELECT: Project members can view templates
-- UPDATE: Only admins and project managers can modify templates
-- INSERT: Only via RPC (cloning function with permission checks)
-- DELETE: Not allowed (preserve history, fallback to system templates instead)
```

---

## State Transition Diagrams

### Template Lifecycle

```
┌──────────────────┐
│ System Templates │ (progress_templates)
└────────┬─────────┘
         │
         │ Clone (on project creation or manual trigger)
         ↓
┌─────────────────────┐
│  Project Templates  │ (project_progress_templates)
│   (Initial State)   │
└──────────┬──────────┘
           │
           │ User edits weights
           ↓
┌─────────────────────┐
│  Project Templates  │
│   (Modified State)  │ ───┐
└─────────────────────┘    │
           │                │ Audit log entry created
           │                ↓
           │         ┌──────────────────┐
           │         │ Template Changes │
           │         │  (Audit Record)  │
           │         └──────────────────┘
           │
           │ Optional: Apply to existing components
           ↓
┌─────────────────────┐
│    Components       │
│ (Recalculated %)    │
└─────────────────────┘
```

### Weight Editing Flow

```
User opens editor
       │
       ↓
Load current weights from project_progress_templates
       │
       ↓
User adjusts weights
       │
       ├─→ Total ≠ 100% → Disable Save, show error
       │
       ├─→ Total = 100% → Enable Save
       │                    │
       │                    ↓
       │           User clicks Save
       │                    │
       │                    ↓
       │           Client validates (Zod)
       │                    │
       │                    ├─→ Validation fails → Show error toast
       │                    │
       │                    ├─→ Validation passes → Call RPC
       │                                              │
       │                                              ↓
       │                                    Server validates (trigger)
       │                                              │
       │                                              ├─→ Sum ≠ 100% → Return error
       │                                              │
       │                                              ├─→ Sum = 100% → Update templates
       │                                                                 │
       │                                                                 ↓
       │                                                         Log to audit table
       │                                                                 │
       │                                                                 ├─→ apply_to_existing = false → Done
       │                                                                 │
       │                                                                 ├─→ apply_to_existing = true → Recalculate components
       │                                                                                               │
       │                                                                                               ↓
       │                                                                                      Return affected count
       ↓                                                                                               │
Close modal, show success ←──────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Query Performance

**Hot path**: `calculate_component_percent(component_id)` called on every milestone update.

**Optimization**: Single-table lookup with composite index:
```sql
-- Fast lookup: (project_id, component_type) covers 99% of queries
CREATE INDEX idx_project_templates_lookup
ON project_progress_templates(project_id, component_type);
```

**Estimated Rows**: 55 rows per project (11 component types × ~5 milestones each).

**Expected Performance**:
- Template lookup: <5ms (indexed query)
- Weight calculation: <1ms (in-memory aggregation)
- Total overhead: <10ms per milestone update

### Recalculation Performance

**Batch update** for retroactive recalculation:
```sql
UPDATE components
SET percent_complete = calculate_component_percent(id),
    updated_at = now()
WHERE project_id = :project_id
  AND component_type = :component_type;
```

**Expected Performance** (per SC-003):
- 1,000 components: <3 seconds
- 10,000 components: <30 seconds (extrapolated)

**Bottleneck**: Function call per row (cannot batch `calculate_component_percent` calls). Acceptable for stated scale.

### Audit Log Performance

**Write-heavy**: One INSERT per template edit (low frequency: ~10 edits/day per project).

**Read queries**: Chronological listing, filtered by (project_id, component_type):
```sql
SELECT * FROM project_template_changes
WHERE project_id = :project_id
  AND component_type = :component_type
ORDER BY changed_at DESC
LIMIT 50;
```

**Index coverage**: `idx_template_changes_project` covers this query exactly.

---

## Migration Dependencies

### Migration Order (7 migrations)

1. **00085_project_progress_templates.sql**
   - Creates `project_progress_templates` table
   - Adds CHECK constraint on weight
   - Creates lookup index
   - **Depends on**: `projects` table (existing)

2. **00086_template_validation.sql**
   - Creates `validate_project_template_weights()` trigger function
   - Adds AFTER INSERT/UPDATE trigger to `project_progress_templates`
   - **Depends on**: Migration 00085 (table exists)

3. **00087_template_audit.sql**
   - Creates `project_template_changes` table
   - Adds audit index
   - Creates trigger to log changes on UPDATE
   - **Depends on**: Migrations 00085, 00086 (table + validation exist)

4. **00088_clone_templates_rpc.sql**
   - Creates `clone_system_templates_for_project(project_id)` RPC
   - SECURITY DEFINER function for manual cloning
   - **Depends on**: Migration 00085 (target table exists)

5. **00089_auto_clone_templates_trigger.sql**
   - Creates trigger on `projects` AFTER INSERT
   - Automatically clones templates for new projects
   - **Depends on**: Migration 00088 (cloning RPC exists)

6. **00090_update_calculate_percent.sql**
   - Modifies existing `calculate_component_percent(component_id)` function
   - Adds fallback logic: check `project_progress_templates` first, then `progress_templates`
   - **Depends on**: Migration 00085 (project templates table exists)

7. **00091_template_rls_policies.sql**
   - Creates 4 RLS policies (SELECT, UPDATE, INSERT via RPC, DELETE blocked)
   - Enforces admin/project_manager permissions
   - **Depends on**: Migrations 00085, 00087 (both tables exist)

### Rollback Plan

**Forward rollback** (preserve audit data):
```sql
-- Revert calculate_component_percent to original
-- (re-apply migration 00010_component_tracking.sql)

-- Drop RLS policies
DROP POLICY IF EXISTS "Project members can view templates" ON project_progress_templates;
DROP POLICY IF EXISTS "Project admins and managers can update templates" ON project_progress_templates;
-- (+ 2 more policies)

-- Disable auto-cloning trigger
DROP TRIGGER IF EXISTS auto_clone_templates_on_project_create ON projects;

-- Preserve tables for forensics (do not drop)
```

**Full rollback** (destructive):
```sql
DROP TABLE IF EXISTS project_template_changes CASCADE;
DROP TABLE IF EXISTS project_progress_templates CASCADE;
DROP FUNCTION IF EXISTS clone_system_templates_for_project CASCADE;
DROP FUNCTION IF EXISTS validate_project_template_weights CASCADE;
-- Revert calculate_component_percent
```

---

## Future Considerations

### Potential Enhancements (Not in Scope)

1. **Template Versioning**: Track system template evolution, notify projects when updates available
2. **Template Sharing**: Export/import templates between projects
3. **Milestone Addition/Removal**: Allow admins to add custom milestones (not just adjust weights)
4. **Batch Editing**: Edit multiple component types simultaneously
5. **Undo/Redo**: Revert to previous weight configuration with one click

### Scalability

**Current design handles**:
- 100 projects × 55 templates = 5,500 rows (trivial)
- 10,000 components per project (recalculation <30 seconds)

**If scale increases 100x** (1,000,000 components per project):
- Consider async recalculation (pg_cron job + status polling)
- Add `last_recalculated_at` field to track stale components
- Batch updates in chunks (10,000 components per transaction)
