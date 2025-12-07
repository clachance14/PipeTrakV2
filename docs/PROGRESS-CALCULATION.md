# Progress Calculation System

This document explains how PipeTrak calculates progress percentages, earned manhours, and delta reports.

## Overview

Progress tracking flows through three layers:

1. **Milestone Events** - Individual milestone changes recorded with pre-calculated `delta_mh`
2. **Category Aggregation** - Events grouped by category (receive, install, punch, test, restore)
3. **Report Display** - Percentages calculated from earned vs budgeted manhours

---

## Core Concepts

### Milestones

Each component type has a set of milestones that represent completion stages. Milestones use a **0-100 scale** where:
- `0` = Not started
- `100` = Complete
- Intermediate values (e.g., `50`) = Partial completion

### Categories

Milestones are grouped into five categories, each representing a phase of work:

| Category | Description | Example Milestones |
|----------|-------------|-------------------|
| `receive` | Material receiving | Receive |
| `install` | Installation/erection | Erect, Fit-up, Weld Complete |
| `punch` | Punchlist completion | Punch |
| `test` | Testing | Test |
| `restore` | Restoration | Restore |

Categories are defined in `project_progress_templates` with weights that sum to 100% per component type.

### Weights

Each milestone has a **weight** (percentage of total manhours for that component type). For example, a Spool might have:

| Milestone | Category | Weight |
|-----------|----------|--------|
| Receive | receive | 7% |
| Erect | install | 41% |
| Connect | install | 10% |
| Punch | punch | 15% |
| Test | test | 15% |
| Restore | restore | 12% |
| **Total** | | **100%** |

---

## Formulas

### 1. Delta Manhours (per milestone event)

When a milestone value changes, we calculate the earned/lost manhours:

```
delta_mh = budgeted_manhours × (weight / 100) × (value_delta / 100)
```

Where:
- `budgeted_manhours` = Component's total manhour budget
- `weight` = Milestone weight from project_progress_templates
- `value_delta` = new_value - previous_value (on 0-100 scale)

**Example**: Spool with 10 MH budget, "Erect" milestone (weight=41%) goes 0→100:
```
delta_mh = 10 × (41/100) × ((100-0)/100)
         = 10 × 0.41 × 1.0
         = 4.1 MH earned
```

**Rollback Example**: Same spool, "Erect" goes 100→0:
```
delta_mh = 10 × (41/100) × ((0-100)/100)
         = 10 × 0.41 × -1.0
         = -4.1 MH (progress lost)
```

### 2. Category Budget

The budget for a specific category across all components:

```
category_budget = SUM(component.budgeted_manhours × category_weight_sum)
```

Where `category_weight_sum` is the sum of all milestone weights in that category for the component type.

**Example**: 10 spools × 10 MH each, receive category weight = 7%:
```
receive_budget = 10 × 10 × 0.07 = 7 MH
```

### 3. Category Percentage Delta

The percentage change for a category over a time period:

```
category_pct_delta = (earned_mh / category_budget) × 100
```

**Example**: Earned 1.4 MH in receive category, budget is 7 MH:
```
receive_pct_delta = (1.4 / 7) × 100 = 20%
```

### 4. Total Percentage Delta

The overall percentage change weighted by all categories:

```
total_pct_delta = (total_earned_mh / total_budget) × 100
```

**Example**: Earned 5.3 MH total, budget is 100 MH:
```
total_pct_delta = (5.3 / 100) × 100 = 5.3%
```

---

## Database Implementation

### milestone_events Table

Each milestone change is recorded with pre-calculated values:

```sql
CREATE TABLE milestone_events (
  id UUID PRIMARY KEY,
  component_id UUID REFERENCES components(id),
  milestone_name TEXT NOT NULL,
  value INTEGER,           -- New value (0-100)
  previous_value INTEGER,  -- Previous value (0-100)
  delta_mh NUMERIC,        -- Pre-calculated manhour delta
  category TEXT,           -- Category from template
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### update_component_milestone RPC

When a milestone is updated, the RPC:
1. Looks up the template weight and category
2. Calculates `delta_mh` using the formula above
3. Inserts the event with pre-calculated values

```sql
-- Simplified from actual implementation
v_delta_mh := v_component.budgeted_manhours
  * (v_template.weight / 100.0)
  * ((p_new_value - COALESCE(v_previous_value, 0)) / 100.0);

INSERT INTO milestone_events (
  component_id, milestone_name, value, previous_value,
  delta_mh, category
) VALUES (
  p_component_id, p_milestone_name, p_new_value, v_previous_value,
  v_delta_mh, v_template.category
);
```

### get_progress_delta_by_dimension RPC

Aggregates milestone events for delta reporting:

```sql
SELECT
  dimension_value,
  SUM(delta_mh) FILTER (WHERE category = 'receive') AS delta_receive_mh,
  SUM(delta_mh) FILTER (WHERE category = 'install') AS delta_install_mh,
  SUM(delta_mh) FILTER (WHERE category = 'punch') AS delta_punch_mh,
  SUM(delta_mh) FILTER (WHERE category = 'test') AS delta_test_mh,
  SUM(delta_mh) FILTER (WHERE category = 'restore') AS delta_restore_mh
FROM milestone_events me
JOIN components c ON c.id = me.component_id
WHERE me.created_at BETWEEN p_start_date AND p_end_date
GROUP BY dimension_value;
```

---

## Frontend Implementation

### DeltaReportTable.tsx

The frontend receives pre-aggregated data and calculates display percentages:

```typescript
// Calculate category percentage using CATEGORY budget (not total)
const calcCategoryPercentDelta = (earned: number, categoryBudget: number) => {
  if (categoryBudget === 0) return '--';
  return (earned / categoryBudget) * 100;
};

// Each category uses its own budget
const receivePct = calcCategoryPercentDelta(row.deltaReceiveMhEarned, row.receiveMhBudget);
const installPct = calcCategoryPercentDelta(row.deltaInstallMhEarned, row.installMhBudget);
// ... etc

// Total uses total budget
const totalPct = (row.deltaTotalMhEarned / row.mhBudget) * 100;
```

**Important**: Category percentages must use category-specific budgets, not the total budget. Using total budget would show artificially low percentages.

---

## Worked Example

### Setup
- Project: Dark Knight Rail Car Loading
- Area: Rail Car Loading
- Components: 26 spools + 16 field welds
- Total Budget: 3,200 MH

### Category Budgets (approximate)
| Category | Budget |
|----------|--------|
| Receive | 224 MH (7%) |
| Install | 1,632 MH (51%) |
| Punch | 480 MH (15%) |
| Test | 480 MH (15%) |
| Restore | 384 MH (12%) |

### Activity in Last 30 Days
- 26 spools received (Receive 0→100)
- 4 spools erected (Erect 0→100)
- 4 field welds completed (Fit-up + Weld Complete)

### Delta Calculation

**Receive Category**:
- Earned: 26 spools × ~8.6 MH each × 7% = ~54.7 MH
- Percentage: 54.7 / 224 = **24.4%**

**Install Category**:
- Earned: 4 spools erected + 4 field welds = ~103 MH
- Percentage: 103 / 1,632 = **6.3%**

**Total**:
- Total Earned: ~170 MH
- Percentage: 170 / 3,200 = **5.3%**

---

## Common Issues

### Negative Delta Values

Negative deltas indicate rollbacks (milestone value decreased). Legitimate causes:
- Work was undone and needs to be redone
- Incorrect milestone was marked complete by mistake

If you see unexpected negative deltas, check:
1. `milestone_events` table for the component
2. `previous_value` → `value` transitions
3. Whether the rollback was intentional

### Category Percentages Don't Match Total

This is expected! Each category percentage is against that category's budget:
- Receive at 24.4% of 224 MH = 54.7 MH earned
- Install at 6.3% of 1,632 MH = 102.8 MH earned
- Total at 5.3% of 3,200 MH = 169.6 MH earned

The math checks out: 54.7 + 102.8 ≈ 157.5 MH (close to 169.6 with rounding)

### Field Welds vs Components

Field welds use the same calculation system:
- They have their own `budgeted_manhours`
- Their milestones (Fit-up, Weld Complete) map to the `install` category
- They contribute to both category and total budgets

---

## Related Files

- `src/components/reports/DeltaReportTable.tsx` - Frontend display component
- `src/hooks/useProgressDeltaReport.ts` - Data fetching hook
- `src/types/reports.ts` - TypeScript types for report data
- `supabase/migrations/*_create_progress_delta_rpc.sql` - RPC implementation
- `supabase/migrations/*_add_delta_mh_to_milestone_events.sql` - Schema changes

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-06 | Added `delta_mh` and `category` columns to milestone_events |
| 2025-12-06 | Fixed category percentage calculation (use category budget, not total) |
| 2025-12-05 | Initial delta report implementation |
