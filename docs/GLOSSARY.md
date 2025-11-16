# PipeTrak V2 Glossary

A comprehensive glossary of domain-specific and technical terminology used throughout the PipeTrak V2 project.

**Related Documentation**: See [KNOWLEDGE-BASE.md](./KNOWLEDGE-BASE.md) for architecture patterns and development workflows.

---

## Industrial Construction Terms

### Brownfield Construction
Construction or modification work performed on existing industrial facilities (as opposed to greenfield construction on new sites). PipeTrak V2 is specifically designed for brownfield pipe tracking.

### Commodity Code
Standardized identifier for component types used in material takeoffs. Examples:
- `VBALU-001` - Ball valve
- `PIPE-CS-001` - Carbon steel pipe
- `FLNG-WN-150` - Weld neck flange, 150# rating

See also: [Component Identity Key](#component-identity-key)

### Component Identity Key
Unique identifier for components composed of four fields:
```typescript
{
  drawing_norm: string,    // Normalized drawing number (e.g., "P-001")
  commodity_code: string,  // Standard component code (e.g., "PIPE-CS-001")
  size: string,           // Nominal size (e.g., "6\"", "DN150")
  seq: number            // Sequence number for duplicates on same drawing
}
```

Normalization formula: `UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))`

See also: [Drawing Normalization](#drawing-normalization)

### Drawing Normalization
Process of standardizing drawing numbers for consistent identity key generation:
- Convert to uppercase
- Trim leading/trailing whitespace
- Collapse multiple spaces to single space
- Apply via PostgreSQL: `UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))`

Example: `"  p-001  "` → `"P-001"`

### Material Takeoff
List of components extracted from engineering drawings, typically imported via CSV. Contains component specifications (drawing, commodity code, size, quantity) used to populate the component database.

See also: [CSV Material Takeoff Import](../specs/009-sprint-3-material/IMPLEMENTATION-NOTES.md)

### Test Package
Grouping of components for coordinated quality control testing. Components are assigned to test packages based on physical proximity, system boundaries, or testing schedules. Used to track package readiness percentage.

Related tables: `test_packages`, `components.test_package_id`

---

## Welding & Quality Control

### Field Weld
Weld performed on-site during construction (as opposed to shop welds performed in fabrication facilities). Field welds require:
- Welder assignment tracking
- NDE result recording
- Repair history management

Related table: `field_welds`

See also: [Welder Assignment](#welder-assignment), [NDE](#nde-non-destructive-examination)

### Joint Number
Unique identifier for weld locations in piping systems. Format varies by project (e.g., "W-001", "FW-P-001-12"). Used to track field welds and associate them with components.

### MT (Magnetic Particle Testing)
Non-destructive examination method using magnetic fields and iron particles to detect surface and near-surface defects in ferromagnetic materials.

See also: [NDE](#nde-non-destructive-examination)

### NDE (Non-Destructive Examination)
Quality inspection methods that test welds without damaging the component. Common methods:
- **X-ray (RT)**: Radiographic testing using X-rays or gamma rays
- **UT**: Ultrasonic testing using sound waves
- **PT**: Penetrant testing for surface defects
- **MT**: Magnetic particle testing for ferromagnetic materials
- **VT**: Visual testing (basic visual inspection)

Results stored as: `Pass`, `Fail`, `Pending`

### PT (Penetrant Testing)
Non-destructive examination method that uses liquid penetrant to reveal surface-breaking defects in non-porous materials.

See also: [NDE](#nde-non-destructive-examination)

### Repair Weld
Replacement weld performed after a field weld fails NDE inspection. Repair history is tracked with original weld records, including repair date, welder, and re-inspection results.

Related fields: `field_welds.repair_count`, `field_welds.last_repair_date`

### RT (Radiographic Testing)
Non-destructive examination method using X-rays or gamma rays to detect internal defects in welds. Often shortened to "X-ray" in the UI.

See also: [NDE](#nde-non-destructive-examination)

### UT (Ultrasonic Testing)
Non-destructive examination method using high-frequency sound waves to detect internal defects and measure material thickness.

See also: [NDE](#nde-non-destructive-examination)

### VT (Visual Testing)
Basic non-destructive examination method involving visual inspection of welds for surface defects, dimensions, and workmanship.

See also: [NDE](#nde-non-destructive-examination)

### Welder Assignment
Process of assigning certified welders to specific field welds. Tracks:
- Welder ID (from `welders` table)
- Assignment date
- Weld stencil (welder identification marking)
- Date welded (completion timestamp)

Related hook: `useAssignWelder` (src/hooks/useAssignWelder.ts)

### Weld Stencil
Identification marking applied by welders to completed welds, typically their initials or certification number. Used for traceability and quality assurance.

---

## Progress Tracking

### Discrete Milestone
Binary completion milestone represented as checkbox in UI. Values:
- `0` = Incomplete
- `1` = Complete

Examples: Budget, Receive, Install, Tested, Punch, Restore

Storage: JSONB field `current_milestones` with numeric values (NOT boolean)

**Important**: Migration 00084 converted legacy boolean values to numeric. Always use `0`/`1`, never `true`/`false`.

See also: [Partial Milestone](#partial-milestone), [Milestone Event](#milestone-event)

### Earned Value
Weighted progress calculation that accounts for milestone importance. Formula:
```sql
SUM(milestone_weight * milestone_value) / SUM(milestone_weight)
```

Example: For a valve with milestones (Budget: 10%, Receive: 20%, Install: 40%, Tested: 30%):
- If Receive and Install complete: `(0.2*1 + 0.4*1) / 1.0 = 60%`

Implemented in: `calculate_earned_milestone_value()` function (Migration 00057)

See also: [Progress Template](#progress-template)

### Milestone
Specific completion stage in a component's lifecycle. Two types:
- **Discrete**: Binary completion (checkbox)
- **Partial**: Percentage completion (0-100%)

Common milestones:
- **Budget**: Component included in budget
- **Receive**: Material received on site
- **Install**: Component physically installed
- **Tested**: Component successfully tested
- **Punch**: Punch list items completed
- **Restore**: Final restoration/cleanup complete

Storage: `current_milestones` JSONB field in `components` table

See also: [Discrete Milestone](#discrete-milestone), [Partial Milestone](#partial-milestone)

### Milestone Event
Historical record of milestone changes stored in `milestone_events` table. Tracks:
- Milestone name
- Old value → New value
- User who made the change
- Timestamp
- Component ID

Used for milestone history timeline in Component Details modal.

### Partial Milestone
Percentage-based milestone (0-100%) represented as numeric input in UI. Used for components with gradual completion tracking.

Examples:
- Pipe: Receive (50%), Install (50%)
- Threaded Pipe: Partial milestone workflow with inline numeric inputs

Storage: JSONB field `current_milestones` with numeric values 0-100

**Feature 025**: Inline numeric input for threaded pipe partial milestones (replaced slider-based editors)

See also: [Discrete Milestone](#discrete-milestone), [Threaded Pipe](#threaded-pipe)

### Percent Complete
Overall completion percentage for a component, calculated using earned value formula. Displayed in progress tables and reports.

Calculation: See [Earned Value](#earned-value)

### Progress Template
Predefined milestone sequence for each component type, specifying:
- Milestone names
- Milestone weights (for earned value calculation)
- Default values
- Whether milestone is discrete or partial

Stored in: `progress_templates` table

See also: [Component Types](#component-types)

---

## Component Types

### Field Weld
Special component type representing on-site welded joints. Workflow differs from standard components:
- Requires welder assignment
- Tracks NDE results
- Records repair history
- Uses discrete milestones (Welded, Inspected, Accepted)

Related feature: [Feature 015 - Mobile Milestone Updates & Field Weld Management](../specs/015-mobile-milestone-updates/IMPLEMENTATION-NOTES.md)

See also: [Welder Assignment](#welder-assignment)

### Fitting
Pipe fittings (elbows, tees, reducers, couplings). Milestone workflow:
- Receive: 50% (partial)
- Install: 50% (partial)

Commodity code examples: `FITT-ELB-90`, `FITT-TEE-EQ`, `FITT-RED-CON`

### Flange
Connection flanges used to join pipe sections or equipment. Milestone workflow:
- Receive: 50% (partial)
- Install: 50% (partial)

Commodity code examples: `FLNG-WN-150`, `FLNG-SO-300`, `FLNG-BL-600`

### Instrument
Measurement and control devices (gauges, transmitters, flow meters). Milestone workflow:
- Budget (discrete)
- Receive (discrete)
- Install (discrete)
- Tested (discrete)
- Punch (discrete)
- Restore (discrete)

Similar workflow to valves but may have additional calibration requirements.

### Pipe
Linear pipe sections. Milestone workflow:
- Receive: 50% (partial)
- Install: 50% (partial)

Commodity code examples: `PIPE-CS-001` (carbon steel), `PIPE-SS-316` (stainless steel)

### Support
Pipe support structures (hangers, shoes, anchors, guides). Milestone workflow varies by support type but typically includes:
- Receive (discrete or partial)
- Install (discrete or partial)

### Threaded Pipe
Pipe with threaded connections (as opposed to welded). Uses partial milestone workflow with inline numeric inputs for faster field updates.

**Feature 025**: Inline numeric inputs replaced slider-based editors for 50% faster updates (4-5 steps → 2 steps)

Related documentation: [specs/025-threaded-pipe-inline-input/](../specs/025-threaded-pipe-inline-input/)

### Valve
Flow control devices (ball valves, gate valves, check valves, control valves). Milestone workflow:
- Budget (discrete)
- Receive (discrete)
- Install (discrete)
- Tested (discrete)
- Punch (discrete)
- Restore (discrete)

Commodity code examples: `VBALU-001`, `VGATE-150`, `VCHEK-600`

---

## Metadata Organization

### Area
Physical plant area grouping for components (e.g., "North Unit", "Compressor Station", "Tank Farm"). Used for:
- Progress reports grouped by area
- Work package organization
- Field crew assignments

Related: `components.area_id`, `vw_progress_by_area` database view

### Drawing
Engineering drawing reference containing component specifications. Format varies by project (e.g., "P-001", "DRAIN-1", "ISO-45-A").

Related: [Drawing Normalization](#drawing-normalization), [Component Identity Key](#component-identity-key)

### System
Functional system grouping for components (e.g., "Steam", "Cooling Water", "Instrument Air", "Fire Protection"). Used for:
- Progress reports grouped by system
- Testing coordination
- Operational handover

Related: `components.system_id`, `vw_progress_by_system` database view

---

## User Roles & Permissions

### Admin
Nearly full control of organization. Can:
- Manage projects, components, assignments
- Manage team members and invitations
- Configure settings
- View all data

Cannot: Delete organization (owner-only)

Permission function: `canManageTeam()`, `canManageProjects()`

### Foreman
Field supervisor role. Can:
- Update milestones
- Assign welders
- Record field progress
- View assigned work

Cannot: Manage team, delete projects

Permission function: `canUpdateMilestones()`

### Owner
Full control of organization. Can:
- All admin capabilities
- Delete organization
- Transfer ownership

Only one owner per organization. Last-owner protection prevents role changes if only one owner exists.

Related: Migration 00049 (invitation acceptance), RLS policies

### Project Manager
Can manage projects and components. Permissions:
- Create/edit/delete projects
- Manage components and assignments
- Update milestones
- Generate reports

Cannot: Manage team members (admin-only)

Permission function: `canManageProjects()`

### QC Inspector
Quality control inspector role. Can:
- Record NDE results
- Update field weld status
- Mark components for repair
- View quality metrics

Cannot: Assign welders, manage milestones (foreman-only)

Permission function: `canRecordNDE()`

### Viewer
Read-only access. Can:
- View all data (within organization)
- Generate reports
- Search and filter

Cannot: Modify any data

All interactive UI elements disabled for viewers.

### Welder
Limited field user role. Can:
- View assigned welds
- View work instructions
- Mark welds as complete (in some workflows)

Cannot: Assign work, update milestones, view other welders' work

Related table: `welders`, permission context for field weld assignments

---

## Technical Terms

### Cache Invalidation
TanStack Query pattern for clearing stale data after mutations. Common patterns:
```typescript
// Invalidate specific entity
queryClient.invalidateQueries({ queryKey: ['components', id] });

// Invalidate all entities for project
queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'components'] });

// Invalidate all queries matching pattern
queryClient.invalidateQueries({ queryKey: ['components'] });
```

Triggers automatic refetch of affected queries.

See also: [Optimistic Update](#optimistic-update), [KNOWLEDGE-BASE.md - TanStack Query Conventions](./KNOWLEDGE-BASE.md#tanstack-query-conventions)

### Optimistic Update
UI update pattern that immediately reflects changes before server confirmation. If mutation fails, UI reverts to previous state.

Example from `useAssignWelder`:
```typescript
onMutate: async (newData) => {
  // Cancel outgoing queries
  await queryClient.cancelQueries({ queryKey: ['components', id] });

  // Snapshot previous value
  const previousData = queryClient.getQueryData(['components', id]);

  // Optimistically update UI
  queryClient.setQueryData(['components', id], newData);

  return { previousData }; // For rollback if needed
},
onError: (err, variables, context) => {
  // Rollback on failure
  queryClient.setQueryData(['components', id], context.previousData);
}
```

Improves perceived performance for user actions.

### RLS (Row Level Security)
PostgreSQL security feature that restricts which rows users can access based on policies. PipeTrak V2 uses RLS for multi-tenant isolation:

```sql
-- Example: Organization-scoped policy
CREATE POLICY "users_can_view_own_org"
ON components FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

Every table has RLS policies. Client-side permission checks are for UX only; RLS enforces security at database level.

See also: [SECURITY DEFINER](#security-definer), [KNOWLEDGE-BASE.md - RLS Patterns](./KNOWLEDGE-BASE.md#rls-patterns)

### SECURITY DEFINER
PostgreSQL function modifier that runs function with owner privileges instead of caller privileges. Required to prevent infinite RLS recursion when policies query RLS-protected tables.

Example from Migration 00049:
```sql
CREATE OR REPLACE FUNCTION accept_invitation_for_user(invitation_id UUID)
RETURNS void
SECURITY DEFINER  -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Function can query users table without triggering RLS policies
  UPDATE users SET organization_id = ... WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;
```

**Security note**: SECURITY DEFINER functions MUST validate all inputs since they run with elevated privileges.

Common uses:
- `get_user_org_role()` - Check user role without RLS
- `is_super_admin()` - Check super admin status
- `accept_invitation_for_user()` - Assign org/role during signup

See also: [KNOWLEDGE-BASE.md - SECURITY DEFINER Functions](./KNOWLEDGE-BASE.md#security-definer-functions)

---

## Cross-References

- **Development Workflows**: See [KNOWLEDGE-BASE.md](./KNOWLEDGE-BASE.md)
- **RLS Security Patterns**: See [docs/security/RLS-RULES.md](./security/RLS-RULES.md)
- **Feature Documentation**: See [specs/](../specs/) directory
- **Database Schema**: See `supabase/migrations/` and `src/types/database.types.ts`
- **Design Patterns**: See [docs/plans/2025-11-06-design-rules.md](./plans/2025-11-06-design-rules.md)

---

**Last Updated**: 2025-11-10
**Maintained By**: Development team (update when adding new domain concepts or technical patterns)
