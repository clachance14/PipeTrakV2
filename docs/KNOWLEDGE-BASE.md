# PipeTrak V2 Knowledge Base

Architecture patterns, critical migrations, feature dependencies, and development workflows for PipeTrak V2.

**Related Documentation**: See [GLOSSARY.md](./GLOSSARY.md) for term definitions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Patterns](#database-patterns)
3. [Frontend Patterns](#frontend-patterns)
4. [Critical Migrations](#critical-migrations)
5. [Feature Dependencies](#feature-dependencies)
6. [Development Workflows](#development-workflows)

---

## Architecture Overview

### Single-Organization Model

**Decision Date**: Sprint 0 (Migration 00008)

**Architecture**: Each user belongs to exactly one organization. Components, projects, drawings, and all other entities are scoped to a single organization via `organization_id` foreign key.

**Rationale**:
- Simplifies RLS policies (no junction table queries)
- Matches business model (construction companies work within single org)
- Eliminates complex multi-tenant switching UI
- Reduces query complexity and improves performance

**Breaking Change**: Migration 00008 removed `user_organizations` junction table and added direct `organization_id` column to `users` table.

**Impact on RLS**:
```sql
-- Simple organization-scoped policy
CREATE POLICY "users_view_own_org_components"
ON components FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

**Trade-off**: Users who need access to multiple organizations must have separate accounts per organization.

See also: [GLOSSARY.md - Organization Terms](./GLOSSARY.md#user-roles--permissions)

---

### RLS-Based Security Model

**Foundation**: Row Level Security (RLS) enforces all data access control at the PostgreSQL level.

**Key Principles**:
1. **Server-side enforcement**: Client permission checks are for UX only; RLS is the security boundary
2. **Organization isolation**: Every table has `organization_id` and RLS policies prevent cross-org access
3. **Project-scoped access**: Components/drawings/packages inherit organization from parent project
4. **Role-based permissions**: RLS policies check user role via `get_user_org_role()` function

**Policy Template**:
```sql
-- SELECT: Users can view data in their organization
CREATE POLICY "{table}_select_own_org"
ON {table} FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- INSERT: Users can create data in their organization
CREATE POLICY "{table}_insert_own_org"
ON {table} FOR INSERT
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- UPDATE: Users can update data in their organization (role-based)
CREATE POLICY "{table}_update_own_org"
ON {table} FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND get_user_org_role(auth.uid()) IN ('owner', 'admin', 'project_manager')
);

-- DELETE: Only owners and admins can delete
CREATE POLICY "{table}_delete_own_org"
ON {table} FOR DELETE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND get_user_org_role(auth.uid()) IN ('owner', 'admin')
);
```

**Documentation**: See [docs/security/RLS-RULES.md](./security/RLS-RULES.md) for comprehensive patterns and [docs/security/RLS-AUDIT-CHECKLIST.md](./security/RLS-AUDIT-CHECKLIST.md) for quick reference.

---

### TanStack Query State Management

**Pattern**: Server state managed exclusively through TanStack Query v5. No global state for server data.

**Hook Structure**:
```
src/hooks/
├── useComponents.ts       # Query: List components for project
├── useComponent.ts        # Query: Single component details
├── useUpdateComponent.ts  # Mutation: Update component
├── useDeleteComponent.ts  # Mutation: Delete component
└── ...
```

**Query Key Conventions**: See [Frontend Patterns - TanStack Query Conventions](#tanstack-query-conventions)

**Benefits**:
- Automatic background refetching
- Optimistic updates with rollback
- Built-in loading/error states
- Request deduplication
- Cache invalidation patterns

**Trade-off**: Client state (UI state, form state) still requires Zustand or React Context.

---

### Mobile-First Responsive Design

**Breakpoint Standard**: `≤1024px` = mobile/tablet, `>1024px` = desktop

**Touch Target Standard**: Minimum 44px (WCAG 2.1 AA), actual implementation 32-48px depending on context

**Layout Pattern**:
```tsx
{/* Desktop: Full-featured table with 7+ columns */}
<div className="hidden lg:block">
  <table>
    <thead>
      <tr>
        <th>Component ID</th>
        <th>Drawing</th>
        <th>Type</th>
        <th>Size</th>
        <th>Budget</th>
        <th>Receive</th>
        <th>Install</th>
        {/* ... more milestones */}
      </tr>
    </thead>
    {/* ... */}
  </table>
</div>

{/* Mobile: Simplified 3-column table or card layout */}
<div className="lg:hidden">
  <table>
    <thead>
      <tr>
        <th>Component</th>
        <th>Drawing</th>
        <th>Progress</th>
      </tr>
    </thead>
    {/* Click row to open detail modal */}
  </table>
</div>
```

**Mobile-Specific Optimizations**:
- `font-size: 16px` minimum for inputs (prevents iOS zoom)
- `inputMode="numeric"` for number inputs (auto-opens numeric keyboard)
- Dropdown selectors replace tabs at mobile breakpoint
- Modal-based detail views instead of inline expansion
- Vertical layouts for forms and filters

**Established By**: Feature 015 (Mobile Milestone Updates), refined in Features 019, 022, 025

See also: [docs/plans/2025-11-06-design-rules.md](./plans/2025-11-06-design-rules.md#mobile-responsive-patterns)

---

## Database Patterns

### SECURITY DEFINER Functions

**Purpose**: Bypass RLS policies to prevent infinite recursion when policies need to query RLS-protected tables.

**When to Use**:
1. Role checking functions (querying `users` table from within RLS policy)
2. Organization lookup functions (querying `users` or `organizations` from policies)
3. Cross-table validation (e.g., invitation acceptance requires updating multiple tables)

**Security Requirements**:
- MUST validate all inputs (function runs with owner privileges)
- MUST set `search_path = public` to prevent search path attacks
- MUST be as minimal as possible (limit attack surface)
- SHOULD be thoroughly tested for SQL injection vulnerabilities

**Example Pattern**:
```sql
CREATE OR REPLACE FUNCTION get_user_org_role(user_id UUID)
RETURNS TEXT
SECURITY DEFINER  -- Bypasses RLS
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM users WHERE id = user_id;
$$;
```

**Common SECURITY DEFINER Functions**:
- `get_user_org_role(user_id)` - Returns user's role without RLS
- `is_super_admin(user_id)` - Checks super admin status
- `accept_invitation_for_user(invitation_id)` - Assigns org/role during signup
- `check_email_has_organization(email)` - Validates email for invitations

**Migration Example**: See Migration 00049 (`accept_invitation_for_user` implementation)

**Documentation**: [docs/security/RLS-RULES.md#security-definer-functions](./security/RLS-RULES.md)

See also: [GLOSSARY.md - SECURITY DEFINER](./GLOSSARY.md#security-definer)

---

### RLS Policy Patterns

#### Organization-Scoped Isolation

**Pattern**: Restrict access to rows in user's organization only.

```sql
CREATE POLICY "components_select_own_org"
ON components FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

**Use Cases**: All top-level entities (projects, test packages, areas, systems, welders)

---

#### Project-Scoped Isolation

**Pattern**: Restrict access to rows belonging to projects in user's organization.

```sql
CREATE POLICY "components_select_own_org_projects"
ON components FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);
```

**Use Cases**: Components, drawings, field welds (entities that belong to projects)

**Trade-off**: More complex than organization-scoped, but allows project-level isolation if needed in future.

---

#### Role-Based Modification

**Pattern**: Allow data modification only for specific roles.

```sql
CREATE POLICY "components_update_by_role"
ON components FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  AND get_user_org_role(auth.uid()) IN ('owner', 'admin', 'project_manager', 'foreman')
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);
```

**Roles Hierarchy** (most → least privileged):
1. `owner` - Full control
2. `admin` - Nearly full control (cannot delete org)
3. `project_manager` - Manage projects and components
4. `foreman` - Update milestones, assign welders
5. `qc_inspector` - Record NDE results
6. `welder` - View assigned work
7. `viewer` - Read-only

**Permission Functions** (client-side, for UX only):
```typescript
// src/lib/permissions.ts
export const canManageTeam = (role: string) =>
  ['owner', 'admin'].includes(role);

export const canManageProjects = (role: string) =>
  ['owner', 'admin', 'project_manager'].includes(role);

export const canUpdateMilestones = (role: string) =>
  ['owner', 'admin', 'project_manager', 'foreman'].includes(role);
```

---

#### Last-Owner Protection

**Pattern**: Prevent removing or demoting the last owner in an organization.

```sql
CREATE OR REPLACE FUNCTION prevent_last_owner_removal()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'owner' AND (
    SELECT COUNT(*) FROM users
    WHERE organization_id = OLD.organization_id
    AND role = 'owner'
    AND id != OLD.id
  ) = 0 THEN
    RAISE EXCEPTION 'Cannot remove or change role of last owner';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_last_owner_protection
BEFORE UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_last_owner_removal();
```

**Implemented In**: Migration 00049 (Team Management feature)

---

### JSONB Milestone Storage

**Schema**: `components.current_milestones` is a JSONB field storing milestone values.

**Format**:
```json
{
  "Budget": 1,        // Discrete milestone (0 or 1)
  "Receive": 1,       // Discrete milestone
  "Install": 0.75,    // Partial milestone (0-100% as decimal 0.0-1.0)
  "Tested": 0,        // Not started
  "Punch": 0,
  "Restore": 0
}
```

**CRITICAL**: Always use **numeric values** (`0`, `1`, `0.75`), NEVER boolean (`true`, `false`).

**Why**: Migration 00084 fixed critical bug where boolean values caused 400 errors in RPC functions expecting numeric types.

**Database Functions Expect Numeric**:
```sql
-- update_component_milestone RPC
CREATE FUNCTION update_component_milestone(
  p_component_id UUID,
  p_milestone_name TEXT,
  p_milestone_value NUMERIC  -- Expects 0-1 (not boolean!)
)
...
```

**TypeScript Typing**:
```typescript
// Correct
type MilestoneValues = {
  [key: string]: number;  // 0-1 for discrete, 0-100 for partial
};

// Incorrect (legacy, causes bugs)
type MilestoneValues = {
  [key: string]: boolean | number;
};
```

**Updating Milestones**:
```typescript
// Correct
await updateMilestone({
  componentId: '...',
  milestoneName: 'Receive',
  milestoneValue: 1  // Numeric 1, not boolean true
});

// Incorrect (will cause 400 error)
await updateMilestone({
  componentId: '...',
  milestoneName: 'Receive',
  milestoneValue: true  // WRONG!
});
```

**Migration Reference**: See Migration 00084 (`convert_boolean_milestones_to_numeric.sql`)

---

## Frontend Patterns

### TanStack Query Conventions

#### Query Key Structure

**Entity List**:
```typescript
['projects', projectId, 'components']
['projects', projectId, 'components', { search: 'valve', status: 'active' }]
```

**Single Entity**:
```typescript
['components', componentId]
['field_welds', fieldWeldId]
```

**Nested Relationships**:
```typescript
['components', componentId, 'milestone_events']
['drawings', drawingId, 'components']
```

**Benefits**:
- Automatic cache scoping (invalidate all components for project)
- Predictable cache keys (easy to debug with React Query DevTools)
- Filter parameters in key ensure separate cache entries

---

#### Cache Invalidation Patterns

**After Mutation (Invalidate Specific Entity)**:
```typescript
const updateComponent = useMutation({
  mutationFn: (data) => supabase.from('components').update(data),
  onSuccess: (data, variables) => {
    // Invalidate single component
    queryClient.invalidateQueries({
      queryKey: ['components', variables.id]
    });

    // Invalidate component list for project
    queryClient.invalidateQueries({
      queryKey: ['projects', projectId, 'components']
    });
  }
});
```

**After Bulk Update (Invalidate All)**:
```typescript
const bulkUpdateComponents = useMutation({
  mutationFn: (componentIds) => { /* ... */ },
  onSuccess: () => {
    // Invalidate all component queries (list and individual)
    queryClient.invalidateQueries({
      queryKey: ['components']
    });

    // Alternative: Invalidate specific project only
    queryClient.invalidateQueries({
      queryKey: ['projects', projectId]
    });
  }
});
```

**Realtime Subscription (Optimistic Update)**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('components-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'components',
      filter: `project_id=eq.${projectId}`
    }, (payload) => {
      // Optimistically update cache
      queryClient.setQueryData(
        ['components', payload.new.id],
        payload.new
      );

      // Invalidate list to refetch with new data
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'components']
      });
    })
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [projectId]);
```

See also: [GLOSSARY.md - Cache Invalidation](./GLOSSARY.md#cache-invalidation)

---

### Permission-Gated UI Components

**Pattern**: Check permissions client-side for UX, rely on RLS for security.

**Permission Check Hook**:
```typescript
// src/hooks/usePermissions.ts
import { useAuth } from '@/contexts/AuthContext';
import { canManageTeam, canUpdateMilestones } from '@/lib/permissions';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    canManageTeam: canManageTeam(user?.role ?? 'viewer'),
    canManageProjects: canManageProjects(user?.role ?? 'viewer'),
    canUpdateMilestones: canUpdateMilestones(user?.role ?? 'viewer'),
    // ... other permission checks
  };
};
```

**Conditional Rendering**:
```tsx
const { canManageTeam } = usePermissions();

return (
  <div>
    {canManageTeam && (
      <Button onClick={handleInviteMember}>
        Invite Team Member
      </Button>
    )}

    <Button
      onClick={handleUpdateMilestone}
      disabled={!canUpdateMilestones}
      className={!canUpdateMilestones ? 'cursor-not-allowed opacity-50' : ''}
      title={!canUpdateMilestones ? 'Insufficient permissions' : undefined}
    >
      Update Milestone
    </Button>
  </div>
);
```

**Security Note**: Client checks are for UX only. RLS policies enforce actual security:
- User with viewer role can modify React DevTools to enable button
- RLS policy will still reject the mutation
- Client sees 403 error, UI shows toast notification

**Best Practice**: Always show helpful error messages when RLS blocks an action:
```typescript
const updateMilestone = useMutation({
  mutationFn: (data) => supabase.from('components').update(data),
  onError: (error) => {
    if (error.code === 'PGRST301') {  // RLS policy violation
      toast.error('You do not have permission to update milestones');
    } else {
      toast.error('Failed to update milestone');
    }
  }
});
```

---

### Mobile Responsiveness Patterns

**Breakpoint Convention**: `≤1024px` = mobile, `>1024px` = desktop (uses Tailwind `lg:` prefix)

**Touch Target Convention**: Minimum 44px (WCAG 2.1 AA)

---

#### Desktop vs. Mobile Layouts

**Full Table (Desktop) → Simplified Table (Mobile)**:
```tsx
{/* Desktop: 7+ columns with inline editing */}
<div className="hidden lg:block">
  <table>
    <thead>
      <tr>
        <th>Component ID</th>
        <th>Drawing</th>
        <th>Type</th>
        <th>Size</th>
        <th>Budget</th>
        <th>Receive</th>
        <th>Install</th>
      </tr>
    </thead>
    <tbody>
      {components.map(c => (
        <tr key={c.id}>
          <td>{c.id}</td>
          <td>{c.drawing}</td>
          <td>{c.type}</td>
          <td>{c.size}</td>
          <td><Checkbox checked={c.budget} /></td>
          <td><Slider value={c.receive} /></td>
          <td><Slider value={c.install} /></td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{/* Mobile: 3 columns + row click for details */}
<div className="lg:hidden">
  <table>
    <thead>
      <tr>
        <th>Component</th>
        <th>Drawing</th>
        <th>Progress</th>
      </tr>
    </thead>
    <tbody>
      {components.map(c => (
        <tr
          key={c.id}
          onClick={() => openDetailModal(c)}
          className="cursor-pointer hover:bg-gray-50"
        >
          <td>{c.id}</td>
          <td>{c.drawing}</td>
          <td>{c.percentComplete}%</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Tabs (Desktop) → Dropdown Selector (Mobile)**:
```tsx
{/* Desktop: Horizontal tabs */}
<div className="hidden lg:flex space-x-2 border-b">
  <button
    onClick={() => setTab('overview')}
    className={`px-4 py-2 ${tab === 'overview' ? 'border-b-2 border-blue-600' : ''}`}
  >
    Overview
  </button>
  <button
    onClick={() => setTab('details')}
    className={`px-4 py-2 ${tab === 'details' ? 'border-b-2 border-blue-600' : ''}`}
  >
    Details
  </button>
  {/* ... more tabs */}
</div>

{/* Mobile: Dropdown selector */}
<select
  className="lg:hidden w-full p-2 border rounded"
  value={tab}
  onChange={(e) => setTab(e.target.value)}
>
  <option value="overview">Overview</option>
  <option value="details">Details</option>
  {/* ... more options */}
</select>
```

---

#### Mobile Input Optimizations

**Prevent iOS Zoom (16px minimum font size)**:
```tsx
<input
  type="text"
  className="text-base"  // Tailwind: 16px (not text-sm which is 14px)
  style={{ fontSize: '16px' }}  // Explicit override if needed
/>
```

**Numeric Keyboard Auto-Open**:
```tsx
<input
  type="text"
  inputMode="numeric"  // Opens numeric keyboard on mobile
  pattern="[0-9]*"     // iOS: Forces numeric keyboard
  value={value}
  onChange={handleChange}
/>
```

**Touch-Friendly Spacing**:
```tsx
<div className="space-y-4">  {/* 16px vertical spacing */}
  <button className="w-full h-12 text-base">  {/* 48px height */}
    Submit
  </button>
  <button className="w-full h-12 text-base">
    Cancel
  </button>
</div>
```

---

#### Feature 025 Pattern: Inline Numeric Inputs

**Context**: Feature 025 replaced slider-based popover editors with inline numeric inputs for threaded pipe partial milestones.

**Benefits**:
- 50% faster workflow (4-5 steps → 2 steps)
- Better mobile UX (direct input vs. slider dragging)
- Keyboard navigation (Tab between inputs, Enter saves)
- Visual validation (red border + shake animation on error)

**Pattern**:
```tsx
const [value, setValue] = useState(currentValue);
const [error, setError] = useState(false);

const handleSave = async () => {
  if (value < 0 || value > 100) {
    setError(true);
    toast.error('Value must be 0-100');

    // Auto-revert after 2 seconds
    setTimeout(() => {
      setValue(currentValue);
      setError(false);
    }, 2000);

    return;
  }

  await updateMilestone({ value: value / 100 });  // Convert to 0-1
};

return (
  <input
    type="text"
    inputMode="numeric"
    value={value}
    onChange={(e) => setValue(Number(e.target.value))}
    onBlur={handleSave}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        handleSave();
        // Focus next input
        e.currentTarget.nextElementSibling?.focus();
      }
      if (e.key === 'Escape') {
        setValue(currentValue);
        e.currentTarget.blur();
      }
    }}
    className={`
      w-16 h-12 text-base text-center border rounded
      ${error ? 'border-red-500 animate-shake' : 'border-gray-300'}
    `}
    aria-label={`${milestoneName} percentage`}
    aria-valuenow={value}
    aria-invalid={error}
  />
);
```

**Accessibility**:
- `aria-label` for screen readers
- `aria-valuenow` for current value announcement
- `aria-invalid` for error state
- `role="spinbutton"` for numeric input semantics

**Documentation**: [specs/025-threaded-pipe-inline-input/](../specs/025-threaded-pipe-inline-input/)

---

### Component Architecture Patterns

**Hierarchy**: Page → Container → Presentational

**Page Component** (Route handler):
```tsx
// src/pages/ComponentsPage.tsx
export const ComponentsPage = () => {
  return (
    <Layout>
      <ComponentsContainer />
    </Layout>
  );
};
```

**Container Component** (Data fetching, state management):
```tsx
// src/components/ComponentsContainer.tsx
export const ComponentsContainer = () => {
  const { data: components, isLoading } = useComponents(projectId);
  const [filters, setFilters] = useState({});
  const [selectedComponent, setSelectedComponent] = useState(null);

  if (isLoading) return <LoadingSpinner />;

  return (
    <ComponentsTable
      components={components}
      filters={filters}
      onFilterChange={setFilters}
      onSelectComponent={setSelectedComponent}
    />
  );
};
```

**Presentational Component** (Pure UI):
```tsx
// src/components/ComponentsTable.tsx
interface ComponentsTableProps {
  components: Component[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSelectComponent: (component: Component) => void;
}

export const ComponentsTable = ({
  components,
  filters,
  onFilterChange,
  onSelectComponent
}: ComponentsTableProps) => {
  return (
    <table>
      {/* Pure rendering logic, no data fetching */}
    </table>
  );
};
```

**Benefits**:
- Easier testing (presentational components have simple props)
- Clear separation of concerns (data vs. UI)
- Reusable presentational components
- Simpler debugging (data issues vs. rendering issues)

---

## Critical Migrations

### Migration 00008: Single-Org Refactor

**Date**: Sprint 0 (Early project)

**Breaking Change**: YES

**What Changed**:
- Removed `user_organizations` junction table
- Added `organization_id` column directly to `users` table
- Simplified RLS policies (no more junction table joins)

**Why Critical**:
- **Architecture baseline** for all subsequent features
- All RLS policies assume single-org model
- Cannot easily revert without breaking all features built on top

**Migration Path** (if needed to restore multi-org):
1. Create new `user_organizations` junction table
2. Migrate existing `users.organization_id` to junction table
3. Update all RLS policies to use junction table
4. Update all queries to include organization context
5. Add org-switching UI

**Estimated Effort**: 2-3 weeks (40+ RLS policies to update)

---

### Migration 00037-00049: Invitation Flow (13 Migrations)

**Date**: 2025-10-26 to 2025-10-27 (Feature 016)

**Why 13 Migrations**: Iterative debugging of email confirmation flow

**The Problem**:
- New users accepted invitation email → confirmed email → logged in
- But `users.organization_id` and `users.role` were still NULL
- RLS policies blocked access (user had no org)
- Users stuck on "No organization found" screen

**Root Cause**: Supabase Auth creates user record BEFORE email confirmation, but custom user fields (`organization_id`, `role`) were only set in trigger that fired AFTER signup.

**The Solution (Migration 00049)**:
```sql
-- SECURITY DEFINER function to bypass RLS during invitation acceptance
CREATE OR REPLACE FUNCTION accept_invitation_for_user(invitation_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = invitation_id
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Assign organization and role IMMEDIATELY (bypasses RLS)
  UPDATE users
  SET
    organization_id = v_invitation.organization_id,
    role = v_invitation.role
  WHERE id = auth.uid();

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_id;
END;
$$ LANGUAGE plpgsql;
```

**Why SECURITY DEFINER**: RLS policies on `users` table would block the UPDATE (user has no org yet). SECURITY DEFINER bypasses RLS to allow immediate org/role assignment.

**Flow After Fix**:
1. User clicks invitation link
2. Signs up / confirms email
3. Client calls `accept_invitation_for_user(invitation_id)`
4. Function assigns org/role immediately
5. User redirected to dashboard (RLS now allows access)

**Documentation**: [specs/016-team-management-ui/IMPLEMENTATION-NOTES.md](../specs/016-team-management-ui/IMPLEMENTATION-NOTES.md)

**Key Learning**: Email confirmation creates edge case for RLS. Use SECURITY DEFINER for setup operations that need to bypass RLS temporarily.

---

### Migration 00057: Earned Milestone Value Function

**Date**: 2025-10-28 (Feature 019 - Weekly Progress Reports)

**Purpose**: Calculate weighted progress for components based on milestone importance.

**Formula**:
```sql
CREATE OR REPLACE FUNCTION calculate_earned_milestone_value(
  component_type TEXT,
  milestones JSONB
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_weight NUMERIC := 0;
  earned_value NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  -- Iterate over progress template for component type
  FOR milestone_record IN
    SELECT milestone_name, weight
    FROM progress_templates
    WHERE template_name = component_type
  LOOP
    total_weight := total_weight + milestone_record.weight;

    -- Get milestone value from JSONB (0-1 for discrete, 0-100 for partial)
    IF milestones ? milestone_record.milestone_name THEN
      earned_value := earned_value +
        (milestone_record.weight * (milestones->>milestone_record.milestone_name)::NUMERIC);
    END IF;
  END LOOP;

  -- Return percentage (0-100)
  IF total_weight > 0 THEN
    RETURN (earned_value / total_weight) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$;
```

**Example**:
```
Valve milestones:
- Budget: 10% weight, value = 1 (complete)
- Receive: 20% weight, value = 1 (complete)
- Install: 40% weight, value = 0 (not started)
- Tested: 30% weight, value = 0 (not started)

Earned value = (0.10*1 + 0.20*1 + 0.40*0 + 0.30*0) / 1.0 = 0.30 (30%)
```

**Why Critical**:
- Used in all progress reports and dashboards
- Provides accurate progress vs. simple milestone counting
- Reflects business value (Install more important than Budget)

**Used By**:
- Weekly progress reports (Feature 019)
- Dashboard metrics
- Package readiness calculations
- `vw_progress_by_area`, `vw_progress_by_system`, `vw_progress_by_test_package` views

---

### Migration 00067: Demo RLS Policies

**Date**: 2025-10-29 (Feature 021 - Public Homepage)

**Purpose**: Ensure demo users have isolated data (each demo gets unique organization).

**Interesting Insight**: NO special RLS policies needed!

**Why**: Existing organization-scoped RLS policies automatically enforce demo isolation:
1. Demo signup creates new organization for each demo user
2. User assigned to that organization
3. RLS policies filter all data by `organization_id`
4. Demo user can only see their own demo data

**The "Migration"**:
```sql
-- This migration intentionally left blank
-- Existing RLS policies on all tables already enforce organization isolation
-- Demo users are assigned unique organization_id, so they automatically
-- cannot access other users' data (including other demo users)

-- Confirmed: No additional RLS policies needed for demo isolation
```

**Additional Demo Features**:
- `users.is_demo_user` boolean flag (for cleanup automation)
- `users.demo_expires_at` timestamp (7-day access limit)
- `rate_limit_events` table (10/hour per IP, 3/day per email)
- pg_cron job for daily demo cleanup (2 AM UTC)

**Documentation**: [specs/021-public-homepage/](../specs/021-public-homepage/)

**Key Learning**: Good architecture compounds. Single-org + organization-scoped RLS gave us demo isolation "for free."

---

### Migration 00084: Convert Boolean Milestones to Numeric

**Date**: 2025-11-08

**Bug**: Welder assignment failing with 400 error: `invalid input syntax for type numeric: "true"`

**Root Cause**: Schema evolution inconsistency:
- Early features stored discrete milestones as booleans (`true`/`false`) in `current_milestones` JSONB
- Later RPC functions (`update_component_milestone`) expected numeric values (`1`/`0`)
- PostgreSQL cannot implicitly cast boolean to numeric

**Data Analysis**:
```sql
-- Found 28 components with boolean milestone values
SELECT id, current_milestones
FROM components
WHERE current_milestones::text LIKE '%true%'
   OR current_milestones::text LIKE '%false%';
```

**The Fix**:
```sql
-- Convert all boolean values to numeric (true→1, false→0)
UPDATE components
SET current_milestones = (
  SELECT jsonb_object_agg(
    key,
    CASE
      WHEN value::text = 'true' THEN '1'::jsonb
      WHEN value::text = 'false' THEN '0'::jsonb
      ELSE value
    END
  )
  FROM jsonb_each(current_milestones)
)
WHERE current_milestones::text LIKE '%true%'
   OR current_milestones::text LIKE '%false%';
```

**Affected Components**: 28 field weld components and other component types with discrete milestones

**Lesson**: TypeScript types don't enforce JSONB structure. Document JSONB schemas explicitly and validate at boundaries.

**Prevention**:
```typescript
// Add runtime validation at mutation boundaries
const updateMilestone = useMutation({
  mutationFn: async (data) => {
    // Validate numeric value before sending to DB
    if (typeof data.milestoneValue !== 'number') {
      throw new Error('Milestone value must be numeric');
    }

    return supabase.rpc('update_component_milestone', {
      p_milestone_value: data.milestoneValue  // Guaranteed numeric
    });
  }
});
```

**Documentation**: See BUG-FIXES.md for complete debugging timeline

---

## Feature Dependencies

### Dependency Graph

```
Foundation Layer (No dependencies)
├── 001-005: Initial setup (auth, database, single-org refactor)
├── 009: CSV Material Takeoff Import
└── 016: Team Management UI

Core Features Layer (Depends on foundation)
├── 010: Drawing-Centered Component Table
│   └── Depends on: 009 (component data)
├── 011: Metadata Assignment UI
│   └── Depends on: 010 (drawing table), 009 (components)
└── 015: Mobile Milestone Updates & Field Weld Management
    └── Depends on: 010 (milestone UI), new field_welds table

Enhancement Layer (Builds on core)
├── 019: Weekly Progress Reports
│   └── Depends on: 011 (metadata groupings), earned value calculation
├── 022: Weld Log Mobile
│   └── Depends on: 015 (field_welds table)
└── 025: Threaded Pipe Inline Input
    └── Depends on: 010 (milestone UI), enhances partial milestone editing

Standalone Features (Independent)
├── 017: User Profile Management (only depends on auth)
├── 018: Activity Feed (depends on audit_log table)
├── 021: Public Homepage (depends on auth, demo system)
└── 023: Demo Data Population (supports 021)
```

---

### Cross-Cutting Dependencies

#### RLS System
**Every feature** depends on RLS policies (single-org architecture from Migration 00008).

**Critical migrations**:
- Migration 00008: Single-org refactor
- Migration 00049: SECURITY DEFINER for invitation acceptance
- Migration 00067: Demo isolation (leverages existing RLS)

**Files**:
- `docs/security/RLS-RULES.md` - Policy patterns
- `docs/security/RLS-AUDIT-CHECKLIST.md` - Quick reference
- All `supabase/migrations/*_rls_policies.sql` files

---

#### Mobile Responsiveness
**Established by**: Feature 015

**Followed by**: Features 019, 022, 025

**Standard**:
- Breakpoint: `≤1024px` (mobile) vs. `>1024px` (desktop)
- Touch targets: ≥44px (WCAG 2.1 AA)
- Font size: ≥16px for inputs (prevents iOS zoom)
- Input mode: `numeric` for number inputs

**Documentation**: [docs/plans/2025-11-06-design-rules.md#mobile-responsive-patterns](./plans/2025-11-06-design-rules.md)

---

#### TanStack Query
**Used by**: All data-fetching features

**Conventions**:
- Query keys: `['entity', id]` or `['projects', projectId, 'entities']`
- Cache invalidation after mutations
- Optimistic updates for perceived performance

**Files**:
- `src/hooks/use*.ts` - 78 custom TanStack Query hooks
- Query Client config: `src/main.tsx`

---

### Integration Points

#### Feature 010 → Feature 011
**Integration**: Metadata assignment UI enhances drawing table from Feature 010

**Shared code**:
- Drawing table component
- Component selection logic
- Bulk update mutations

**Files**:
- `src/components/DrawingTable.tsx` (from 010, enhanced in 011)
- `src/hooks/useUpdateDrawingMetadata.ts` (added in 011)

---

#### Feature 015 → Feature 022
**Integration**: Weld log mobile builds on field welds table from Feature 015

**Shared code**:
- `field_welds` table
- `useFieldWelds` hook
- Field weld detail modal

**Files**:
- `supabase/migrations/*_field_welds.sql` (created in 015)
- `src/hooks/useFieldWelds.ts` (created in 015, enhanced in 022)
- `src/components/WeldLogTable.tsx` (mobile view added in 022)

---

#### Feature 010 → Feature 025
**Integration**: Inline numeric inputs replace slider editors for partial milestones

**What changed**:
- Deleted: `PartialMilestoneEditor.tsx`, `MobilePartialMilestoneEditor.tsx`
- Added: Inline `<input type="text" inputMode="numeric">` in table cells
- Kept: Same mutation hooks (`useUpdateMilestone`)

**Benefits**:
- 50% faster workflow (4-5 steps → 2 steps)
- Better mobile UX (direct input vs. dragging slider)
- Zero database changes (pure UI refactor)

**Files**:
- `src/components/DrawingTable.tsx` (inline inputs added)
- Removed files documented in Feature 025 implementation notes

---

## Development Workflows

### TDD Workflow (MANDATORY)

**Principle III from Constitution v1.0.0**: All features require test-first development.

**RED → GREEN → REFACTOR cycle**:

1. **RED**: Write failing test first
```typescript
// ComponentDetailView.test.tsx
describe('ComponentDetailView', () => {
  it('displays component details when data loads', async () => {
    render(<ComponentDetailView componentId="test-id" />);

    // Test will fail (component not implemented yet)
    expect(await screen.findByText('Component Details')).toBeInTheDocument();
  });
});
```

2. **GREEN**: Implement minimum code to pass
```typescript
// ComponentDetailView.tsx
export const ComponentDetailView = ({ componentId }: Props) => {
  return <div>Component Details</div>;
};
```

3. **REFACTOR**: Improve while keeping tests green
```typescript
// ComponentDetailView.tsx
export const ComponentDetailView = ({ componentId }: Props) => {
  const { data: component, isLoading } = useComponent(componentId);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Component Details</h2>
      <pre>{JSON.stringify(component, null, 2)}</pre>
    </div>
  );
};
```

**Benefits**:
- Ensures tests actually verify behavior (must fail first)
- Prevents over-engineering (implement only what tests require)
- Documents expected behavior (tests as specification)

**Coverage Requirements**:
- Overall: ≥70%
- `src/lib/**`: ≥80% (utilities & business logic)
- `src/components/**`: ≥60% (UI components)

**CI Enforcement**: GitHub Actions fails build if coverage drops below threshold.

---

### Database Change Workflow

**Steps**:

1. **Create migration** (local)
```bash
# Generate migration file
supabase migration new add_field_weld_tracking

# Edit: supabase/migrations/XXXXXX_add_field_weld_tracking.sql
```

2. **Apply to remote** (staging/production)
```bash
# Push migration to remote database
supabase db push --linked

# Verify migration applied
supabase db diff --schema public --linked
```

3. **Generate TypeScript types**
```bash
# Regenerate types from remote schema
supabase gen types typescript --linked > src/types/database.types.ts
```

4. **Implement feature** (using new types)
```typescript
// src/hooks/useFieldWelds.ts
import { Database } from '@/types/database.types';

type FieldWeld = Database['public']['Tables']['field_welds']['Row'];

export const useFieldWelds = (projectId: string) => {
  return useQuery({
    queryKey: ['projects', projectId, 'field_welds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_welds')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data as FieldWeld[];
    }
  });
};
```

**IMPORTANT**: This project uses **remote database only** (no local Supabase instance). Always use `supabase db push --linked`.

**Why Remote-Only**:
- Faster setup (no Docker required)
- Matches production environment exactly
- Simpler CI/CD (no local DB setup in GitHub Actions)

**Trade-off**: Cannot develop offline without database access.

---

### Mobile-First Development

**Approach**: Design and implement mobile UI first, then enhance for desktop.

**Why**:
- Forces prioritization (what's essential vs. nice-to-have)
- Mobile constraints drive better UX (simpler flows, clearer CTAs)
- Easier to add features than remove

**Example**:

**Step 1: Mobile-first design**
```tsx
// Start with mobile (single column, essential info only)
export const ComponentCard = ({ component }: Props) => {
  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">{component.id}</h3>
      <p>Drawing: {component.drawing}</p>
      <p>Progress: {component.percentComplete}%</p>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
};
```

**Step 2: Add desktop enhancements**
```tsx
// Add desktop features (multi-column, inline editing)
export const ComponentCard = ({ component }: Props) => {
  return (
    <div className="p-4 border rounded">
      {/* Mobile: Vertical layout */}
      <div className="lg:hidden space-y-2">
        <h3 className="font-bold">{component.id}</h3>
        <p>Drawing: {component.drawing}</p>
        <p>Progress: {component.percentComplete}%</p>
        <button onClick={handleEdit}>Edit</button>
      </div>

      {/* Desktop: Horizontal layout with inline editing */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-bold">{component.id}</h3>
          <p className="text-sm text-gray-600">{component.drawing}</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={component.percentComplete}
            onChange={handleProgressChange}
            className="w-20"
          />
          <button onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};
```

**Testing**: Test mobile-first, then desktop enhancements
```typescript
describe('ComponentCard', () => {
  it('displays component info on mobile', () => {
    render(<ComponentCard component={mockComponent} />);
    expect(screen.getByText(mockComponent.id)).toBeInTheDocument();
  });

  it('shows inline editing on desktop', () => {
    // Set viewport to desktop
    window.matchMedia = createMatchMedia(1440);

    render(<ComponentCard component={mockComponent} />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();  // Number input
  });
});
```

---

### Permission Integration Workflow

**Steps**:

1. **Define permission function** (src/lib/permissions.ts)
```typescript
export const canUpdateMilestones = (role: string): boolean => {
  return ['owner', 'admin', 'project_manager', 'foreman'].includes(role);
};
```

2. **Add RLS policy** (migration)
```sql
CREATE POLICY "components_update_milestones"
ON components FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  AND get_user_org_role(auth.uid()) IN ('owner', 'admin', 'project_manager', 'foreman')
);
```

3. **Gate UI** (component)
```tsx
const { user } = useAuth();
const canUpdate = canUpdateMilestones(user?.role ?? 'viewer');

return (
  <button
    onClick={handleUpdate}
    disabled={!canUpdate}
    className={!canUpdate ? 'cursor-not-allowed opacity-50' : ''}
  >
    Update Milestone
  </button>
);
```

4. **Handle RLS errors** (mutation)
```typescript
const updateMilestone = useMutation({
  mutationFn: (data) => supabase.from('components').update(data),
  onError: (error) => {
    if (error.code === 'PGRST301') {  // RLS violation
      toast.error('You do not have permission to update milestones');
    } else {
      toast.error('Failed to update milestone');
    }
  }
});
```

5. **Test both layers**
```typescript
describe('Milestone update permissions', () => {
  it('allows foreman to update milestones', async () => {
    mockAuth({ role: 'foreman' });

    render(<MilestoneEditor />);
    const button = screen.getByRole('button', { name: /update/i });

    expect(button).not.toBeDisabled();
  });

  it('prevents viewer from updating milestones', async () => {
    mockAuth({ role: 'viewer' });

    render(<MilestoneEditor />);
    const button = screen.getByRole('button', { name: /update/i });

    expect(button).toBeDisabled();
  });

  it('shows error when RLS blocks update', async () => {
    mockAuth({ role: 'viewer' });
    mockSupabaseError({ code: 'PGRST301' });

    render(<MilestoneEditor />);
    // User somehow enabled button via DevTools
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument();
  });
});
```

---

## Additional Resources

- **Glossary**: [GLOSSARY.md](./GLOSSARY.md) - Term definitions
- **RLS Documentation**: [docs/security/RLS-RULES.md](./security/RLS-RULES.md) - Comprehensive RLS patterns
- **RLS Audit Checklist**: [docs/security/RLS-AUDIT-CHECKLIST.md](./security/RLS-AUDIT-CHECKLIST.md) - Quick reference
- **Design Rules**: [docs/plans/2025-11-06-design-rules.md](./plans/2025-11-06-design-rules.md) - Development patterns
- **Feature Specs**: [specs/](../specs/) - Individual feature documentation
- **Bug Fixes**: [BUG-FIXES.md](./BUG-FIXES.md) - Resolved issues and debugging timelines

---

**Last Updated**: 2025-11-10
**Maintained By**: Development team (update when adding new patterns or critical migrations)
