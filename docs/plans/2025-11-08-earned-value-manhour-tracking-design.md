# Earned Value Manhour Tracking - Design Document

**Author**: Claude Code
**Date**: 2025-11-08
**Status**: Design Complete - Ready for Implementation
**Estimated Effort**: 6 weeks (1 developer, full-time)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Background & Requirements](#background--requirements)
3. [Database Schema](#database-schema)
4. [Calculation Functions & Triggers](#calculation-functions--triggers)
5. [Data Aggregation & Reporting Views](#data-aggregation--reporting-views)
6. [Permissions & Security](#permissions--security)
7. [UI Integration](#ui-integration)
8. [User Workflow](#user-workflow)
9. [Implementation Phases](#implementation-phases)
10. [Testing Strategy](#testing-strategy)
11. [Risk Assessment](#risk-assessment)
12. [Appendix: Existing Infrastructure](#appendix-existing-infrastructure)

---

## Executive Summary

### Problem Statement
PipeTrak V2 currently tracks component progress using milestone-based earned value calculations (percentage complete), but does not track manhours. Construction project managers need to:
- Allocate total budgeted manhours across components
- Calculate earned manhours based on milestone completion
- Report manhour progress by Area, System, and Test Package
- Track budget revisions (change orders, scope changes)

### Solution Overview
Extend PipeTrak's existing earned value infrastructure to support manhour tracking:
- **Reuse existing milestone weights** from `progress_templates` (already sum to 100%)
- **Dimension-based auto-calculation** using SIZE field from component identity keys
- **Budget versioning** to support change orders and revisions
- **Permission-gated financial data** restricted to owner/admin/project_manager roles
- **Automatic earned manhour updates** via database triggers when milestones change

### Key Benefits
1. **Zero duplication** - Leverages existing milestone weight infrastructure
2. **Flexible workflow** - Budget can be added anytime; projects without budgets continue working
3. **Automatic distribution** - Manhours allocated based on component dimensions (no manual entry per component)
4. **Real-time tracking** - Earned manhours auto-update when field workers complete milestones
5. **Enterprise reporting** - Aggregate manhours by any dimension with PDF/Excel/CSV export

---

## Background & Requirements

### User Needs (Gathered via Brainstorming)

**Data Source**: Manual entry per project
- Project manager enters total budgeted manhours (e.g., 1,250 MH)
- System distributes to components automatically

**Weight Calculation**: Size/dimension-based
- Parse SIZE field from component identity_key (e.g., "2", "4", "1X2")
- Apply non-linear scaling (diameter^1.5) to reflect larger components take disproportionately more work
- Handle threaded pipe linear footage separately

**Milestone Progress**: Weighted milestones
- Each milestone has a weight (e.g., Install=40%, Weld=60%)
- Earned value accumulates as milestones complete
- Partial milestones (0-100%) contribute proportionally

**Reporting Visibility**: Multi-level (all selected)
- Project-level dashboard (total, earned, remaining, %)
- Component-level detail (budgeted and earned per component)
- Aggregated by metadata (Area, System, Test Package)
- Export capability (PDF/Excel/CSV)

**Constraints**:
- Permission-based access (only owner/admin/project_manager)
- Standard project architecture and security model

**Weight Configuration**: Global system default
- Single set of milestone weights applies to all components
- No per-project or per-component-type customization (simplest approach)

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate tables (Enterprise) | Support multiple budget versions, change orders, full history |
| Reuse milestone weights | Weights already represent "proportion of work", validated to sum to 100% |
| Dimension-based auto-calc | SIZE field contains parseable diameter data for most component types |
| Anytime budget creation | Flexible workflow - works for new and existing projects |
| Project Settings location | Budget is project configuration, belongs alongside other settings |
| Automatic distribution | Immediate feedback, no extra step required |
| Comprehensive post-distribute feedback | Success summary + breakdown + redirect + validation warnings |

---

## Database Schema

### New Tables

#### 1. `project_manhour_budgets`

Tracks total project budgeted manhours with full revision history.

```sql
CREATE TABLE project_manhour_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  total_budgeted_manhours NUMERIC(10,2) NOT NULL CHECK (total_budgeted_manhours > 0),
  revision_reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_project_budget_version UNIQUE (project_id, version),
  CONSTRAINT chk_one_active_budget_per_project CHECK (
    -- Enforced via trigger: only one is_active=true per project
  )
);

CREATE INDEX idx_project_manhour_budgets_project_active
  ON project_manhour_budgets(project_id) WHERE is_active = true;

COMMENT ON TABLE project_manhour_budgets IS
  'Project-level manhour budgets with version history for change orders';
COMMENT ON COLUMN project_manhour_budgets.version IS
  'Auto-increments (1, 2, 3...) for budget revisions';
COMMENT ON COLUMN project_manhour_budgets.revision_reason IS
  'Examples: "Original estimate", "Change order #CO-042", "Scope revision"';
COMMENT ON COLUMN project_manhour_budgets.is_active IS
  'Only one budget version can be active at a time per project';
```

**Revision Reason Examples**:
- "Original estimate"
- "Change order #CO-042"
- "Scope revision - added Area C"
- "Re-estimate after 30% complete"

#### 2. `component_manhours`

Stores component-level manhour allocations and earned manhours.

```sql
CREATE TABLE component_manhours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES project_manhour_budgets(id) ON DELETE CASCADE,
  budgeted_manhours NUMERIC(8,2) NOT NULL CHECK (budgeted_manhours >= 0),
  earned_manhours NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (earned_manhours >= 0),
  calculation_basis TEXT NOT NULL CHECK (calculation_basis IN ('dimension', 'fixed', 'linear_feet', 'manual')),
  calculation_metadata JSONB,
  last_calculated_at TIMESTAMPTZ,

  CONSTRAINT uq_component_budget UNIQUE (component_id, budget_id)
);

CREATE INDEX idx_component_manhours_component ON component_manhours(component_id);
CREATE INDEX idx_component_manhours_budget ON component_manhours(budget_id);

COMMENT ON TABLE component_manhours IS
  'Component-level manhour allocations with auto-calculated earned manhours';
COMMENT ON COLUMN component_manhours.calculation_basis IS
  'dimension: SIZE-based, fixed: instruments/spools, linear_feet: threaded pipe, manual: user override';
COMMENT ON COLUMN component_manhours.calculation_metadata IS
  'Stores calculation details: {"size": "4", "diameter_weight": 2.5, "material_multiplier": 1.2, "linear_feet": 100}';
COMMENT ON COLUMN component_manhours.earned_manhours IS
  'Auto-calculated via trigger when components.current_milestones changes';
```

**Calculation Metadata Examples**:
```jsonb
-- Dimension-based (4" valve)
{
  "size": "4",
  "diameter": 4.0,
  "diameter_weight": 8.0,
  "base_weight": 8.0,
  "total_weight_sum": 2500.0
}

-- Linear feet (threaded pipe)
{
  "size": "2",
  "diameter": 2.0,
  "linear_feet": 100.0,
  "weight": 20.0
}

-- Fixed weight (instrument)
{
  "size": "NOSIZE",
  "weight": 1.0,
  "reason": "No parseable size"
}
```

### Existing Table Reuse

#### `progress_templates.milestones_config`

**Decision**: Reuse existing milestone weights for manhour allocation (no new table needed).

**Current Structure**:
```jsonb
[
  {
    "name": "Receive",
    "weight": 5,           -- Percentage weight (must sum to 100%)
    "order": 1,
    "is_partial": false,
    "requires_welder": false
  },
  {
    "name": "Fabricate",
    "weight": 16,
    "order": 2,
    "is_partial": true,    -- Partial milestone (0-100%)
    "requires_welder": false
  }
]
```

**Why Reuse**:
- Weights already represent "proportion of work" (semantic match)
- Database CHECK constraint ensures weights sum to exactly 100.00
- No duplication or synchronization issues
- Used identically for percentage and manhour calculations

**Example Manhour Allocation**:
```
Field Weld with 10 budgeted manhours:
  Fit-Up (10% weight)     → 10 × 0.10 = 1.0 MH
  Weld Made (60% weight)  → 10 × 0.60 = 6.0 MH
  Punch (10% weight)      → 10 × 0.10 = 1.0 MH
  Test (15% weight)       → 10 × 0.15 = 1.5 MH
  Restore (5% weight)     → 10 × 0.05 = 0.5 MH
  Total: 10.0 MH
```

---

## Calculation Functions & Triggers

### 1. `calculate_component_weight()` - Dimension-Based Weighting

Calculates weight factor from component SIZE field for manhour distribution.

```sql
CREATE OR REPLACE FUNCTION calculate_component_weight(
  p_component_type TEXT,
  p_identity_key JSONB
) RETURNS NUMERIC AS $$
DECLARE
  v_size TEXT;
  v_diameter NUMERIC;
  v_linear_feet NUMERIC;
BEGIN
  v_size := p_identity_key->>'size';

  -- Handle components without size (instruments, spools)
  IF v_size IS NULL OR v_size = 'NOSIZE' OR v_size = '' THEN
    RETURN 1.0;  -- Fixed weight
  END IF;

  -- Parse diameter from size field
  IF v_size ~ '^\d+$' THEN
    -- Simple numeric: "2", "4" → diameter
    v_diameter := v_size::NUMERIC;
  ELSIF v_size ~ '^\d+X\d+$' THEN
    -- Reducer: "1X2" → average diameter
    v_diameter := (
      split_part(v_size, 'X', 1)::NUMERIC +
      split_part(v_size, 'X', 2)::NUMERIC
    ) / 2.0;
  ELSE
    -- Non-parseable (e.g., "1/4", "3/8"), use fixed weight
    RETURN 1.0;
  END IF;

  -- For threaded pipe, factor in linear footage
  IF p_component_type = 'threaded_pipe' THEN
    v_linear_feet := COALESCE((p_identity_key->>'linear_feet')::NUMERIC, 10.0);
    RETURN v_diameter * v_linear_feet * 0.1;  -- Weight = diameter × length × factor
  END IF;

  -- For other components: non-linear scaling
  -- Larger diameter = disproportionately more work (diameter^1.5)
  RETURN POWER(v_diameter, 1.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_component_weight IS
  'Calculates dimension-based weight factor for manhour distribution using SIZE field';
```

**Weight Calculation Examples**:

| Component Type | SIZE | Calculation | Weight |
|----------------|------|-------------|--------|
| 2" Valve | "2" | 2^1.5 | 2.83 |
| 4" Valve | "4" | 4^1.5 | 8.00 |
| 1x2 Reducer | "1X2" | ((1+2)/2)^1.5 | 1.84 |
| Instrument | "NOSIZE" | Fixed | 1.00 |
| Threaded Pipe | "2" + 100 LF | 2 × 100 × 0.1 | 20.00 |

### 2. `distribute_manhours_to_components()` - Auto-Distribution

Distributes total project manhours across components proportionally.

```sql
CREATE OR REPLACE FUNCTION distribute_manhours_to_components(
  p_budget_id UUID
) RETURNS TABLE (
  components_processed INTEGER,
  total_allocated NUMERIC,
  warnings JSONB
) AS $$
DECLARE
  v_project_id UUID;
  v_total_budgeted NUMERIC;
  v_total_weight NUMERIC := 0;
  v_component RECORD;
  v_component_count INTEGER := 0;
  v_warnings JSONB := '[]'::JSONB;
BEGIN
  -- Get project and total budget
  SELECT project_id, total_budgeted_manhours
  INTO v_project_id, v_total_budgeted
  FROM project_manhour_budgets
  WHERE id = p_budget_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget not found: %', p_budget_id;
  END IF;

  -- Calculate total weight across all components
  FOR v_component IN
    SELECT c.id, c.component_type, c.identity_key
    FROM components c
    WHERE c.project_id = v_project_id AND NOT c.is_retired
  LOOP
    v_total_weight := v_total_weight + calculate_component_weight(
      v_component.component_type,
      v_component.identity_key
    );
  END LOOP;

  IF v_total_weight = 0 THEN
    RAISE EXCEPTION 'Total weight is zero - no components to distribute to';
  END IF;

  -- Distribute manhours proportionally
  FOR v_component IN
    SELECT c.id, c.component_type, c.identity_key
    FROM components c
    WHERE c.project_id = v_project_id AND NOT c.is_retired
  LOOP
    DECLARE
      v_weight NUMERIC;
      v_budgeted NUMERIC;
      v_size TEXT;
      v_basis TEXT;
    BEGIN
      v_weight := calculate_component_weight(v_component.component_type, v_component.identity_key);
      v_budgeted := ROUND(v_total_budgeted * v_weight / v_total_weight, 2);
      v_size := v_component.identity_key->>'size';

      -- Determine calculation basis
      IF v_size IS NULL OR v_size = 'NOSIZE' OR v_size = '' THEN
        v_basis := 'fixed';
        -- Add warning for components without size
        v_warnings := v_warnings || jsonb_build_object(
          'type', 'no_size',
          'component_id', v_component.id,
          'component_type', v_component.component_type
        );
      ELSIF v_component.component_type = 'threaded_pipe' THEN
        v_basis := 'linear_feet';
      ELSE
        v_basis := 'dimension';
      END IF;

      INSERT INTO component_manhours (
        component_id,
        budget_id,
        budgeted_manhours,
        calculation_basis,
        calculation_metadata
      ) VALUES (
        v_component.id,
        p_budget_id,
        v_budgeted,
        v_basis,
        jsonb_build_object(
          'size', v_size,
          'weight', v_weight,
          'total_weight_sum', v_total_weight
        )
      );

      v_component_count := v_component_count + 1;
    END;
  END LOOP;

  -- Return summary
  RETURN QUERY SELECT
    v_component_count,
    v_total_budgeted,
    v_warnings;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION distribute_manhours_to_components IS
  'Distributes total project manhours to components based on dimension weights';
```

### 3. `calculate_component_earned_manhours()` - Earned Value Calculation

Calculates earned manhours based on milestone completion.

```sql
CREATE OR REPLACE FUNCTION calculate_component_earned_manhours(
  p_component_id UUID,
  p_budget_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_budgeted_manhours NUMERIC;
  v_template_id UUID;
  v_current_milestones JSONB;
  v_milestones_config JSONB;
  v_milestone RECORD;
  v_earned_percentage NUMERIC := 0;
BEGIN
  -- Fetch component data
  SELECT
    cm.budgeted_manhours,
    c.progress_template_id,
    c.current_milestones
  INTO v_budgeted_manhours, v_template_id, v_current_milestones
  FROM component_manhours cm
  JOIN components c ON c.id = cm.component_id
  WHERE cm.component_id = p_component_id
    AND cm.budget_id = p_budget_id;

  -- If no budgeted manhours, return 0
  IF v_budgeted_manhours IS NULL OR v_budgeted_manhours = 0 THEN
    RETURN 0;
  END IF;

  -- Fetch milestone weights from template
  SELECT milestones_config
  INTO v_milestones_config
  FROM progress_templates
  WHERE id = v_template_id;

  -- Calculate earned percentage based on milestone completion
  FOR v_milestone IN
    SELECT * FROM jsonb_array_elements(v_milestones_config)
  LOOP
    DECLARE
      v_name TEXT := v_milestone.value->>'name';
      v_weight NUMERIC := (v_milestone.value->>'weight')::NUMERIC;
      v_is_partial BOOLEAN := COALESCE((v_milestone.value->>'is_partial')::BOOLEAN, false);
      v_current_value JSONB := v_current_milestones->v_name;
    BEGIN
      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          -- Partial milestone (0-100): weight × completion%
          v_earned_percentage := v_earned_percentage +
            (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF v_current_value::TEXT IN ('true', '1') THEN
          -- Discrete milestone complete: add full weight
          v_earned_percentage := v_earned_percentage + v_weight;
        END IF;
      END IF;
    END;
  END LOOP;

  -- Return earned manhours (budgeted × completion%)
  RETURN ROUND(v_budgeted_manhours * v_earned_percentage / 100.0, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_component_earned_manhours IS
  'Calculates earned manhours using milestone weights from progress templates';
```

**Earned Manhours Examples**:

```
Field Weld with 10 budgeted MH:
  Fit-Up complete (10%)    → 10 × 0.10 = 1.0 MH
  Weld Made complete (60%) → 10 × 0.60 = 6.0 MH
  Punch not started (10%)  → 0 MH
  Total Earned: 7.0 MH (70% complete)

Threaded Pipe with 20 budgeted MH:
  Fabricate at 75% (16%)   → 20 × 0.16 × 0.75 = 2.4 MH
  Install at 50% (16%)     → 20 × 0.16 × 0.50 = 1.6 MH
  Erect not started (16%)  → 0 MH
  Total Earned: 4.0 MH (20% complete)
```

### 4. `update_component_manhours_on_milestone_change()` - Auto-Update Trigger

Automatically recalculates earned manhours when milestones change.

```sql
CREATE OR REPLACE FUNCTION update_component_manhours_on_milestone_change()
RETURNS TRIGGER AS $$
DECLARE
  v_active_budget_id UUID;
BEGIN
  -- Find active budget for this component's project
  SELECT pmb.id INTO v_active_budget_id
  FROM project_manhour_budgets pmb
  JOIN components c ON c.project_id = pmb.project_id
  WHERE c.id = NEW.id AND pmb.is_active = true;

  -- If active budget exists, update earned manhours
  IF v_active_budget_id IS NOT NULL THEN
    UPDATE component_manhours
    SET
      earned_manhours = calculate_component_earned_manhours(NEW.id, v_active_budget_id),
      last_calculated_at = now()
    WHERE component_id = NEW.id AND budget_id = v_active_budget_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manhours_on_milestone_change
AFTER UPDATE OF current_milestones ON components
FOR EACH ROW
EXECUTE FUNCTION update_component_manhours_on_milestone_change();

COMMENT ON TRIGGER update_manhours_on_milestone_change ON components IS
  'Auto-updates earned_manhours whenever component milestones change';
```

**Trigger Behavior**:
- Fires on every `UPDATE` to `components.current_milestones`
- Only processes components with an active budget
- Updates `earned_manhours` and `last_calculated_at` atomically
- No impact on components without budgets (graceful no-op)

### 5. `enforce_one_active_budget_per_project()` - Budget Version Control

Ensures only one budget version is active per project.

```sql
CREATE OR REPLACE FUNCTION enforce_one_active_budget_per_project()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other budgets for this project
    UPDATE project_manhour_budgets
    SET is_active = false
    WHERE project_id = NEW.project_id
      AND id != NEW.id
      AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_one_active_budget
BEFORE INSERT OR UPDATE OF is_active ON project_manhour_budgets
FOR EACH ROW
EXECUTE FUNCTION enforce_one_active_budget_per_project();

COMMENT ON TRIGGER enforce_one_active_budget ON project_manhour_budgets IS
  'Ensures only one budget version is active per project at any time';
```

---

## Data Aggregation & Reporting Views

All views aggregate manhour data for reporting, filtering to only active budgets.

### 1. `vw_manhours_by_area`

Aggregates manhours grouped by area.

```sql
CREATE OR REPLACE VIEW vw_manhours_by_area AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  pmb.id AS budget_id,
  pmb.version AS budget_version,
  COUNT(c.id) AS component_count,
  SUM(cm.budgeted_manhours) AS budgeted_manhours,
  SUM(cm.earned_manhours) AS earned_manhours,
  ROUND(
    CASE
      WHEN SUM(cm.budgeted_manhours) > 0 THEN
        (SUM(cm.earned_manhours) / SUM(cm.budgeted_manhours)) * 100
      ELSE 0
    END, 2
  ) AS percent_complete_manhours,
  SUM(cm.budgeted_manhours) - SUM(cm.earned_manhours) AS remaining_manhours
FROM areas a
JOIN components c ON c.area_id = a.id AND NOT c.is_retired
JOIN component_manhours cm ON cm.component_id = c.id
JOIN project_manhour_budgets pmb ON pmb.id = cm.budget_id AND pmb.is_active = true
GROUP BY a.id, a.name, a.project_id, pmb.id, pmb.version;

COMMENT ON VIEW vw_manhours_by_area IS
  'Aggregates manhours by area for reporting (active budgets only)';
```

### 2. `vw_manhours_by_system`

Aggregates manhours grouped by system.

```sql
CREATE OR REPLACE VIEW vw_manhours_by_system AS
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  pmb.id AS budget_id,
  pmb.version AS budget_version,
  COUNT(c.id) AS component_count,
  SUM(cm.budgeted_manhours) AS budgeted_manhours,
  SUM(cm.earned_manhours) AS earned_manhours,
  ROUND(
    CASE
      WHEN SUM(cm.budgeted_manhours) > 0 THEN
        (SUM(cm.earned_manhours) / SUM(cm.budgeted_manhours)) * 100
      ELSE 0
    END, 2
  ) AS percent_complete_manhours,
  SUM(cm.budgeted_manhours) - SUM(cm.earned_manhours) AS remaining_manhours
FROM systems s
JOIN components c ON c.system_id = s.id AND NOT c.is_retired
JOIN component_manhours cm ON cm.component_id = c.id
JOIN project_manhour_budgets pmb ON pmb.id = cm.budget_id AND pmb.is_active = true
GROUP BY s.id, s.name, s.project_id, pmb.id, pmb.version;

COMMENT ON VIEW vw_manhours_by_system IS
  'Aggregates manhours by system for reporting (active budgets only)';
```

### 3. `vw_manhours_by_test_package`

Aggregates manhours grouped by test package.

```sql
CREATE OR REPLACE VIEW vw_manhours_by_test_package AS
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  pmb.id AS budget_id,
  pmb.version AS budget_version,
  COUNT(c.id) AS component_count,
  SUM(cm.budgeted_manhours) AS budgeted_manhours,
  SUM(cm.earned_manhours) AS earned_manhours,
  ROUND(
    CASE
      WHEN SUM(cm.budgeted_manhours) > 0 THEN
        (SUM(cm.earned_manhours) / SUM(cm.budgeted_manhours)) * 100
      ELSE 0
    END, 2
  ) AS percent_complete_manhours,
  SUM(cm.budgeted_manhours) - SUM(cm.earned_manhours) AS remaining_manhours
FROM test_packages tp
JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
JOIN component_manhours cm ON cm.component_id = c.id
JOIN project_manhour_budgets pmb ON pmb.id = cm.budget_id AND pmb.is_active = true
GROUP BY tp.id, tp.name, tp.project_id, pmb.id, pmb.version;

COMMENT ON VIEW vw_manhours_by_test_package IS
  'Aggregates manhours by test package for reporting (active budgets only)';
```

### 4. `vw_project_manhour_summary`

Project-level manhour summary for dashboard.

```sql
CREATE OR REPLACE VIEW vw_project_manhour_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  pmb.id AS budget_id,
  pmb.version AS budget_version,
  pmb.total_budgeted_manhours,
  pmb.revision_reason,
  pmb.effective_date,
  COUNT(DISTINCT c.id) AS total_components,
  SUM(cm.budgeted_manhours) AS allocated_manhours,
  SUM(cm.earned_manhours) AS earned_manhours,
  pmb.total_budgeted_manhours - COALESCE(SUM(cm.budgeted_manhours), 0) AS unallocated_manhours,
  ROUND(
    CASE
      WHEN pmb.total_budgeted_manhours > 0 THEN
        (COALESCE(SUM(cm.earned_manhours), 0) / pmb.total_budgeted_manhours) * 100
      ELSE 0
    END, 2
  ) AS percent_complete,
  ROUND(
    CASE
      WHEN pmb.total_budgeted_manhours > 0 THEN
        (COALESCE(SUM(cm.budgeted_manhours), 0) / pmb.total_budgeted_manhours) * 100
      ELSE 0
    END, 2
  ) AS percent_allocated
FROM projects p
JOIN project_manhour_budgets pmb ON pmb.project_id = p.id AND pmb.is_active = true
LEFT JOIN component_manhours cm ON cm.budget_id = pmb.id
LEFT JOIN components c ON c.id = cm.component_id AND NOT c.is_retired
GROUP BY p.id, p.name, pmb.id, pmb.version, pmb.total_budgeted_manhours,
         pmb.revision_reason, pmb.effective_date;

COMMENT ON VIEW vw_project_manhour_summary IS
  'Project-level manhour summary for dashboard widget (active budgets only)';
```

**View Features**:
- All views filter to `is_active = true` (only current budget version)
- Provide both absolute values (manhours) and percentages
- Calculate remaining work (`budgeted - earned`)
- Handle NULL cases (components without area/system/package)
- Use COALESCE for components without manhours (graceful degradation)

---

## Permissions & Security

### New Permission Type

Add `view_financial_data` permission to restrict manhour visibility.

```typescript
// src/lib/permissions.ts
export type Permission =
  | 'manage_drawings'
  | 'assign_metadata'
  | 'update_milestones'
  | 'assign_welders'
  | 'manage_team'
  | 'view_reports'
  | 'manage_projects'
  | 'view_financial_data';  // NEW

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'manage_drawings',
    'assign_metadata',
    'update_milestones',
    'assign_welders',
    'manage_team',
    'view_reports',
    'manage_projects',
    'view_financial_data'  // NEW
  ],
  admin: [
    'manage_drawings',
    'assign_metadata',
    'update_milestones',
    'assign_welders',
    'manage_team',
    'view_reports',
    'view_financial_data'  // NEW
  ],
  project_manager: [
    'manage_drawings',
    'assign_metadata',
    'update_milestones',
    'view_reports',
    'view_financial_data'  // NEW
  ],
  foreman: ['assign_metadata', 'update_milestones', 'assign_welders'],
  qc_inspector: ['update_milestones', 'view_reports'],
  welder: ['update_milestones'],
  viewer: ['view_reports'],
};
```

**Access Matrix**:

| Role | View Manhours | Create Budget | Edit Budget |
|------|---------------|---------------|-------------|
| Owner | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ |
| Project Manager | ✓ | ✗ | ✗ |
| Foreman | ✗ | ✗ | ✗ |
| QC Inspector | ✗ | ✗ | ✗ |
| Welder | ✗ | ✗ | ✗ |
| Viewer | ✗ | ✗ | ✗ |

### RLS Policies

#### `project_manhour_budgets` Policies

```sql
-- Enable RLS
ALTER TABLE project_manhour_budgets ENABLE ROW LEVEL SECURITY;

-- SELECT: Users with view_financial_data can view budgets in their org
CREATE POLICY "Users can view manhour budgets in their organization"
ON project_manhour_budgets FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager')
  )
);

-- INSERT: Only owners/admins can create budgets
CREATE POLICY "Only owners and admins can create manhour budgets"
ON project_manhour_budgets FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- UPDATE: Only owners/admins can update budgets
CREATE POLICY "Only owners and admins can update manhour budgets"
ON project_manhour_budgets FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- DELETE: Only owners can delete budgets
CREATE POLICY "Only owners can delete manhour budgets"
ON project_manhour_budgets FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'owner'
  )
);
```

#### `component_manhours` Policies

```sql
-- Enable RLS
ALTER TABLE component_manhours ENABLE ROW LEVEL SECURITY;

-- SELECT: Users with view_financial_data can view component manhours
CREATE POLICY "Users can view component manhours in their organization"
ON component_manhours FOR SELECT
USING (
  component_id IN (
    SELECT c.id FROM components c
    JOIN projects p ON p.id = c.project_id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager')
  )
);

-- INSERT/UPDATE/DELETE: Only automated triggers and privileged roles
-- Note: Most updates happen via triggers, but allow manual override by owners/admins
CREATE POLICY "Only owners and admins can modify component manhours"
ON component_manhours FOR ALL
USING (
  component_id IN (
    SELECT c.id FROM components c
    JOIN projects p ON p.id = c.project_id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

#### View Policies

```sql
-- Views inherit RLS from underlying tables, but add explicit grants
GRANT SELECT ON vw_manhours_by_area TO authenticated;
GRANT SELECT ON vw_manhours_by_system TO authenticated;
GRANT SELECT ON vw_manhours_by_test_package TO authenticated;
GRANT SELECT ON vw_project_manhour_summary TO authenticated;

-- Application-level permission check handles view_financial_data enforcement
```

### Frontend Permission Checks

```typescript
// src/hooks/useCanViewFinancialData.ts
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';

export function useCanViewFinancialData(): boolean {
  const { user } = useAuth();
  return user?.role ? hasPermission(user.role, 'view_financial_data') : false;
}

// Usage in components:
export function ComponentDetailView() {
  const canViewManhours = useCanViewFinancialData();

  return (
    <div>
      {/* Existing fields */}

      {canViewManhours && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Manhour Information</h3>
          <div className="grid grid-cols-2 gap-2">
            <MetricDisplay label="Budgeted" value={budgetedManhours} />
            <MetricDisplay label="Earned" value={earnedManhours} />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Security Features**:
- **Dual enforcement**: Permissions checked in both frontend (UI) and backend (RLS)
- **Organization isolation**: Users only see their org's data
- **Role-based access**: Financial data restricted to owner/admin/project_manager
- **Graceful degradation**: Unauthorized users see standard UI without manhour data
- **Audit trail**: All budget changes tracked with `created_by`, `created_at`

---

## UI Integration

### 1. Dashboard Widget - `ManhourSummaryWidget`

Display project-level manhour metrics on dashboard.

```typescript
// src/components/dashboard/ManhourSummaryWidget.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCanViewFinancialData } from '@/hooks/useCanViewFinancialData';

export function ManhourSummaryWidget({ projectId }: { projectId: string }) {
  const canViewFinancial = useCanViewFinancialData();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['manhour-summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_project_manhour_summary')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: canViewFinancial,
  });

  if (!canViewFinancial) return null;
  if (isLoading) return <WidgetSkeleton />;
  if (!summary) return <NoBudgetConfigured projectId={projectId} />;

  const percentComplete = Math.round(
    (summary.earned_manhours / summary.total_budgeted_manhours) * 100
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manhour Progress</CardTitle>
        <CardDescription>Budget v{summary.budget_version}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Total Budget"
            value={summary.total_budgeted_manhours}
            unit="MH"
          />
          <MetricCard
            label="Earned"
            value={summary.earned_manhours}
            unit="MH"
            percentage={percentComplete}
          />
          <MetricCard
            label="Allocated"
            value={summary.allocated_manhours}
            unit="MH"
            percentage={summary.percent_allocated}
          />
          <MetricCard
            label="Remaining"
            value={summary.total_budgeted_manhours - summary.earned_manhours}
            unit="MH"
          />
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{percentComplete}%</span>
          </div>
          <Progress value={percentComplete} className="h-2" />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Updated {formatDistanceToNow(new Date())} ago
        </p>
      </CardContent>
    </Card>
  );
}

function NoBudgetConfigured({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-gray-600 mb-4">No manhour budget configured</p>
        <Button
          onClick={() => navigate(`/projects/${projectId}/settings?tab=manhours`)}
        >
          Configure Budget
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 2. Project Settings - Manhour Budget Tab

New tab in Project Settings for budget management.

```typescript
// src/pages/ProjectSettingsPage.tsx (enhanced)
export function ProjectSettingsPage() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState('general');
  const canViewFinancial = useCanViewFinancialData();
  const canEditBudget = useCanEditBudget(); // owner/admin only

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'team', label: 'Team' },
    ...(canViewFinancial ? [{ id: 'manhours', label: 'Manhour Budget' }] : []),
  ];

  return (
    <div>
      <PageHeader>
        <h1>Project Settings</h1>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          {/* Existing general settings */}
        </TabsContent>

        <TabsContent value="team">
          {/* Existing team management */}
        </TabsContent>

        {canViewFinancial && (
          <TabsContent value="manhours">
            <ManhourBudgetSettings
              projectId={projectId}
              canEdit={canEditBudget}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
```

### 3. Manhour Budget Settings Component

```typescript
// src/components/settings/ManhourBudgetSettings.tsx
export function ManhourBudgetSettings({
  projectId,
  canEdit
}: {
  projectId: string;
  canEdit: boolean
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_manhour_budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Manhour Budget History</h2>
          <p className="text-sm text-gray-600">
            Manage project manhour budgets and track revisions
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreateDialog(true)}>
            + Create New Budget Version
          </Button>
        )}
      </div>

      {budgets && budgets.length > 0 ? (
        <div className="space-y-4">
          {budgets.map(budget => (
            <BudgetVersionCard
              key={budget.id}
              budget={budget}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No manhour budget configured"
          description="Create your first budget to start tracking earned manhours"
          action={canEdit && (
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Budget
            </Button>
          )}
        />
      )}

      {showCreateDialog && (
        <CreateBudgetDialog
          projectId={projectId}
          onClose={() => setShowCreateDialog(false)}
          currentBudget={budgets?.[0]} // Pass active budget for pre-fill
        />
      )}
    </div>
  );
}
```

### 4. Create Budget Dialog

```typescript
// src/components/settings/CreateBudgetDialog.tsx
export function CreateBudgetDialog({
  projectId,
  onClose,
  currentBudget
}: {
  projectId: string;
  onClose: () => void;
  currentBudget?: ProjectManhourBudget;
}) {
  const [totalManhours, setTotalManhours] = useState(
    currentBudget?.total_budgeted_manhours?.toString() || ''
  );
  const [revisionReason, setRevisionReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isDistributing, setIsDistributing] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createBudgetMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Create budget record
      const { data: budget, error: budgetError } = await supabase
        .from('project_manhour_budgets')
        .insert({
          project_id: projectId,
          version: (currentBudget?.version || 0) + 1,
          total_budgeted_manhours: parseFloat(totalManhours),
          revision_reason: revisionReason,
          is_active: true,
          effective_date: effectiveDate,
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Step 2: Distribute to components
      const { data: result, error: distributeError } = await supabase
        .rpc('distribute_manhours_to_components', {
          p_budget_id: budget.id
        });

      if (distributeError) throw distributeError;

      return { budget, distribution: result };
    },
    onSuccess: ({ budget, distribution }) => {
      queryClient.invalidateQueries(['project-budgets', projectId]);
      queryClient.invalidateQueries(['manhour-summary', projectId]);

      // Show distribution results modal
      showDistributionResults(distribution);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate(`/projects/${projectId}/dashboard`);
      }, 3000);

      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create budget: ${error.message}`);
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Manhour Budget</DialogTitle>
          <DialogDescription>
            {currentBudget
              ? `Creating version ${currentBudget.version + 1}`
              : 'Creating initial budget for this project'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          setIsDistributing(true);
          createBudgetMutation.mutate();
        }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="total-manhours">Total Budgeted Manhours</Label>
              <Input
                id="total-manhours"
                type="number"
                step="0.01"
                min="0"
                value={totalManhours}
                onChange={(e) => setTotalManhours(e.target.value)}
                placeholder="1250.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be distributed across {componentCount} components
              </p>
            </div>

            <div>
              <Label htmlFor="revision-reason">Revision Reason</Label>
              <Select
                value={revisionReason}
                onValueChange={setRevisionReason}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Original estimate">Original estimate</SelectItem>
                  <SelectItem value="Change order">Change order</SelectItem>
                  <SelectItem value="Scope revision">Scope revision</SelectItem>
                  <SelectItem value="Re-estimate">Re-estimate</SelectItem>
                  <SelectItem value="Custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {revisionReason === 'Custom' && (
                <Input
                  className="mt-2"
                  placeholder="Enter custom reason..."
                  onChange={(e) => setRevisionReason(e.target.value)}
                />
              )}
            </div>

            <div>
              <Label htmlFor="effective-date">Effective Date</Label>
              <Input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Manhours will be automatically distributed to components based on
                their size and type.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!totalManhours || !revisionReason || isDistributing}
            >
              {isDistributing ? 'Distributing...' : 'Create & Distribute'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Distribution Results Modal

```typescript
// src/components/settings/DistributionResultsModal.tsx
export function DistributionResultsModal({
  result,
  onClose
}: {
  result: {
    components_processed: number;
    total_allocated: number;
    warnings: Array<{ type: string; component_id: string; component_type: string }>;
  };
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Manhours Distributed Successfully
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-lg font-medium">
              Distributed {result.total_allocated} MH across {result.components_processed} components
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-3">Allocation Breakdown by Component Type</h4>
            <AllocationBreakdownChart data={result.breakdown} />
          </div>

          {result.warnings.length > 0 && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validation Warnings ({result.warnings.length})</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {result.warnings.map((warning, i) => (
                    <li key={i} className="text-sm">
                      {warning.type === 'no_size' && (
                        <>Component has no size - assigned fixed weight (1.0 MH)</>
                      )}
                      {warning.type === 'no_commodity_code' && (
                        <>Component missing commodity code - using default</>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            View Details
          </Button>
          <Button onClick={() => {
            navigate('/dashboard');
            onClose();
          }}>
            Go to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. Enhanced Component Detail View

```typescript
// src/components/ComponentDetailView.tsx (enhanced Overview tab)
export function ComponentDetailView({ componentId }: { componentId: string }) {
  const canViewManhours = useCanViewFinancialData();

  const { data: component } = useComponent(componentId);
  const { data: manhours } = useQuery({
    queryKey: ['component-manhours', componentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('component_manhours')
        .select('*, budget:project_manhour_budgets(*)')
        .eq('component_id', componentId)
        .eq('budget.is_active', true)
        .single();
      return data;
    },
    enabled: canViewManhours,
  });

  return (
    <Tabs>
      <TabsContent value="overview">
        {/* Existing component fields */}

        {canViewManhours && manhours && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Manhour Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Budgeted Manhours</label>
                <p className="text-sm font-medium">
                  {manhours.budgeted_manhours.toFixed(2)} MH
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Earned Manhours</label>
                <p className="text-sm font-medium">
                  {manhours.earned_manhours.toFixed(2)} MH
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Calculation Basis</label>
                <p className="text-sm capitalize">{manhours.calculation_basis}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">% Complete (MH)</label>
                <p className="text-sm">
                  {Math.round((manhours.earned_manhours / manhours.budgeted_manhours) * 100)}%
                </p>
              </div>
            </div>

            {manhours.calculation_metadata && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Calculation Details
                </summary>
                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(manhours.calculation_metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
```

### 7. Enhanced Progress Reports

```typescript
// src/pages/ReportsPage.tsx (enhanced with manhour columns)
export function ReportsPage() {
  const canViewFinancial = useCanViewFinancialData();
  const [groupBy, setGroupBy] = useState<'area' | 'system' | 'test_package'>('area');

  // Existing query for milestone progress
  const { data: progressData } = useProgressByDimension(groupBy);

  // New query for manhour data
  const { data: manhourData } = useQuery({
    queryKey: ['manhours-by', groupBy],
    queryFn: async () => {
      const viewName = `vw_manhours_by_${groupBy}`;
      const { data } = await supabase.from(viewName).select('*');
      return data;
    },
    enabled: canViewFinancial,
  });

  // Merge datasets
  const mergedData = progressData?.map(progress => {
    const manhours = manhourData?.find(
      mh => mh[`${groupBy}_id`] === progress[`${groupBy}_id`]
    );
    return { ...progress, ...manhours };
  });

  const columns = [
    { header: getDimensionLabel(groupBy), key: 'name', width: 200 },
    { header: 'Components', key: 'component_count', width: 100 },
    { header: '% Received', key: 'pct_received', width: 100 },
    { header: '% Installed', key: 'pct_installed', width: 100 },
    { header: '% Punch', key: 'pct_punch', width: 100 },
    { header: '% Tested', key: 'pct_tested', width: 100 },
    { header: '% Restored', key: 'pct_restored', width: 100 },
    { header: '% Total', key: 'pct_total', width: 100 },
    // Conditional manhour columns
    ...(canViewFinancial ? [
      { header: 'Budgeted MH', key: 'budgeted_manhours', width: 120, format: formatManhours },
      { header: 'Earned MH', key: 'earned_manhours', width: 120, format: formatManhours },
      { header: 'Remaining MH', key: 'remaining_manhours', width: 120, format: formatManhours },
      { header: 'MH % Complete', key: 'percent_complete_manhours', width: 120 },
    ] : []),
  ];

  return (
    <div>
      <PageHeader>
        <h1>Progress Reports</h1>
        <div className="flex gap-2">
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="area">Group by Area</SelectItem>
              <SelectItem value="system">Group by System</SelectItem>
              <SelectItem value="test_package">Group by Test Package</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Export <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportReport('pdf', canViewFinancial)}>
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport('xlsx', canViewFinancial)}>
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport('csv', canViewFinancial)}>
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      <VirtualizedTable
        columns={columns}
        data={mergedData}
        height={600}
      />
    </div>
  );
}
```

---

## User Workflow

### Workflow 1: Creating Initial Manhour Budget

**Entry Point**: Project Settings → Manhour Budget tab

**Steps**:

1. **Navigate to Project Settings**
   - Click gear icon or project menu
   - Select "Manhour Budget" tab (only visible to owner/admin/project_manager)

2. **Create Budget**
   - Click "+ Create New Budget Version" button
   - Fill in form:
     - **Total Budgeted Manhours**: e.g., 1,250 MH
     - **Revision Reason**: "Original estimate" (dropdown)
     - **Effective Date**: defaults to today
   - Click "Create & Distribute"

3. **Automatic Distribution** (backend)
   - System calls `distribute_manhours_to_components(budget_id)`
   - Progress indicator: "Distributing manhours to 342 components..."
   - Calculation completes (typically <2 seconds for 1000 components)

4. **View Distribution Results**
   - Modal displays:
     - Success message: "Distributed 1,250 MH across 342 components"
     - Allocation breakdown by component type (bar chart)
     - Validation warnings (if any):
       - "15 instruments have no size - assigned 1.0 MH each"
       - "3 components missing commodity code - using defaults"
   - Options:
     - "View Details" (shows component-level breakdown)
     - "Go to Dashboard" (auto-redirect after 3 seconds)

5. **Dashboard Display**
   - `ManhourSummaryWidget` now visible
   - Shows: Total Budget, Earned MH, % Complete, Remaining MH
   - Real-time updates as milestones complete

### Workflow 2: Revising Budget (Change Order)

**Entry Point**: Project Settings → Manhour Budget tab

**Steps**:

1. **View Budget History**
   - See list of all budget versions:
     - v3 (Active): 1,350 MH - "Change order #CO-042" - 2025-11-08
     - v2 (Archived): 1,250 MH - "Scope revision" - 2025-10-15
     - v1 (Archived): 1,000 MH - "Original estimate" - 2025-10-01

2. **Create New Version**
   - Click "+ Create New Budget Version"
   - Form pre-fills with current budget amount (1,350 MH)
   - Adjust total manhours (e.g., 1,500 MH for change order)
   - Enter reason: "Change order #CO-042"
   - Click "Create & Redistribute"

3. **System Processing**
   - Sets previous budget `is_active = false`
   - Creates new budget with `version = 4`
   - Deletes old `component_manhours` records for v3
   - Redistributes with new total (1,500 MH)
   - Recalculates earned manhours based on current milestone progress

4. **Key Behavior**: Earned manhours adjust proportionally
   - Component was 50% complete with old budget: 10 MH × 50% = 5 MH earned
   - With new budget: 12 MH × 50% = 6 MH earned
   - Percentage stays same, absolute manhours increase

### Workflow 3: Viewing Manhour Data

**Dashboard Widget** (always visible to authorized roles):
```
┌────────────────────────────────┐
│ Manhour Progress               │
├────────────────────────────────┤
│ Total Budget:    1,250 MH      │
│ Earned:            625 MH (50%)│
│ Remaining:         625 MH      │
│                                │
│ ████████████░░░░░░░░░░ 50%    │
│                                │
│ Budget v3 • Updated 2 min ago  │
└────────────────────────────────┘
```

**Component Detail Modal** (Overview tab):
```
Component: 4" Ball Valve (VBALU-001)

Manhour Information:
  Budgeted:    8.5 MH
  Earned:      5.1 MH (60%)
  Basis:       Dimension-based
  Calculation: {"size": "4", "diameter_weight": 8.0}
```

**Progress Reports Page** (with manhour columns):
```
Group by: [Area ▼]                                    [Export ▼]

┌──────────────────────────────────────────────────────────────────┐
│ Area  │ Comps │ % Complete │ Budgeted │ Earned │ Remaining │ MH%│
├──────────────────────────────────────────────────────────────────┤
│ A     │  120  │    65%     │  450 MH  │ 293 MH │   157 MH  │ 65%│
│ B     │  150  │    45%     │  550 MH  │ 248 MH │   302 MH  │ 45%│
│ C     │   72  │    80%     │  250 MH  │ 200 MH │    50 MH  │ 80%│
└──────────────────────────────────────────────────────────────────┘
```

### Workflow 4: Field Worker Completes Milestone (Automatic Update)

**Scenario**: Welder completes "Weld Made" milestone on field weld

**Steps**:

1. **Field Worker Action**
   - Opens component on mobile device
   - Checks "Weld Made" milestone
   - System updates `components.current_milestones` JSONB

2. **Database Trigger Fires** (automatic)
   - `update_manhours_on_milestone_change` trigger executes
   - Finds active budget for component's project
   - Calls `calculate_component_earned_manhours(component_id, budget_id)`
   - Updates `component_manhours.earned_manhours` and `last_calculated_at`

3. **UI Updates** (real-time via TanStack Query)
   - Dashboard widget refreshes: Earned MH increases
   - Component detail modal: Earned MH updates
   - Progress reports: Aggregate earned MH increases

**No user intervention required** - manhours update automatically!

### Workflow 5: Projects Without Budgets (Graceful Degradation)

**Scenario**: Existing project has no manhour budget configured

**Behavior**:

1. **Dashboard**:
   - Widget shows: "No manhour budget configured"
   - Button: "Configure Budget" (navigates to settings)

2. **Component Detail**:
   - Manhour section shows: "N/A - No budget set"
   - Or section hidden entirely

3. **Progress Reports**:
   - Manhour columns hidden
   - Or show "-" values

4. **No Errors**:
   - Feature simply not active
   - Existing functionality unaffected

5. **Optional Onboarding**:
   - First-time tooltip: "💡 Tip: Set up manhour budget in Project Settings"
   - Dismissible banner for projects >100 components

---

## Implementation Phases

### Phase 1: Database Foundation (Week 1)

**Deliverables**:
- Migration 00085: Create `project_manhour_budgets` table
- Migration 00086: Create `component_manhours` table
- Migration 00087: Create `calculate_component_weight()` function
- Migration 00088: Create `calculate_component_earned_manhours()` function
- Migration 00089: Create `distribute_manhours_to_components()` function
- Migration 00090: Create `enforce_one_active_budget_per_project()` trigger
- Migration 00091: Create `update_component_manhours_on_milestone_change()` trigger
- RLS policies for both tables
- TypeScript types regenerated (`supabase gen types typescript --linked`)

**Testing**:
- Contract tests: Table schemas, constraints, indexes
- Function tests: Weight calculation, earned manhours, distribution
- Trigger tests: Auto-update on milestone change, budget versioning
- RLS tests: Permission enforcement, organization isolation

**Acceptance Criteria**:
- All migrations apply successfully to remote database
- RLS policies prevent data leakage across organizations
- Triggers auto-update earned manhours when milestones change
- Weight calculation handles all 11 component types
- Test coverage ≥80% for database functions

**Files Created**:
- `supabase/migrations/00085_create_project_manhour_budgets.sql`
- `supabase/migrations/00086_create_component_manhours.sql`
- `supabase/migrations/00087_calculate_component_weight.sql`
- `supabase/migrations/00088_calculate_component_earned_manhours.sql`
- `supabase/migrations/00089_distribute_manhours_to_components.sql`
- `supabase/migrations/00090_manhour_triggers.sql`
- `tests/contract/manhour-tables.test.ts`
- `tests/integration/manhour-calculation.test.ts`

---

### Phase 2: Aggregation & Reporting Views (Week 2)

**Deliverables**:
- Migration 00091: Create `vw_manhours_by_area` view
- Migration 00092: Create `vw_manhours_by_system` view
- Migration 00093: Create `vw_manhours_by_test_package` view
- Migration 00094: Create `vw_project_manhour_summary` view
- TanStack Query hooks: `useManhoursByArea`, `useManhoursBySystem`, `useManhoursByTestPackage`, `useProjectManhourSummary`
- Integration tests for views with RLS

**Testing**:
- View tests: Correct aggregation, NULL handling, active budget filtering
- Hook tests: Loading states, error handling, query invalidation
- RLS tests: Views respect organization boundaries

**Acceptance Criteria**:
- Views aggregate manhours correctly by dimension
- Views return accurate percentages and remaining manhours
- Views filter to only active budgets
- Hooks handle loading, error, and empty states
- Test coverage ≥70%

**Files Created**:
- `supabase/migrations/00091_vw_manhours_by_area.sql`
- `supabase/migrations/00092_vw_manhours_by_system.sql`
- `supabase/migrations/00093_vw_manhours_by_test_package.sql`
- `supabase/migrations/00094_vw_project_manhour_summary.sql`
- `src/hooks/useManhoursByArea.ts`
- `src/hooks/useManhoursBySystem.ts`
- `src/hooks/useManhoursByTestPackage.ts`
- `src/hooks/useProjectManhourSummary.ts`
- `tests/integration/manhour-views.test.ts`

---

### Phase 3: Permissions & Security (Week 2-3)

**Deliverables**:
- Add `view_financial_data` permission to `src/lib/permissions.ts`
- Create `useCanViewFinancialData()` hook
- Create `useCanEditBudget()` hook (owner/admin only)
- Update role permission mappings
- E2E tests for permission enforcement
- Security audit of RLS policies

**Testing**:
- Permission tests: All 7 roles tested for view/edit access
- RLS tests: Verify unauthorized access blocked at database level
- E2E tests: Full workflow with different user roles
- Security audit: Edge cases, privilege escalation attempts

**Acceptance Criteria**:
- Only owner/admin/project_manager can view manhour data
- Only owner/admin can create/edit budgets
- RLS policies enforce permissions at database level
- Frontend gracefully hides unauthorized UI elements
- Security documentation updated

**Files Created/Modified**:
- `src/lib/permissions.ts` (modified)
- `src/hooks/useCanViewFinancialData.ts`
- `src/hooks/useCanEditBudget.ts`
- `tests/e2e/manhour-permissions.spec.ts`
- `docs/security/RLS-RULES.md` (updated)

---

### Phase 4: Budget Management UI (Week 3-4)

**Deliverables**:
- Enhanced `ProjectSettingsPage` with "Manhour Budget" tab
- `ManhourBudgetSettings` component (budget list view)
- `BudgetVersionCard` component (individual budget display)
- `CreateBudgetDialog` component (budget creation form)
- `DistributionResultsModal` component (post-distribution feedback)
- Mobile-responsive design (≤1024px breakpoint)
- WCAG 2.1 AA accessibility compliance

**Testing**:
- Component tests: Rendering, user interactions, validation
- Integration tests: Budget creation, distribution, version management
- E2E tests: Full budget creation workflow
- Accessibility tests: Keyboard navigation, screen reader

**Acceptance Criteria**:
- Owners/admins can create project manhour budgets
- UI shows all budget versions with active status
- Distribution shows progress and success/error feedback
- Mobile layout works on iOS Safari and Android Chrome
- Keyboard navigation functional (Tab, Enter, Escape)
- Screen reader announces budget changes

**Files Created**:
- `src/pages/ProjectSettingsPage.tsx` (enhanced)
- `src/components/settings/ManhourBudgetSettings.tsx`
- `src/components/settings/BudgetVersionCard.tsx`
- `src/components/settings/CreateBudgetDialog.tsx`
- `src/components/settings/DistributionResultsModal.tsx`
- `tests/components/ManhourBudgetSettings.test.tsx`
- `tests/e2e/budget-management.spec.ts`

---

### Phase 5: Dashboard & Component Detail Integration (Week 4)

**Deliverables**:
- `ManhourSummaryWidget` component for dashboard
- Enhanced `ComponentDetailView` with manhour section
- Enhanced `ReportsPage` with conditional manhour columns
- TanStack Query integration for real-time updates
- Loading skeletons and error states

**Testing**:
- Component tests: Widget rendering, metric calculations
- Integration tests: Real-time updates when milestones change
- E2E tests: End-to-end milestone update → manhour update flow
- Performance tests: Widget load time, query caching

**Acceptance Criteria**:
- Dashboard shows project-level manhour metrics
- Component detail displays budgeted/earned manhours (permission-gated)
- Progress reports show manhour columns (if authorized)
- UI updates automatically when milestones change
- Graceful degradation for projects without budgets

**Files Created/Modified**:
- `src/components/dashboard/ManhourSummaryWidget.tsx`
- `src/components/ComponentDetailView.tsx` (enhanced)
- `src/pages/ReportsPage.tsx` (enhanced)
- `src/components/dashboard/NoBudgetConfigured.tsx`
- `tests/components/ManhourSummaryWidget.test.tsx`
- `tests/e2e/manhour-realtime-updates.spec.ts`

---

### Phase 6: Export & Advanced Reporting (Week 5)

**Deliverables**:
- Enhanced PDF export with manhour columns (jsPDF + jsPDF-AutoTable)
- Enhanced Excel export with manhour sheet (xlsx library)
- Enhanced CSV export with manhour fields
- Export file naming with timestamp and dimension

**Testing**:
- Export tests: PDF, Excel, CSV generation
- Data integrity tests: Exported data matches database
- Permission tests: Manhour data only in exports for authorized users
- Performance tests: Export 10,000+ components without timeout

**Acceptance Criteria**:
- PDF exports include manhour columns when authorized
- Excel exports have "Manhours" worksheet
- CSV exports include manhour fields
- Exports handle large datasets (10,000+ components)
- File naming includes timestamp and dimension

**Files Modified**:
- `src/lib/exportReports.ts` (enhanced for manhours)
- `src/lib/exportPDF.ts` (add manhour columns)
- `src/lib/exportExcel.ts` (add manhour sheet)
- `tests/integration/export-manhours.test.ts`

---

### Phase 7: Dimension-Based Auto-Calculation Refinement (Week 6)

**Deliverables**:
- Enhanced `calculate_component_weight()` with material/schedule multipliers
- Parse `commodity_code` for material type (SS vs CS)
- Parse `commodity_code` for schedule (SCH40 vs SCH80)
- Admin UI for viewing calculation metadata
- Bulk recalculation function

**Testing**:
- Weight calculation tests: Material multipliers, schedule multipliers
- Parsing tests: Commodity code patterns
- Recalculation tests: Bulk updates, audit trail

**Acceptance Criteria**:
- Stainless steel components weighted 1.3x carbon steel
- Schedule 80 components weighted 1.2x Schedule 40
- Linear feet properly factored for threaded pipe
- Admin can view/debug calculation metadata
- Recalculation preserves audit trail

**Files Modified**:
- `supabase/migrations/00095_enhanced_weight_calculation.sql`
- `src/components/admin/ManhourCalculationDebug.tsx` (new)
- `tests/integration/weight-calculation-refinement.test.ts`

---

## Testing Strategy

### Test Coverage Requirements

| Category | Target Coverage | Enforcement |
|----------|----------------|-------------|
| Database functions | ≥80% | CI/CD gate |
| React components | ≥70% | CI/CD gate |
| Integration tests | ≥70% | CI/CD gate |
| E2E critical paths | 100% | Manual review |

### Test Pyramid

```
       /\
      /  \    E2E Tests (5%)
     /────\   - Budget creation workflow
    /      \  - Milestone update → manhour update
   /────────\ Integration Tests (25%)
  /          \ - View aggregation
 /────────────\ - RLS enforcement
/              \ Unit Tests (70%)
────────────────  - Weight calculation
                  - Earned manhours calc
                  - Component rendering
```

### Key Test Scenarios

#### 1. Weight Calculation Tests

```typescript
// tests/integration/weight-calculation.test.ts
describe('calculate_component_weight', () => {
  it('calculates weight for 2" valve', async () => {
    const weight = await supabase.rpc('calculate_component_weight', {
      p_component_type: 'valve',
      p_identity_key: { size: '2', commodity_code: 'VBALU-001' }
    });
    expect(weight.data).toBeCloseTo(2.83, 2); // 2^1.5
  });

  it('calculates weight for 4" valve', async () => {
    const weight = await supabase.rpc('calculate_component_weight', {
      p_component_type: 'valve',
      p_identity_key: { size: '4', commodity_code: 'VBALU-001' }
    });
    expect(weight.data).toBeCloseTo(8.0, 2); // 4^1.5
  });

  it('returns 1.0 for instruments with NOSIZE', async () => {
    const weight = await supabase.rpc('calculate_component_weight', {
      p_component_type: 'instrument',
      p_identity_key: { size: 'NOSIZE', commodity_code: 'ME-55402' }
    });
    expect(weight.data).toBe(1.0);
  });

  it('calculates weight for threaded pipe with linear feet', async () => {
    const weight = await supabase.rpc('calculate_component_weight', {
      p_component_type: 'threaded_pipe',
      p_identity_key: { size: '2', linear_feet: 100 }
    });
    expect(weight.data).toBe(20.0); // 2 × 100 × 0.1
  });
});
```

#### 2. Earned Manhours Calculation Tests

```typescript
// tests/integration/earned-manhours.test.ts
describe('calculate_component_earned_manhours', () => {
  it('calculates earned manhours for discrete milestones', async () => {
    // Setup: Field weld with 10 budgeted MH
    // Fit-Up complete (10%), Weld Made complete (60%)
    const earned = await supabase.rpc('calculate_component_earned_manhours', {
      p_component_id: testComponentId,
      p_budget_id: testBudgetId
    });
    expect(earned.data).toBe(7.0); // 10 × (0.10 + 0.60)
  });

  it('calculates earned manhours for partial milestones', async () => {
    // Setup: Threaded pipe with 20 budgeted MH
    // Fabricate 75% (16%), Install 50% (16%)
    const earned = await supabase.rpc('calculate_component_earned_manhours', {
      p_component_id: testComponentId,
      p_budget_id: testBudgetId
    });
    expect(earned.data).toBe(4.0); // 20 × (0.16×0.75 + 0.16×0.50)
  });

  it('returns 0 for components with no milestones', async () => {
    const earned = await supabase.rpc('calculate_component_earned_manhours', {
      p_component_id: testComponentId,
      p_budget_id: testBudgetId
    });
    expect(earned.data).toBe(0);
  });
});
```

#### 3. Distribution Tests

```typescript
// tests/integration/distribution.test.ts
describe('distribute_manhours_to_components', () => {
  it('distributes 1000 MH across 100 components proportionally', async () => {
    const result = await supabase.rpc('distribute_manhours_to_components', {
      p_budget_id: testBudgetId
    });

    expect(result.data.components_processed).toBe(100);
    expect(result.data.total_allocated).toBe(1000);

    // Verify sum of component manhours equals budget
    const { data: components } = await supabase
      .from('component_manhours')
      .select('budgeted_manhours')
      .eq('budget_id', testBudgetId);

    const sum = components.reduce((acc, c) => acc + c.budgeted_manhours, 0);
    expect(sum).toBeCloseTo(1000, 2);
  });

  it('generates warnings for components without size', async () => {
    const result = await supabase.rpc('distribute_manhours_to_components', {
      p_budget_id: testBudgetId
    });

    const noSizeWarnings = result.data.warnings.filter(w => w.type === 'no_size');
    expect(noSizeWarnings).toHaveLength(15); // 15 instruments with NOSIZE
  });
});
```

#### 4. Trigger Tests

```typescript
// tests/integration/triggers.test.ts
describe('update_manhours_on_milestone_change trigger', () => {
  it('auto-updates earned manhours when milestone completed', async () => {
    // Setup: Component with 10 budgeted MH, no milestones complete
    const { data: initial } = await supabase
      .from('component_manhours')
      .select('earned_manhours')
      .eq('component_id', testComponentId)
      .single();
    expect(initial.earned_manhours).toBe(0);

    // Update: Complete "Weld Made" milestone (60% weight)
    await supabase
      .from('components')
      .update({ current_milestones: { 'Weld Made': true } })
      .eq('id', testComponentId);

    // Verify: Earned manhours updated
    const { data: updated } = await supabase
      .from('component_manhours')
      .select('earned_manhours')
      .eq('component_id', testComponentId)
      .single();
    expect(updated.earned_manhours).toBe(6.0); // 10 × 0.60
  });

  it('no-ops for components without active budget', async () => {
    // Component in project without budget
    await supabase
      .from('components')
      .update({ current_milestones: { 'Weld Made': true } })
      .eq('id', componentWithoutBudgetId);

    // No error thrown, graceful no-op
  });
});
```

#### 5. RLS Policy Tests

```typescript
// tests/integration/rls-manhours.test.ts
describe('RLS policies - manhour tables', () => {
  it('users can only view budgets in their organization', async () => {
    // User in Org A
    const { data: budgetsA } = await supabaseOrgA
      .from('project_manhour_budgets')
      .select('*');

    // User in Org B
    const { data: budgetsB } = await supabaseOrgB
      .from('project_manhour_budgets')
      .select('*');

    // No cross-org visibility
    expect(budgetsA.some(b => b.project_id === orgBProjectId)).toBe(false);
    expect(budgetsB.some(b => b.project_id === orgAProjectId)).toBe(false);
  });

  it('foreman cannot view manhour data', async () => {
    // Foreman attempts to query
    const { data, error } = await supabaseForeman
      .from('project_manhour_budgets')
      .select('*');

    expect(data).toEqual([]);
    expect(error).toBeNull(); // No error, just empty results
  });

  it('project_manager can view but not edit budgets', async () => {
    // Can SELECT
    const { data: budgets } = await supabasePM
      .from('project_manhour_budgets')
      .select('*');
    expect(budgets.length).toBeGreaterThan(0);

    // Cannot INSERT
    const { error } = await supabasePM
      .from('project_manhour_budgets')
      .insert({
        project_id: testProjectId,
        version: 2,
        total_budgeted_manhours: 1500,
        revision_reason: 'Unauthorized'
      });
    expect(error).toBeTruthy();
  });
});
```

#### 6. E2E Tests

```typescript
// tests/e2e/budget-creation-workflow.spec.ts
test('owner creates budget and distributes to components', async ({ page }) => {
  // Login as owner
  await page.goto('/login');
  await page.fill('input[name=email]', 'owner@example.com');
  await page.fill('input[name=password]', 'password');
  await page.click('button[type=submit]');

  // Navigate to project settings
  await page.goto('/projects/test-project-id/settings?tab=manhours');

  // Click create budget
  await page.click('button:has-text("Create New Budget Version")');

  // Fill form
  await page.fill('input#total-manhours', '1250');
  await page.selectOption('select#revision-reason', 'Original estimate');

  // Submit
  await page.click('button:has-text("Create & Distribute")');

  // Wait for distribution
  await page.waitForSelector('text=Manhours Distributed Successfully');

  // Verify results modal
  await expect(page.locator('text=Distributed 1,250 MH across 342 components')).toBeVisible();

  // Go to dashboard
  await page.click('button:has-text("Go to Dashboard")');

  // Verify widget displays
  await expect(page.locator('text=Manhour Progress')).toBeVisible();
  await expect(page.locator('text=Total Budget: 1,250 MH')).toBeVisible();
});
```

### Performance Testing

**Load Tests**:
- Distribution function with 10,000 components: <5 seconds
- View aggregation with 50,000 components: <3 seconds
- Dashboard widget load time: <1 second

**Stress Tests**:
- Concurrent budget creations: 10 users simultaneously
- Rapid milestone updates: 100 updates/second
- Export 50,000 components to Excel: <10 seconds

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Performance degradation with large datasets | High | Low | Indexed views, query optimization, pagination |
| RLS policy bugs allowing data leakage | Critical | Low | Comprehensive RLS tests, security audit |
| Weight calculation errors for edge cases | Medium | Medium | Unit tests for all component types, validation warnings |
| Trigger performance on high-volume updates | Medium | Low | Batch processing, async updates |
| Migration failures on production | High | Low | Test migrations on staging, rollback scripts |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| User confusion about budget versioning | Medium | Medium | Clear UI labels, onboarding tooltips, documentation |
| Incorrect manhour allocations | High | Low | Distribution preview, validation warnings, recalculation function |
| Unauthorized access to financial data | Critical | Low | RLS + frontend permissions, security audit |
| Existing projects without budgets feel incomplete | Low | High | Graceful degradation, optional onboarding |

### Rollback Strategy

1. **Database**: All migrations reversible via `supabase db reset` to previous migration number
2. **Frontend**: Permission-gated UI can be disabled via feature flag
3. **Data**: No existing data modified (all new tables)
4. **Budget deletion**: Cascade deletes remove all associated `component_manhours` records

---

## Appendix: Existing Infrastructure

### Milestone Weight Infrastructure (Reused)

**File**: `supabase/migrations/00009_foundation_tables.sql`

**Progress Templates Schema**:
```sql
CREATE TABLE progress_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('discrete', 'quantity', 'hybrid')),
  milestones_config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Milestone Config Validation**:
```sql
CREATE OR REPLACE FUNCTION validate_milestone_weights(p_milestones_config JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  total_weight NUMERIC(5,2) := 0;
  milestone JSONB;
BEGIN
  FOR milestone IN SELECT * FROM jsonb_array_elements(p_milestones_config) LOOP
    total_weight := total_weight + (milestone->>'weight')::NUMERIC(5,2);
  END LOOP;

  RETURN total_weight = 100.00;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE progress_templates
ADD CONSTRAINT chk_milestone_weights_total_100
CHECK (validate_milestone_weights(milestones_config));
```

**Why Reuse**: Weights already validated to sum to 100%, represent "proportion of work", and are used identically for both percentage and manhour calculations. No duplication needed.

### Component Type System

**11 Component Types**:
1. spool
2. field_weld
3. support
4. valve
5. fitting
6. flange
7. instrument
8. tubing
9. hose
10. misc_component
11. threaded_pipe

**Identity Key Patterns**:
- **Spool/Field Weld**: `{"spool_id": "SP-001"}` or `{"weld_number": "W-001"}` (no SIZE)
- **All Others**: `{"drawing_norm": "P-001", "commodity_code": "VBALU-001", "size": "2", "seq": 1}`

**SIZE Field Examples**:
- `"2"`, `"4"` → Numeric diameter (most common)
- `"1X2"` → Reducer (average diameter)
- `"NOSIZE"` → Instruments (fixed weight)

### Existing Earned Value Function

**File**: `supabase/migrations/00057_earned_milestone_function.sql`

**Purpose**: Maps component-specific milestones to 5 standardized milestones (received, installed, punch, tested, restored) for reporting.

**Key Difference**: Returns **percentage** (0-100), not manhours. Our new function (`calculate_component_earned_manhours`) will return **absolute manhours**.

### Permission System

**Current Permissions**:
- manage_drawings
- assign_metadata
- update_milestones
- assign_welders
- manage_team
- view_reports
- manage_projects

**New Permission**: `view_financial_data` (restricts manhour visibility)

### RLS Patterns

**Standard Organization Check**:
```sql
WHERE project_id IN (
  SELECT id FROM projects
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
)
```

**Role-Based Operations**:
```sql
AND EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid()
  AND role IN ('owner', 'admin', 'project_manager')
)
```

---

## Summary

This design extends PipeTrak V2's existing earned value infrastructure to support manhour tracking with:

- **Zero duplication** (reuses milestone weights)
- **Automatic distribution** (dimension-based calculation)
- **Budget versioning** (change order support)
- **Permission-gated access** (financial data restricted)
- **Graceful degradation** (works with or without budgets)
- **Real-time updates** (auto-calculation via triggers)
- **Enterprise reporting** (aggregation by any dimension)

**6-week implementation** delivers comprehensive manhour tracking with full audit trail, mobile-responsive UI, and export capabilities.

---

**End of Design Document**
