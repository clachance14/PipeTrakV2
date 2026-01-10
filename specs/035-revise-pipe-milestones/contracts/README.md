# API Contracts: Revise Pipe Component Milestones

**Feature**: 035-revise-pipe-milestones
**Date**: 2026-01-10

## No New API Contracts Required

This feature is a database-only migration that adds a new template to the `progress_templates` table. No new API endpoints or contracts are needed because:

1. **Template Query**: Existing `useProgressTemplates()` hook already fetches templates by component type
2. **Milestone Updates**: Existing `update_component_milestone` RPC handles all milestone types
3. **Settings UI**: Existing `useProjectTemplates()` hook reads template configuration
4. **Progress Calculation**: Existing `calculate_component_percent()` function handles hybrid workflows

## Existing Contracts (Unchanged)

### Progress Templates Query

```typescript
// Existing hook: src/hooks/useProgressTemplates.ts
const { data: templates } = useProgressTemplates(componentType);
// Returns: { milestones_config: Milestone[], workflow_type: string, ... }
```

### Milestone Update RPC

```typescript
// Existing RPC: update_component_milestone(component_id, milestone_name, new_value)
// Handles both:
//   - Discrete milestones: new_value = 0 or 1
//   - Partial milestones: new_value = 0-100
```

### Progress Calculation

```sql
-- Existing function: calculate_component_percent(template_id, current_milestones, project_id, component_type)
-- Already supports hybrid workflows via is_partial flag
```

## Verification

After migration, verify the template is queryable:

```sql
SELECT version, workflow_type, milestones_config
FROM progress_templates
WHERE component_type = 'pipe'
ORDER BY version;
```

Expected: Two rows (v1 discrete, v2 hybrid)
