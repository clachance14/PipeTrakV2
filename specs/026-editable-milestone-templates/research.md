# Research: Editable Milestone Weight Templates

**Phase**: 0 (Outline & Research)
**Date**: 2025-11-10
**Status**: Complete

## Research Questions

### Q1: How should project templates relate to system templates?

**Decision**: Template cloning pattern (full copy per project)

**Rationale**:
- **Simplicity**: Each project has complete, independent set of templates in `project_progress_templates` table
- **Clarity**: Single table query for all calculations (no joins or fallback logic complexity)
- **Debugging**: Easy to inspect project-specific weights without navigating version history
- **Rollback**: Simple revert to system templates by deleting project rows
- **Performance**: No JOIN required in hot path (`calculate_component_percent` function)
- **Storage**: 55 rows × ~200 bytes = ~11KB per project (negligible)

**Alternatives Considered**:
1. **Override Layer** (store only deltas from system templates)
   - **Pro**: Less data duplication
   - **Con**: Complex fallback logic in `calculate_component_percent`, harder to debug, requires JOIN
   - **Rejected**: Complexity outweighs storage savings

2. **Template Versioning** (system versions with project forks)
   - **Pro**: Supports system template evolution with project tracking
   - **Con**: Version management overhead, migration complexity, unclear semantics when system templates change
   - **Rejected**: Over-engineered for stated requirements (no system template evolution planned)

**Implementation**: Create `project_progress_templates` table mirroring `progress_templates` schema + `project_id` FK. Add trigger on `projects` table to auto-clone on insert. Provide manual cloning RPC for existing projects.

---

### Q2: How should weight validation work (client vs server)?

**Decision**: Dual validation (client for UX, server for enforcement)

**Rationale**:
- **Client validation**: Real-time feedback during editing (total percentage updates as user types), prevents bad submission attempts
- **Server validation**: Security boundary (prevents API manipulation), uses CHECK constraint + trigger for atomicity
- **Defense in depth**: Client validation = UX optimization, server validation = data integrity guarantee

**Implementation**:
```sql
-- Server: CHECK constraint on individual weights
ALTER TABLE project_progress_templates
ADD CONSTRAINT weight_range CHECK (weight >= 0 AND weight <= 100);

-- Server: Trigger validates sum = 100 per (project_id, component_type)
CREATE TRIGGER validate_template_weights
AFTER INSERT OR UPDATE ON project_progress_templates
FOR EACH ROW EXECUTE FUNCTION validate_project_template_weights();
```

```typescript
// Client: react-hook-form + Zod validation
const templateSchema = z.object({
  weights: z.array(z.object({
    milestone_name: z.string(),
    weight: z.number().min(0).max(100)
  }))
}).refine(
  (data) => data.weights.reduce((sum, w) => sum + w.weight, 0) === 100,
  { message: "Weights must sum to 100%" }
);
```

**Alternatives Considered**:
1. **Client-only validation**
   - **Rejected**: Security vulnerability (API can be bypassed via curl/Postman)

2. **Server-only validation**
   - **Rejected**: Poor UX (user submits form, waits for network round-trip, gets error, tries again)

---

### Q3: Should retroactive recalculation be synchronous or asynchronous?

**Decision**: Synchronous recalculation with loading indicator

**Rationale**:
- **User expectation**: Immediate feedback after clicking "Save Changes"
- **Scope**: 1,000 components in <3 seconds (per success criteria SC-003) is acceptable for synchronous operation
- **Simplicity**: No job queue, no polling, no notification system required
- **Consistency**: User sees updated progress percentages immediately in same session

**Implementation**:
```sql
-- SECURITY DEFINER RPC for retroactive updates
CREATE OR REPLACE FUNCTION recalculate_components_with_template(
  target_project_id uuid,
  target_component_type text
)
RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE components
  SET percent_complete = calculate_component_percent(id),
      updated_at = now()
  WHERE project_id = target_project_id
    AND component_type = target_component_type;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Frontend shows loading spinner during RPC call (2-3 seconds for 1,000 components).

**Alternatives Considered**:
1. **Asynchronous job queue** (e.g., pg_cron, Supabase Edge Function)
   - **Pro**: UI doesn't block, scales to millions of components
   - **Con**: Complexity (job status polling, notification delivery, error handling), user doesn't see immediate results
   - **Rejected**: Over-engineered for stated scale (100-10,000 components per success criteria)

2. **Optimistic UI update** (fake recalculation, real update in background)
   - **Rejected**: Misleading (user sees incorrect percentages until background job completes)

---

### Q4: How should concurrent edits be handled?

**Decision**: Optimistic locking via `updated_at` timestamp check

**Rationale**:
- **Low contention**: <10 concurrent template editors (per technical context)
- **Simple implementation**: Check `updated_at` hasn't changed since modal opened, reject stale updates
- **Clear error message**: "Templates were modified by another user. Refresh and try again."
- **No deadlocks**: No row-level locks held during user think time

**Implementation**:
```typescript
// Client stores timestamp when modal opens
const { data: templates, refetch } = useQuery({
  queryKey: ['projectTemplates', projectId, componentType],
  select: (data) => ({
    templates: data.templates,
    loadedAt: data.templates[0]?.updated_at // Track when data was fetched
  })
});

// Server RPC checks timestamp before update
CREATE OR REPLACE FUNCTION update_project_template_weights(
  p_project_id uuid,
  p_component_type text,
  p_new_weights jsonb,
  p_last_updated timestamptz
)
RETURNS json AS $$
BEGIN
  -- Optimistic lock check
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = p_project_id
      AND component_type = p_component_type
      AND updated_at > p_last_updated
  ) THEN
    RAISE EXCEPTION 'Templates were modified by another user';
  END IF;

  -- Proceed with update...
END;
$$ LANGUAGE plpgsql;
```

**Alternatives Considered**:
1. **Pessimistic locking** (SELECT FOR UPDATE)
   - **Rejected**: Holds database locks during user think time, risk of deadlocks/timeouts

2. **Last-write-wins** (no conflict detection)
   - **Rejected**: Silent data loss (second user overwrites first user's changes)

3. **Operational transformation** (merge conflicting changes)
   - **Rejected**: Complex, overkill for low-contention admin UI

---

### Q5: What permissions should control template editing?

**Decision**: Admin and Project Manager roles (existing role system)

**Rationale**:
- **Reuses existing roles**: `admin` and `project_manager` already defined in `user_roles` table
- **Aligns with organizational hierarchy**: Only users who manage projects should modify progress calculation rules
- **Consistent with other settings**: Team management, project metadata also restricted to admin/PM
- **RLS enforcement**: `organization_members.role IN ('admin', 'project_manager')` in policies

**Implementation**:
```sql
-- RLS policy for UPDATE on project_progress_templates
CREATE POLICY "Project admins and managers can update templates"
ON project_progress_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.organization_id = om.organization_id
    WHERE p.id = project_progress_templates.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'project_manager')
  )
);
```

Frontend hides Settings navigation link and Edit buttons for users without permissions.

**Alternatives Considered**:
1. **Separate "template_editor" permission**
   - **Rejected**: Adds complexity to permission system for minimal benefit (admins/PMs are appropriate gatekeepers)

2. **Project owner only**
   - **Rejected**: Too restrictive (project managers need this capability for operational flexibility)

3. **All project members**
   - **Rejected**: Too permissive (field engineers shouldn't modify calculation rules)

---

### Q6: How should audit logging capture template changes?

**Decision**: Dedicated audit table with JSONB old/new weights

**Rationale**:
- **Complete history**: Every change logged with user, timestamp, before/after state
- **Debugging**: Trace unexpected progress percentage changes back to template modifications
- **Accountability**: Satisfies user story P4 (view audit trail)
- **Efficient queries**: Separate table avoids bloating `project_progress_templates` with history columns

**Implementation**:
```sql
CREATE TABLE project_template_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  changed_by uuid REFERENCES users(id),
  old_weights jsonb NOT NULL, -- e.g., [{"milestone":"Weld Made","weight":60}, ...]
  new_weights jsonb NOT NULL,
  applied_to_existing boolean NOT NULL,
  affected_component_count integer NOT NULL,
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_template_changes_project
ON project_template_changes(project_id, component_type, changed_at DESC);
```

Trigger on `project_progress_templates` UPDATE captures old/new state automatically.

**Alternatives Considered**:
1. **Event sourcing** (store all events, rebuild state)
   - **Rejected**: Over-engineered (audit log is read-only reporting, not source of truth)

2. **History columns in main table** (e.g., `previous_weight`, `last_modified_by`)
   - **Rejected**: Limited history depth (only tracks last change), complicates main table schema

3. **PostgreSQL audit triggers** (generic audit table for all tables)
   - **Rejected**: Less discoverable, requires JSONB parsing for reporting

---

### Q7: How should the UI indicate affected component count?

**Decision**: Real-time count query on modal open

**Rationale**:
- **Transparency**: User sees impact before confirming changes ("This affects 234 components")
- **Simple query**: `SELECT COUNT(*) FROM components WHERE project_id = ? AND component_type = ?`
- **Performance**: Negligible overhead (<10ms for 10,000 components with indexed query)
- **Accuracy**: Count reflects current state when user opens editor

**Implementation**:
```typescript
// Hook fetches affected count when editor opens
const { data: affectedCount } = useQuery({
  queryKey: ['affectedComponentCount', projectId, componentType],
  queryFn: async () => {
    const { count } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('component_type', componentType);
    return count ?? 0;
  }
});
```

Display in modal: "⚠️ This affects {affectedCount} existing components"

**Alternatives Considered**:
1. **Cached count** (updated by trigger on components table)
   - **Rejected**: Adds complexity (trigger maintenance), stale data risk if trigger fails

2. **No count display** (just show checkbox without count)
   - **Rejected**: Poor UX (user doesn't know impact of their action)

---

## Technology Stack Decisions

### Frontend

**React 18.3 + TypeScript 5.x (strict mode)**
- Already established in codebase
- Strict mode catches type errors at compile time (prevents runtime bugs)

**TanStack Query v5**
- Server state management for template queries/mutations
- Automatic cache invalidation and refetching
- Optimistic updates support

**react-hook-form + Zod**
- Form state management with validation
- Type-safe schema validation
- Error handling with field-level feedback

**Radix UI (Dialog, Tabs)**
- Accessible primitives (WCAG 2.1 AA compliant)
- Unstyled components (customized with Tailwind)
- Already in use for other modals/dialogs

**Tailwind CSS v4**
- Utility-first styling
- Responsive design utilities (desktop-only via min-width breakpoint)

### Backend

**PostgreSQL (Supabase remote)**
- Relational database with JSONB support (for old/new weights in audit table)
- Triggers for validation and audit logging
- RLS for multi-tenant security

**Supabase RPC Functions (SECURITY DEFINER)**
- Template cloning, weight updates, recalculation
- Bypass RLS for privileged operations (with permission checks inside function)

### Testing

**Vitest + Testing Library**
- Unit tests for components (colocated `.test.tsx` files)
- Integration tests for RLS policies and workflows (`tests/integration/`)
- ≥70% coverage target

---

## Performance Considerations

### Database Indexes

```sql
-- Fast lookup for component type templates
CREATE INDEX idx_project_templates_lookup
ON project_progress_templates(project_id, component_type);

-- Efficient audit log queries
CREATE INDEX idx_template_changes_project
ON project_template_changes(project_id, component_type, changed_at DESC);

-- Recalculation query optimization
CREATE INDEX idx_components_type_project
ON components(project_id, component_type);
```

### Query Optimization

- `calculate_component_percent()` modified to check `project_progress_templates` FIRST (project-specific weights), fall back to `progress_templates` only if NULL
- Single table scan (no JOIN) for template lookup
- Batch UPDATE for recalculation (single transaction)

### Frontend Optimization

- Debounce weight input changes (100ms) to avoid excessive re-renders
- TanStack Query caching (templates fetched once per session)
- Optimistic UI updates (show changes immediately, rollback on error)

---

## Security Considerations

### RLS Policies

All tables enforce multi-tenant isolation:

```sql
-- project_progress_templates: Project members can read, admins/PMs can write
CREATE POLICY "Project members can view templates"
ON project_progress_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.organization_id = om.organization_id
    WHERE p.id = project_progress_templates.project_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Project admins and managers can update templates"
ON project_progress_templates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.organization_id = om.organization_id
    WHERE p.id = project_progress_templates.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'project_manager')
  )
);
```

### Validation

- **Client**: react-hook-form + Zod (UX layer)
- **Server**: CHECK constraints + triggers (security layer)
- **RPC**: SECURITY DEFINER functions verify permissions before execution

### Audit Trail

- All changes logged with `auth.uid()` (captures who made the change)
- Immutable audit table (INSERT only, no UPDATE/DELETE)
- Retained indefinitely for compliance

---

## Migration Strategy

### Database Migrations (7 total)

1. **00085_project_progress_templates.sql**: Create table with constraints
2. **00086_template_validation.sql**: Add weight sum = 100% trigger
3. **00087_template_audit.sql**: Create audit table + insert trigger
4. **00088_clone_templates_rpc.sql**: Manual cloning RPC for existing projects
5. **00089_auto_clone_templates_trigger.sql**: Auto-clone on project creation
6. **00090_update_calculate_percent.sql**: Modify function to check project templates first
7. **00091_template_rls_policies.sql**: Add RLS policies for all operations

### Backward Compatibility

- Existing projects without `project_progress_templates` rows continue using `progress_templates` (fallback logic in `calculate_component_percent`)
- No breaking changes to existing API
- Opt-in via UI ("Clone Templates" button)

### Rollout Plan

1. **Phase 1**: Deploy migrations (non-breaking, fallback logic preserves existing behavior)
2. **Phase 2**: Deploy frontend behind feature flag `ENABLE_TEMPLATE_EDITING` (disabled by default)
3. **Phase 3**: Enable for pilot projects (5-10 projects), monitor for issues
4. **Phase 4**: Enable for all users, remove feature flag

### Rollback Strategy

- **Immediate (frontend only)**: Set `ENABLE_TEMPLATE_EDITING=false` (hides UI)
- **Full (if database issues)**: Revert `calculate_component_percent` to original version, drop RLS policies, preserve audit table for forensics

---

## Open Questions

**None** - All research questions resolved. Ready for Phase 1 (data model & contracts).
