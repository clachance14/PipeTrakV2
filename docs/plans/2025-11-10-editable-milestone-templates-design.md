# Editable Milestone Weight Templates (Per-Project)

**Date**: 2025-11-10
**Feature**: Per-project milestone weight customization
**Scope**: Desktop-only admin/project manager feature

## Problem

PipeTrak calculates component progress using milestone weights (e.g., Field Weld "Weld Made" = 60%). These weights are hardcoded in the database. Projects cannot adjust them. Different projects need different credit rules, but all projects share the same weights.

## Solution

Enable admins and project managers to edit milestone weight percentages for each component type within their project. Each project gets its own copy of the system templates. Changes apply retroactively to existing components if the user chooses.

## Architecture

### Template Cloning

New projects automatically clone all system templates. The system creates 55 rows (11 component types × ~5 milestones each) in `project_progress_templates`. Existing projects continue using system templates until an admin clones them manually.

### Database Schema

**New table: `project_progress_templates`**

```sql
CREATE TABLE project_progress_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  milestone_name text NOT NULL,
  weight integer NOT NULL CHECK (weight >= 0 AND weight <= 100),
  milestone_order integer NOT NULL,
  is_partial boolean DEFAULT false,
  requires_welder boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(project_id, component_type, milestone_name)
);

CREATE INDEX idx_project_templates_lookup
  ON project_progress_templates(project_id, component_type);
```

**Audit table: `project_template_changes`**

```sql
CREATE TABLE project_template_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  component_type text NOT NULL,
  changed_by uuid REFERENCES users(id),
  old_weights jsonb NOT NULL,
  new_weights jsonb NOT NULL,
  applied_to_existing boolean NOT NULL,
  affected_component_count integer NOT NULL,
  changed_at timestamptz DEFAULT now()
);
```

### Validation

Milestone weights must sum to 100% per component type. The database enforces this with a trigger:

```sql
CREATE OR REPLACE FUNCTION validate_project_template_weights()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT SUM(weight)
      FROM project_progress_templates
      WHERE project_id = NEW.project_id
        AND component_type = NEW.component_type) != 100
  THEN
    RAISE EXCEPTION 'Milestone weights must sum to 100 for component type %', NEW.component_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

The client validates before saving. The server validates on save. Both must pass.

### Progress Calculation

The `calculate_component_percent()` function reads from `project_progress_templates` first. If no project template exists, it falls back to system `progress_templates`. This preserves backward compatibility.

```sql
CREATE OR REPLACE FUNCTION calculate_component_percent(component_id uuid)
RETURNS integer AS $$
DECLARE
  project_id uuid;
  component_type text;
  total_percent integer := 0;
BEGIN
  -- Get project and type
  SELECT c.project_id, c.component_type
  INTO project_id, component_type
  FROM components c WHERE c.id = component_id;

  -- Try project templates first
  SELECT SUM(
    CASE
      WHEN is_partial THEN weight * (current_milestones->milestone_name)::numeric / 100
      ELSE weight * CASE WHEN (current_milestones->milestone_name)::boolean THEN 1 ELSE 0 END
    END
  )
  INTO total_percent
  FROM project_progress_templates
  WHERE project_id = project_id AND component_type = component_type;

  -- Fall back to system templates if needed
  IF total_percent IS NULL THEN
    SELECT SUM(
      CASE
        WHEN is_partial THEN weight * (current_milestones->milestone_name)::numeric / 100
        ELSE weight * CASE WHEN (current_milestones->milestone_name)::boolean THEN 1 ELSE 0 END
      END
    )
    INTO total_percent
    FROM progress_templates
    WHERE component_type = component_type;
  END IF;

  RETURN COALESCE(total_percent, 0);
END;
$$ LANGUAGE plpgsql;
```

### Retroactive Application

When saving changes, users choose whether to recalculate existing components. A background RPC function updates all affected components:

```sql
CREATE OR REPLACE FUNCTION recalculate_components_with_template(
  target_project_id uuid,
  target_component_type text
)
RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE components
  SET percent_complete = calculate_component_percent(id)
  WHERE project_id = target_project_id
    AND component_type = target_component_type;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## User Interface

### Navigation

Project Settings → Milestone Templates (`/projects/:projectId/settings/milestones`)

Accessible only to users with `admin` or `project_manager` roles.

### Main Page

Display all 11 component types as cards in a grid layout. Each card shows the component type name, milestone count, and an Edit button.

```
┌─────────────────────────────────────────────────┐
│  Milestone Templates                            │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ Field Weld  │  │   Spool     │              │
│  │ 5 milestones│  │ 6 milestones│              │
│  │ [Edit]      │  │ [Edit]      │              │
│  └─────────────┘  └─────────────┘              │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐              │
│  │   Valve     │  │  Support    │              │
│  │ 5 milestones│  │ 4 milestones│              │
│  │ [Edit]      │  │ [Edit]      │              │
│  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────┘
```

If the project has no cloned templates, show a banner: "This project uses system templates. Clone to customize?" with a "Clone Templates" button.

### Edit Modal

Click Edit to open a modal for weight adjustment. Show all milestones for the component type with numeric inputs (0-100). Display a visual progress bar next to each input showing relative weight distribution. Calculate the total in real-time.

```
┌───────────────────────────────────────────────┐
│  Edit Field Weld Milestone Weights            │
│                                                │
│  Fit-Up           [  10  ]% ──────────────    │
│  Weld Made        [  60  ]% ────────────────  │
│  Punch            [  10  ]% ──────────────    │
│  Test             [  15  ]% ───────────────   │
│  Restore          [   5  ]% ─────────────     │
│                                                │
│  Total: 100% ✓                                │
│                                                │
│  ⚠️  This affects 234 existing components     │
│  □  Apply to existing components              │
│                                                │
│  [Cancel]  [Save Changes]                     │
└───────────────────────────────────────────────┘
```

### Validation States

- **Valid (total = 100%)**: Green checkmark, Save button enabled
- **Invalid (total ≠ 100%)**: Red X, Save button disabled, show actual total
- **Individual weight out of range**: Red border on input, error toast
- **Network error**: Show retry button, preserve user edits

### Permission Enforcement

Frontend: Hide navigation link and Edit buttons for users without `admin` or `project_manager` roles.

Backend: RLS policies enforce permissions at database level. Unauthorized users receive "permission denied" errors.

## Data Flow

### Template Cloning Flow

1. User creates new project
2. Database trigger fires after project insert
3. Trigger copies all rows from `progress_templates` to `project_progress_templates` with new `project_id`
4. User sees cloned templates on first visit to settings page

### Weight Editing Flow

1. User opens edit modal for component type
2. Frontend loads current weights from `project_progress_templates`
3. User adjusts weights, frontend validates sum = 100%
4. User checks/unchecks "Apply to existing components"
5. User clicks Save
6. Frontend calls RPC: `update_project_template_weights(project_id, component_type, weights, apply_to_existing)`
7. Backend validates weights sum to 100%
8. Backend updates `project_progress_templates`
9. Backend logs change to `project_template_changes`
10. If `apply_to_existing` = true, backend calls `recalculate_components_with_template()`
11. Frontend shows success toast, closes modal

### Component Calculation Flow

1. User updates component milestone
2. Trigger fires: `update_component_percent_on_milestone_change`
3. Trigger calls `calculate_component_percent(component_id)`
4. Function reads from `project_progress_templates` (or falls back to `progress_templates`)
5. Function calculates weighted sum of completed milestones
6. Trigger updates `components.percent_complete`

## Error Handling

### Validation Errors

**Client-side (immediate feedback)**:
- Total ≠ 100%: Disable Save, show "Total: 95% ✗" in red
- Weight < 0 or > 100: Red border on input, error toast
- No changes: Disable Save button

**Server-side (safety net)**:
- Constraint violation: Return error "Milestone weights must sum to 100%"
- Permission denied: Return error "You lack permission to edit templates"

### Edge Cases

**Existing project without templates**: Show banner with "Clone Templates" button. Run cloning RPC on click.

**Concurrent edits**: Check `updated_at` timestamp before saving. If another user modified templates, show "Templates were modified. Refresh and try again."

**Zero-weight milestones**: Allow 0% for optional milestones. Validate at least one milestone has weight > 0.

**Component type with zero components**: Allow editing. Skip recalculation (zero components affected).

### Audit Trail

Log all template changes to `project_template_changes`. Display in UI: "Last modified by John Doe on 2025-11-09 at 3:42 PM"

Track:
- Who changed weights
- When they changed
- Old values vs. new values
- Whether they applied to existing components
- How many components were affected

## Testing

### Database Tests

- Clone system templates on project creation (expect 55 rows)
- Enforce weight sum validation (reject sum ≠ 100%)
- Allow zero-weight milestones (accept if other weights sum to 100%)
- Fall back to system templates for projects without clones

### RLS Policy Tests

- Admins can edit templates
- Project managers can edit templates
- Field engineers cannot edit templates (permission denied)
- Project members can read templates

### Recalculation Tests

- Recalculate existing components when checkbox checked
- Preserve old calculations when checkbox unchecked
- Handle partial milestones correctly (weight × completion %)

### UI Integration Tests

- Display validation error when total ≠ 100%
- Disable Save button until total = 100%
- Show affected component count
- Save and close on valid submission
- Keyboard accessibility (Tab, Enter, Escape)

### Coverage Requirements

- Database functions: ≥80%
- RLS policies: 100%
- UI components: ≥70%
- Integration tests: Cover happy path + 3 error scenarios

## Migration Strategy

### Database Migrations (5 total)

1. Create `project_progress_templates` table with indexes
2. Add validation trigger for weight sum = 100%
3. Create `project_template_changes` audit table
4. Update `calculate_component_percent()` to check project templates first
5. Add RLS policies for template editing and reading

### Backward Compatibility

Existing projects without cloned templates continue using system templates. No breaking changes. No automatic cloning. Users opt in via UI.

New projects automatically clone templates during creation (database trigger).

### Rollout Plan

**Phase 1**: Deploy database migrations (non-breaking)
**Phase 2**: Deploy frontend behind feature flag `ENABLE_TEMPLATE_EDITING`
**Phase 3**: Test with pilot projects
**Phase 4**: Enable for all users, remove feature flag

### Rollback Strategy

**Immediate (frontend only)**: Set `ENABLE_TEMPLATE_EDITING=false`

**Full (if database issues)**: Drop RLS policies, revert `calculate_component_percent()` to original version, preserve `project_progress_templates` table for data safety

## Success Metrics

- Projects using custom templates (vs. system defaults)
- Template customizations made per project
- User satisfaction survey after 30 days
- Bug reports related to template editing
- Performance impact on `calculate_component_percent()` (target: <10ms increase)

## Component Inventory

### New Database Objects

- `project_progress_templates` table
- `project_template_changes` table
- `validate_project_template_weights()` function
- `recalculate_components_with_template()` RPC
- `clone_system_templates_for_project()` RPC
- 4 RLS policies (SELECT, UPDATE, INSERT, DELETE)

### New React Components

- `MilestoneTemplatesPage` - Main settings page
- `TemplateCard` - Component type card with Edit button
- `TemplateEditor` - Modal for weight adjustment
- `WeightInput` - Numeric input with validation
- `WeightProgressBar` - Visual weight distribution
- `CloneTemplatesBanner` - Prompt for existing projects

### New TanStack Query Hooks

- `useProjectTemplates(projectId)` - Fetch templates
- `useUpdateProjectTemplates(projectId)` - Mutate templates
- `useCloneTemplates(projectId)` - Clone system templates
- `useTemplateChanges(projectId)` - Fetch audit log

### Modified Files

- `supabase/migrations/000XX_project_progress_templates.sql` (new)
- `supabase/migrations/000XX_template_validation.sql` (new)
- `supabase/migrations/000XX_template_audit.sql` (new)
- `supabase/migrations/000XX_update_calculate_percent.sql` (modify)
- `supabase/migrations/000XX_template_rls_policies.sql` (new)
- `src/pages/MilestoneTemplatesPage.tsx` (new)
- `src/components/TemplateEditor.tsx` (new)
- `src/hooks/useProjectTemplates.ts` (new)

## Design Decisions

### Why Template Cloning?

We considered three approaches:
1. **Template Cloning** (chosen): Full copy per project. Simple to understand. Easy rollback.
2. **Override Layer**: Store only deltas. Less duplication but more complexity.
3. **Template Versioning**: System versions with project forks. Most complex, adds overhead.

Template Cloning wins for simplicity and clarity. Disk space is cheap. Debugging is easy (just query one table). Rollback is trivial (revert to system templates).

### Why Desktop-Only?

Mobile and tablet viewports (<1024px) are optimized for field use: milestone updates, welder assignments, progress tracking. Template configuration is an administrative task that requires precision, rarely performed, and better suited to desktop. This reduces testing scope and development time.

### Why Retroactive Application is Optional?

Different projects need different behaviors. Some want historical accuracy preserved. Some want consistency after changing rules. Giving users the choice accommodates both needs.

### Why Per-Project Instead of System-Wide?

Different projects have different credit rules. Offshore projects might value testing more (higher Test weight). Fast-track projects might value installation speed (higher Install weight). Per-project customization enables this flexibility.

## Implementation Notes

- Desktop breakpoint: >1024px (matches existing patterns in Feature 015, 019, 022)
- Touch targets: Not applicable (desktop-only)
- Accessibility: WCAG 2.1 AA (keyboard navigation, ARIA labels, focus management)
- Performance: Batch updates to avoid N+1 queries
- Transactions: Wrap template updates + recalculation in single transaction
- Optimistic UI: Show changes immediately, rollback on error
- Loading states: Show spinner during recalculation (may take 1-2 seconds for large projects)
