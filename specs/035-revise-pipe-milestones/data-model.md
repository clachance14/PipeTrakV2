# Data Model: Revise Pipe Component Milestones

**Feature**: 035-revise-pipe-milestones
**Date**: 2026-01-10

## Entities

### Progress Template (Existing Table)

The `progress_templates` table already exists with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| component_type | TEXT | Component type identifier (e.g., 'pipe') |
| version | INTEGER | Template version number |
| workflow_type | TEXT | 'discrete', 'quantity', or 'hybrid' |
| milestones_config | JSONB | Array of milestone configurations |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Unique Constraint**: `(component_type, version)`

### Milestone Configuration Schema (JSONB)

Each element in `milestones_config` array:

```json
{
  "name": "Milestone Name",
  "weight": 30,
  "order": 1,
  "is_partial": true,
  "requires_welder": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | Display name of milestone |
| weight | integer | Percentage weight (0-100, sum must equal 100) |
| order | integer | Display order (1-based) |
| is_partial | boolean | If true, accepts 0-100% values; if false, accepts 0/1 |
| requires_welder | boolean | If true, milestone requires welder assignment |

## New Data: Pipe Template v2

### Template Record

```sql
INSERT INTO progress_templates (
  component_type,
  version,
  workflow_type,
  milestones_config
) VALUES (
  'pipe',
  2,
  'hybrid',
  '[...]'::jsonb
);
```

### Milestones Configuration

| Order | Name | Weight | is_partial | requires_welder |
|-------|------|--------|------------|-----------------|
| 1 | Receive | 5% | true | false |
| 2 | Erect | 30% | true | false |
| 3 | Connect | 30% | true | false |
| 4 | Support | 20% | true | false |
| 5 | Punch | 5% | false | false |
| 6 | Test | 5% | false | false |
| 7 | Restore | 5% | false | false |

**Total Weight**: 100%

## State Transitions

### Component Progress Flow

```
0% → Receive (0-100%) → Erect (0-100%) → Connect (0-100%) → Support (0-100%) → Punch (0/1) → Test (0/1) → Restore (0/1) → 100%
```

Progress calculation: `SUM(milestone_value × weight / 100)`

Example:
- Receive: 100% × 5% = 5%
- Erect: 50% × 30% = 15%
- Others: 0
- **Total**: 20%

## Relationships

```
progress_templates (pipe v2)
    ↓ referenced by
components (component_type='pipe')
    ↓ stores progress in
current_milestones (JSONB column)
```

## Validation Rules

1. **Weight Sum**: All milestone weights must total exactly 100
2. **Partial Values**: Partial milestones accept 0-100 (capped at boundaries)
3. **Discrete Values**: Discrete milestones accept 0 or 1 only
4. **Order Uniqueness**: Each order value must be unique within template

## No Schema Changes

This feature does not modify the `progress_templates` table schema. It only inserts a new row.
