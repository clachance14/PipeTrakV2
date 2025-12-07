# Data Model: Manhour Earned Value Tracking

**Feature**: 032-manhour-earned-value
**Date**: 2025-12-04
**Updated**: 2025-12-04 (Simplified design - columns on components table)

## Design Philosophy

This feature uses a **simplified data model** where:
- Manhour data lives directly on the `components` table (no separate junction table)
- Earned value is **always computed on the fly** from `budgeted_manhours × percent_complete`
- Aggregations use dynamic SQL queries with existing grouping logic (no pre-built views)
- Budget history is tracked in a separate `project_manhour_budgets` table

## Entity Relationship Diagram

```
┌──────────────────────────┐
│      projects            │
│  (existing table)        │
└─────────┬────────────────┘
          │ 1
          │
          │ *
┌─────────▼────────────────┐      ┌──────────────────────────┐
│ project_manhour_budgets  │      │      components          │
│  - id (PK)               │      │   (existing table)       │
│  - project_id (FK)       │      │                          │
│  - version_number        │      │  + budgeted_manhours     │  ← NEW COLUMN
│  - total_budgeted_mh     │      │  + manhour_weight        │  ← NEW COLUMN
│  - revision_reason       │      │                          │
│  - effective_date        │      │  (earned_manhours is     │
│  - is_active             │      │   COMPUTED, not stored:  │
│  - created_by            │      │   budgeted × % complete) │
│  - created_at            │      └──────────────────────────┘
└──────────────────────────┘
```

## Schema Changes

### New Columns on `components` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| budgeted_manhours | NUMERIC(10,4) | DEFAULT 0 | Manhours allocated to this component |
| manhour_weight | NUMERIC(10,4) | DEFAULT 0 | Calculated weight value (diameter^1.5 or fixed) |

**Migration:**
```sql
ALTER TABLE components
ADD COLUMN budgeted_manhours NUMERIC(10,4) DEFAULT 0,
ADD COLUMN manhour_weight NUMERIC(10,4) DEFAULT 0;
```

**Note:** No RLS changes needed - components already has RLS policies. Manhour data visibility is controlled at the application layer via role checks.

---

### New Table: `project_manhour_budgets`

Stores versioned manhour budget records for projects. Only one budget can be active per project at any time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| project_id | UUID | FK → projects(id), NOT NULL | Project this budget belongs to |
| version_number | INTEGER | NOT NULL, DEFAULT 1 | Sequential version (1, 2, 3...) |
| total_budgeted_manhours | NUMERIC(12,2) | NOT NULL, CHECK > 0 | Total budgeted manhours for project |
| revision_reason | TEXT | NOT NULL | Why this budget was created (e.g., "Original estimate", "Change order #CO-042") |
| effective_date | DATE | NOT NULL | When this budget becomes effective |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether this is the current active budget |
| created_by | UUID | FK → auth.users(id), NOT NULL | User who created this budget |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Constraints**:
- UNIQUE (project_id, version_number) - No duplicate versions per project
- Only one active budget per project (enforced via trigger)

**Indexes**:
- idx_manhour_budgets_project_active ON (project_id) WHERE is_active = true
- idx_manhour_budgets_project ON (project_id)

**RLS Policies**:
```sql
-- SELECT: Project members with financial roles
CREATE POLICY "select_budget" ON project_manhour_budgets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id = project_manhour_budgets.project_id
    AND pu.user_id = auth.uid()
    AND pu.role IN ('owner', 'admin', 'project_manager')
  )
);

-- INSERT: Project members with financial roles
CREATE POLICY "insert_budget" ON project_manhour_budgets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id = project_manhour_budgets.project_id
    AND pu.user_id = auth.uid()
    AND pu.role IN ('owner', 'admin', 'project_manager')
  )
);

-- UPDATE: Project members with financial roles (only is_active can be updated)
CREATE POLICY "update_budget" ON project_manhour_budgets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id = project_manhour_budgets.project_id
    AND pu.user_id = auth.uid()
    AND pu.role IN ('owner', 'admin', 'project_manager')
  )
);

-- DELETE: Never (budgets are archived, not deleted)
```

---

## Computed Fields (Not Stored)

### Earned Manhours

**Formula:** `earned_manhours = budgeted_manhours × (percent_complete / 100)`

Since `percent_complete` is already calculated and maintained by the existing milestone system, earned manhours is always derived on the fly:

```sql
-- Single component
SELECT
  budgeted_manhours,
  ROUND(budgeted_manhours * (percent_complete / 100.0), 4) AS earned_manhours
FROM components
WHERE id = ?;

-- Aggregation by any dimension (example: by area)
SELECT
  area_id,
  COUNT(*) AS component_count,
  SUM(budgeted_manhours) AS total_budgeted,
  SUM(budgeted_manhours * percent_complete / 100.0) AS total_earned,
  CASE
    WHEN SUM(budgeted_manhours) = 0 THEN 0
    ELSE ROUND(SUM(budgeted_manhours * percent_complete / 100.0) / SUM(budgeted_manhours) * 100, 2)
  END AS percent_complete_mh
FROM components
WHERE project_id = ? AND NOT is_retired
GROUP BY area_id;
```

**Benefits of computed approach:**
- Always accurate (no sync issues)
- Simpler data model (no stored `earned_manhours` column)
- Works with any grouping dimension without pre-built views

---

## Weight Calculation

The `manhour_weight` column stores the calculated weight used for proportional distribution.

### Weight Formula

```
Standard component:  weight = POWER(diameter, 1.5)
Reducer (e.g. 2X4):  weight = POWER((d1 + d2) / 2, 1.5)  -- average diameter
Threaded pipe:       weight = POWER(diameter, 1.5) × linear_feet × 0.1
No parseable size:   weight = 0.5 (fixed fallback for instruments/accessories)
```

### Weight Examples

| Component Size | Weight Calculation | Result |
|----------------|-------------------|--------|
| 2" | POWER(2, 1.5) | 2.83 |
| 4" | POWER(4, 1.5) | 8.00 |
| 1/2" | POWER(0.5, 1.5) | 0.35 |
| 2X4 (reducer) | POWER((2+4)/2, 1.5) = POWER(3, 1.5) | 5.20 |
| NOSIZE | Fixed | 0.50 |

---

## Post-Baseline Component Identification

Components created after the budget baseline are considered "additions" and do not receive manhour allocation:

**Identification Rule:**
```sql
-- Component is a post-baseline addition if:
component.created_at > budget.effective_date

-- Query for post-baseline additions:
SELECT c.*
FROM components c
JOIN project_manhour_budgets b ON c.project_id = b.project_id AND b.is_active = true
WHERE c.created_at > b.effective_date
  AND NOT c.is_retired;
```

**Behavior:**
- Post-baseline components have `budgeted_manhours = 0`
- They are excluded from earned value calculations (0 × anything = 0)
- They are viewable in a dedicated "Added Components" report
- They remain at 0 until a new budget version is created (which sets a new baseline date)

---

## State Transitions

### Budget Lifecycle

```
[No Budget] → create_manhour_budget() → [Active Budget v1]
                                              │
                                              └─ create_manhour_budget() → [Active Budget v2]
                                                      │                    [Archived Budget v1]
                                                      │
                                                      └─ ... (repeat)
```

### Component Manhours Lifecycle

```
[budgeted_manhours = 0] → budget distribution → [budgeted_manhours > 0]
                                                       │
                                                       ├─ milestone progress → earned_manhours increases (computed)
                                                       │
                                                       └─ new budget version → budgeted_manhours recalculated
```

---

## Validation Rules

1. **Budget Total**: Must be > 0
2. **Version Number**: Auto-incremented, unique per project
3. **Active Budget**: Only one per project (trigger enforces)
4. **Weight Value**: Must be >= 0
5. **Budgeted Manhours**: Must be >= 0

---

## What Was Removed (Original Design)

The following elements from the original design were removed for simplicity:

- ❌ `component_manhours` table → Replaced with columns on `components`
- ❌ `manhour_buckets` table → Not needed (aggregations are dynamic)
- ❌ `vw_manhour_by_area` view → Dynamic query instead
- ❌ `vw_manhour_by_system` view → Dynamic query instead
- ❌ `vw_manhour_by_test_package` view → Dynamic query instead
- ❌ `vw_manhour_by_drawing` view → Dynamic query instead
- ❌ `vw_manhour_project_summary` view → Dynamic query instead
- ❌ Stored `earned_manhours` column → Computed on the fly
- ❌ `calculation_basis` column → Simplified (not needed for MVP)
- ❌ `calculation_metadata` JSONB → Simplified (not needed for MVP)
