# Progress Calculation Matrix

This document defines all rules of credit, manhour calculations, and percent complete formulas for PipeTrak.

---

## Table of Contents

1. [Key Concepts](#key-concepts)
2. [Default Progress Templates](#default-progress-templates)
3. [Manhour Category Mappings](#manhour-category-mappings)
4. [Calculation Formulas](#calculation-formulas)
5. [Data Sources](#data-sources)
6. [Project-Specific Overrides](#project-specific-overrides)

---

## Key Concepts

### Milestone Types

| Type | Description | Value Range | Example |
|------|-------------|-------------|---------|
| **Discrete** | Binary complete/incomplete | 0 or 100 | Receive, Install, Punch |
| **Partial** | Percentage-based progress | 0-100 | Fabricate (threaded pipe) |

### Milestone Values

All milestone values are stored on a **0-100 scale**:
- `0` = Not started
- `100` = Complete
- `1-99` = Partial progress (only for partial milestones)

**Historical Note:** Legacy data may have `true/false` or `1/0` values. These are interpreted as:
- `true` or `1` → Complete (100%)
- `false` or `0` → Not started (0%)

### Workflow Types

| Workflow | Description | Component Types |
|----------|-------------|-----------------|
| **discrete** | All milestones are binary | spool, field_weld, valve, instrument, support, fitting, flange, hose, tubing, misc_component, pipe |
| **hybrid** | Mix of partial and discrete milestones | threaded_pipe |

---

## Default Progress Templates

### SPOOL (discrete workflow)

| Milestone | Weight | Order | Partial | Welder Required |
|-----------|--------|-------|---------|-----------------|
| Receive | 5% | 1 | No | No |
| Erect | 40% | 2 | No | No |
| Connect | 40% | 3 | No | No |
| Punch | 5% | 4 | No | No |
| Test | 5% | 5 | No | No |
| Restore | 5% | 6 | No | No |
| **TOTAL** | **100%** | | | |

### FIELD_WELD (discrete workflow)

| Milestone | Weight | Order | Partial | Welder Required |
|-----------|--------|-------|---------|-----------------|
| Fit-up | 10% | 1 | No | No |
| Weld Complete | 60% | 2 | No | **Yes** |
| Punch | 10% | 3 | No | No |
| Test | 15% | 4 | No | No |
| Restore | 5% | 5 | No | No |
| **TOTAL** | **100%** | | | |

### VALVE / INSTRUMENT / SUPPORT / FITTING / FLANGE / HOSE / TUBING / MISC_COMPONENT (discrete workflow)

| Milestone | Weight | Order | Partial | Welder Required |
|-----------|--------|-------|---------|-----------------|
| Receive | 10% | 1 | No | No |
| Install | 60% | 2 | No | No |
| Punch | 10% | 3 | No | No |
| Test | 15% | 4 | No | No |
| Restore | 5% | 5 | No | No |
| **TOTAL** | **100%** | | | |

### PIPE (discrete workflow)

| Milestone | Weight | Order | Partial | Welder Required |
|-----------|--------|-------|---------|-----------------|
| Receive | 50% | 1 | No | No |
| Install | 50% | 2 | No | No |
| **TOTAL** | **100%** | | | |

### THREADED_PIPE (hybrid workflow)

| Milestone | Weight | Order | Partial | Welder Required |
|-----------|--------|-------|---------|-----------------|
| Fabricate | 16% | 1 | **Yes** | No |
| Install | 16% | 2 | **Yes** | No |
| Erect | 16% | 3 | **Yes** | No |
| Connect | 16% | 4 | **Yes** | No |
| Support | 16% | 5 | **Yes** | No |
| Punch | 5% | 6 | No | No |
| Test | 10% | 7 | No | No |
| Restore | 5% | 8 | No | No |
| **TOTAL** | **100%** | | | |

---

## Manhour Category Mappings

Manhour reports aggregate milestones into 5 standard categories. This table shows which milestones contribute to each category.

### Category Definitions

| Category | Description |
|----------|-------------|
| **Receive** | Material received on site |
| **Install** | Main installation work |
| **Punch** | Punch list / quality inspection |
| **Test** | Pressure testing / functional testing |
| **Restore** | Insulation restoration / final cleanup |

### Milestone → Category Mapping by Component Type

#### SPOOL
| Category | Milestones | Default Weight |
|----------|------------|----------------|
| Receive | Receive | 5% |
| Install | Erect, Connect | 80% |
| Punch | Punch, Punch Complete | 5% |
| Test | Test, Hydrotest | 5% |
| Restore | Restore | 5% |

#### FIELD_WELD
| Category | Milestones | Default Weight |
|----------|------------|----------------|
| Receive | *(none)* | 0% |
| Install | Fit-up, Weld Complete | 70% |
| Punch | Punch, Accepted | 10% |
| Test | Test | 15% |
| Restore | Restore | 5% |

#### VALVE / INSTRUMENT / FITTING / FLANGE / HOSE / TUBING / MISC_COMPONENT
| Category | Milestones | Default Weight |
|----------|------------|----------------|
| Receive | Receive | 10% |
| Install | Install | 60% |
| Punch | Punch, Punch Complete, Test Complete | 10% |
| Test | Test | 15% |
| Restore | Restore | 5% |

#### SUPPORT
| Category | Milestones | Default Weight |
|----------|------------|----------------|
| Receive | Receive | 10% |
| Install | Install | 60% |
| Punch | Punch, Punch Complete, Test Complete | 10% |
| Test | Test | 15% |
| Restore | Restore, Insulate | 5% |

#### THREADED_PIPE
| Category | Milestones | Default Weight |
|----------|------------|----------------|
| Receive | Receive | 0% |
| Install | Fabricate, Install, Erect, Connect, Support | 80% |
| Punch | Punch | 5% |
| Test | Test | 10% |
| Restore | Restore | 5% |

---

## Calculation Formulas

### 1. Component Percent Complete

**Stored in:** `components.percent_complete`
**Function:** `calculate_component_percent()`
**Source:** `project_progress_templates` (if exists) OR `progress_templates`

```
percent_complete = SUM(milestone_weight) for each completed milestone
```

**Example: Spool with Receive=100, Erect=100 (using project template)**
```
Receive weight = 2%  (completed)
Erect weight = 41%   (completed)
Connect weight = 41% (not completed)
...

percent_complete = 2 + 41 = 43%
```

### 2. Earned Manhours (Dashboard)

**Source:** `components` table directly
**Used by:** Dashboard, project summary

```
earned_mh = budgeted_manhours × percent_complete / 100
```

**Example: Spool with 10 MH budget, 43% complete**
```
earned_mh = 10 × 43 / 100 = 4.30 MH
```

### 3. Earned Manhours by Category (Reports)

**Functions:** `calculate_earned_milestone_value()`, `get_category_weight()`
**Source:** Manhour views (`vw_manhour_progress_by_area`, etc.)
**Used by:** Manhour progress reports

For each category (Receive, Install, Punch, Test, Restore):

```
category_weight = get_category_weight(project_id, component_type, category)
category_pct = calculate_earned_milestone_value(component_type, milestones, category)
category_earned = budgeted_mh × category_weight × category_pct / 100
```

**Total Earned:**
```
total_earned = receive_earned + install_earned + punch_earned + test_earned + restore_earned
```

**Example: Spool with 10 MH, Receive=100, Erect=100 (project template: Receive=2%, Erect=41%, Connect=41%)**
```
Receive:
  category_weight = 0.02 (2%)
  category_pct = 100% (Receive is complete)
  receive_earned = 10 × 0.02 × 100 / 100 = 0.20 MH

Install:
  category_weight = 0.82 (Erect 41% + Connect 41%)
  category_pct = 50% (Erect complete, Connect not)
  install_earned = 10 × 0.82 × 50 / 100 = 4.10 MH

Total = 0.20 + 4.10 = 4.30 MH
```

### 4. Project Percent Complete

```
project_pct = SUM(earned_mh) / total_budget × 100
```

Where `total_budget` comes from:
1. `project_manhour_budgets.total_budgeted_manhours` (if exists and active)
2. OR `SUM(components.budgeted_manhours)` for all non-retired components

---

## Data Sources

### Tables

| Table | Purpose |
|-------|---------|
| `progress_templates` | System-wide default milestone definitions |
| `project_progress_templates` | Project-specific milestone overrides |
| `components` | Component data including `current_milestones`, `percent_complete`, `budgeted_manhours` |
| `project_manhour_budgets` | Project-level manhour budget |
| `milestone_events` | Historical record of milestone changes |

### Views

| View | Purpose |
|------|---------|
| `vw_manhour_progress_by_area` | Manhour earned by area |
| `vw_manhour_progress_by_drawing` | Manhour earned by drawing |
| `vw_manhour_progress_by_test_package` | Manhour earned by test package |

### Functions

| Function | Purpose |
|----------|---------|
| `calculate_component_percent()` | Calculate component percent complete from milestones |
| `calculate_earned_milestone_value()` | Calculate earned % for a category based on milestones |
| `get_category_weight()` | Get category weight (checks project templates first) |

---

## Project-Specific Overrides

Projects can have custom milestone weights via `project_progress_templates`.

### How It Works

1. When calculating percent complete, `calculate_component_percent()` checks for project-specific templates first
2. If found, uses those weights; otherwise falls back to system defaults
3. Manhour views use `get_category_weight()` which also checks project templates first

### Example: Dark Knight 1605 Project

This project has custom spool weights:

| Milestone | Default | Project Override |
|-----------|---------|------------------|
| Receive | 5% | **2%** |
| Erect | 40% | **41%** |
| Connect | 40% | **41%** |
| Punch | 5% | **6%** |
| Test | 5% | 5% |
| Restore | 5% | 5% |

**Impact:**
- A spool with only Receive complete = 2% (not 5%)
- A spool with Receive + Erect complete = 43% (not 45%)

---

## Validation Checklist

When verifying progress calculations:

- [ ] Dashboard % matches Report % (within 0.5pp tolerance)
- [ ] `SUM(category_earned)` equals `earned_mh` from dashboard
- [ ] Project-specific templates are being used (if they exist)
- [ ] Milestone values are on 0-100 scale (not 0-1)
- [ ] `is_retired` components are excluded from calculations
- [ ] Partial milestones contribute proportionally (0-100%)
- [ ] Discrete milestones contribute full weight when complete (100 only)

---

*Last updated: 2025-12-06*
