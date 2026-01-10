# Quickstart: Revise Pipe Component Milestones

**Feature**: 035-revise-pipe-milestones
**Date**: 2026-01-10

## Implementation Overview

This feature adds a v2 progress template for pipe components with 7 milestones (hybrid workflow).

## Prerequisites

- Supabase CLI installed and linked to project
- Access to run migrations via `./db-push.sh`

## Implementation Steps

### Step 1: Create Migration

```bash
supabase migration new revise_pipe_milestones_v2
```

### Step 2: Write Migration SQL

Add to the generated migration file:

```sql
-- Migration: Revise pipe component type milestones from 2-stage discrete to 7-stage hybrid
-- Feature: 035-revise-pipe-milestones
-- Context: No production pipe components exist - clean template update

INSERT INTO progress_templates (
  component_type,
  version,
  workflow_type,
  milestones_config
) VALUES (
  'pipe',
  2,
  'hybrid',
  '[
    {"name": "Receive", "weight": 5, "order": 1, "is_partial": true, "requires_welder": false},
    {"name": "Erect", "weight": 30, "order": 2, "is_partial": true, "requires_welder": false},
    {"name": "Connect", "weight": 30, "order": 3, "is_partial": true, "requires_welder": false},
    {"name": "Support", "weight": 20, "order": 4, "is_partial": true, "requires_welder": false},
    {"name": "Punch", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false},
    {"name": "Test", "weight": 5, "order": 6, "is_partial": false, "requires_welder": false},
    {"name": "Restore", "weight": 5, "order": 7, "is_partial": false, "requires_welder": false}
  ]'::jsonb
);
```

### Step 3: Push Migration

```bash
./db-push.sh
```

### Step 4: Regenerate Types

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

### Step 5: Verify

```sql
-- Verify template exists
SELECT version, workflow_type, jsonb_array_length(milestones_config) as milestone_count
FROM progress_templates
WHERE component_type = 'pipe'
ORDER BY version;

-- Expected output:
-- version | workflow_type | milestone_count
-- --------+---------------+----------------
--       1 | discrete      |               2
--       2 | hybrid        |               7
```

## Testing Verification

1. **Settings UI**: Navigate to Settings > Rules of Credit > Milestones
   - Pipe card should show 7 milestones with correct weights

2. **New Pipe Component**: Create a pipe component via import or manually
   - Should display 7 milestone inputs (4 percentage, 3 checkbox)

3. **Progress Calculation**: Set partial values
   - Receive=100, Erect=50 should show 20% total progress

## Rollback

If issues occur:

```sql
DELETE FROM progress_templates
WHERE component_type = 'pipe' AND version = 2;
```

## Common Issues

### Template not appearing in UI

The UI may be caching template data. Clear browser cache or trigger a re-fetch.

### Wrong milestone inputs showing

Verify the `is_partial` flag is set correctly for each milestone in the migration.

### Progress calculation incorrect

Verify `calculate_component_percent()` function is using the v2 template (check `progress_template_id` on component).
