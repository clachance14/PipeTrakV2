# RPC Contracts: Manhour Earned Value Tracking (Simplified)

**Feature**: 032-manhour-earned-value
**Date**: 2025-12-04
**Updated**: 2025-12-04 (Simplified design - fewer RPCs, computed earned value)

## Overview

All RPC functions use SECURITY DEFINER with explicit permission checks. All functions return JSONB with consistent response format.

**Simplified Design:**
- Only 1 RPC needed: `create_manhour_budget`
- Earned value is computed on the fly (no RPC needed)
- Aggregations use dynamic SQL queries (no RPC needed)
- Weight adjustments deferred to POST-MVP (no RPC needed)

---

## create_manhour_budget

Creates a new manhour budget for a project and auto-distributes manhours to all non-retired components by updating the `components` table directly.

### Signature

```sql
CREATE OR REPLACE FUNCTION create_manhour_budget(
  p_project_id UUID,
  p_total_budgeted_manhours NUMERIC,
  p_revision_reason TEXT,
  p_effective_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| p_project_id | UUID | Yes | Project to create budget for |
| p_total_budgeted_manhours | NUMERIC | Yes | Total manhours to budget (must be > 0) |
| p_revision_reason | TEXT | Yes | Reason for this budget (e.g., "Original estimate") |
| p_effective_date | DATE | No | Effective date (defaults to today) |

### Returns

```typescript
interface CreateBudgetResponse {
  success: boolean;
  budget_id: string;           // UUID of created budget
  version_number: number;      // Sequential version (1, 2, 3...)
  distribution_summary: {
    total_components: number;
    components_allocated: number;
    components_with_warnings: number;
    total_weight: number;
    total_allocated_mh: number;
  };
  warnings: Array<{
    component_id: string;
    identity_key: object;
    reason: string;            // e.g., "No parseable size, fixed weight assigned"
  }>;
  error?: string;              // Only present if success=false
}
```

### Example

```typescript
const { data, error } = await supabase.rpc('create_manhour_budget', {
  p_project_id: projectId,
  p_total_budgeted_manhours: 1250.00,
  p_revision_reason: 'Original estimate',
  p_effective_date: '2025-01-15'
});

// Response:
{
  "success": true,
  "budget_id": "550e8400-e29b-41d4-a716-446655440000",
  "version_number": 1,
  "distribution_summary": {
    "total_components": 500,
    "components_allocated": 500,
    "components_with_warnings": 12,
    "total_weight": 847.25,
    "total_allocated_mh": 1250.00
  },
  "warnings": [
    {
      "component_id": "...",
      "identity_key": {"drawing": "P001", "size": "NOSIZE", ...},
      "reason": "No parseable size, fixed weight assigned"
    }
  ]
}
```

### Behavior

1. Validates caller has Owner, Admin, or PM role on project
2. Validates p_total_budgeted_manhours > 0
3. Validates project has non-retired components
4. Deactivates any existing active budget (sets is_active = false)
5. Creates new budget record in `project_manhour_budgets` with next version_number
6. For each non-retired component:
   - Parses SIZE from identity_key using weight formula (diameter^1.5)
   - For threaded pipe: weight = diameter^1.5 × linear_feet × 0.1
   - For no parseable size: weight = 1.0 (fixed)
   - Updates `components.manhour_weight` and `components.budgeted_manhours`
7. Returns summary with warnings

### Weight Calculation (in RPC)

```sql
-- Weight calculation logic inside RPC
CASE
  -- Threaded pipe with linear feet
  WHEN component_type = 'threaded_pipe' AND (identity_key->>'linear_feet')::NUMERIC IS NOT NULL
  THEN POWER(parsed_diameter, 1.5) * (identity_key->>'linear_feet')::NUMERIC * 0.1

  -- Reducer (format: "2X4")
  WHEN identity_key->>'size' ~ '^\d+[Xx]\d+$'
  THEN POWER(((left_diameter + right_diameter) / 2), 1.5)

  -- Standard component with diameter
  WHEN parsed_diameter IS NOT NULL
  THEN POWER(parsed_diameter, 1.5)

  -- No parseable size → fixed weight
  ELSE 1.0
END AS weight
```

### Errors

| Error | Condition |
|-------|-----------|
| `UNAUTHORIZED` | Caller not Owner, Admin, or PM |
| `INVALID_BUDGET` | p_total_budgeted_manhours <= 0 |
| `NO_COMPONENTS` | Project has zero non-retired components |
| `ZERO_WEIGHT` | Sum of component weights is zero |

---

## Permission Helper (Internal)

```sql
-- Check if caller has financial role on project
CREATE OR REPLACE FUNCTION check_manhour_permission(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id = p_project_id
    AND pu.user_id = auth.uid()
    AND pu.role IN ('owner', 'admin', 'project_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Computed Values (No RPC Needed)

### Earned Manhours

Computed on the fly in frontend queries:

```sql
-- Single component
SELECT
  budgeted_manhours,
  ROUND(budgeted_manhours * (percent_complete / 100.0), 4) AS earned_manhours
FROM components
WHERE id = ?;
```

### Project Summary

Computed via inline query or view:

```sql
-- Project-level summary
SELECT
  b.id AS budget_id,
  b.version_number,
  b.total_budgeted_manhours,
  b.revision_reason,
  b.effective_date,
  SUM(c.budgeted_manhours) AS allocated_mh,
  SUM(c.budgeted_manhours * c.percent_complete / 100.0) AS earned_mh,
  b.total_budgeted_manhours - SUM(c.budgeted_manhours * c.percent_complete / 100.0) AS remaining_mh,
  CASE
    WHEN b.total_budgeted_manhours = 0 THEN 0
    ELSE ROUND(SUM(c.budgeted_manhours * c.percent_complete / 100.0) / b.total_budgeted_manhours * 100, 2)
  END AS percent_complete,
  COUNT(c.id) AS component_count
FROM project_manhour_budgets b
LEFT JOIN components c ON c.project_id = b.project_id AND NOT c.is_retired
WHERE b.project_id = ? AND b.is_active = true
GROUP BY b.id, b.version_number, b.total_budgeted_manhours, b.revision_reason, b.effective_date;
```

### Aggregations by Dimension

Computed via inline query with GROUP BY:

```sql
-- Example: by Area
SELECT
  a.id AS area_id,
  a.name AS area_name,
  COUNT(c.id) AS component_count,
  SUM(c.budgeted_manhours) AS budgeted_mh,
  SUM(c.budgeted_manhours * c.percent_complete / 100.0) AS earned_mh,
  SUM(c.budgeted_manhours) - SUM(c.budgeted_manhours * c.percent_complete / 100.0) AS remaining_mh,
  CASE
    WHEN SUM(c.budgeted_manhours) = 0 THEN 0
    ELSE ROUND(SUM(c.budgeted_manhours * c.percent_complete / 100.0) / SUM(c.budgeted_manhours) * 100, 2)
  END AS percent_complete_mh
FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND NOT c.is_retired
WHERE a.project_id = ?
GROUP BY a.id, a.name;
```

---

## What Was Removed (Original Design)

| Original RPC | Reason Removed |
|--------------|----------------|
| `redistribute_component_weight` | Deferred to POST-MVP |
| `calculate_component_earned_manhours` | Not needed - computed on the fly |
| `recalculate_project_earned_manhours` | Not needed - computed on the fly |
| `override_bucket_allocation` | Deferred to POST-MVP (no buckets) |
| `get_manhour_summary` | Can be done via inline query instead |

**RPC count reduced from 6 → 1**
