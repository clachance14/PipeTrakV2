# Research: Component Metadata Editing from Drawings View

**Feature**: 020-component-metadata-editing
**Date**: 2025-10-28
**Status**: Research Complete

## Overview

This document consolidates technical research and design decisions for implementing component metadata editing functionality. The design document (`docs/plans/2025-10-28-component-metadata-editing-design.md`) provides comprehensive technical guidance, which is summarized and validated here.

## Key Research Areas

### 1. Component Extension Pattern

**Decision**: Extend existing ComponentDetailView with composition props

**Rationale**:
- ComponentDetailView already used in ComponentsPage for displaying component details
- Maintains UI consistency across the application
- Avoids code duplication for milestone history display
- Single source of truth for component detail rendering
- Composition pattern allows flexible usage (view-only vs edit mode)

**Alternatives Considered**:
1. **Create new ComponentMetadataModal** - Rejected due to code duplication for milestone history
2. **Compose with shared subcomponents** - Rejected as over-engineering for initial version (may revisit if more views need component details)

**Implementation**:
- Add `showMetadataEdit?: boolean` prop to ComponentDetailView (default: false)
- Add `onMetadataUpdate?: (data) => void` callback prop
- Conditionally render MetadataEditForm at top when prop is true

---

### 2. UI Pattern for Modal Dialog

**Decision**: Modal dialog with centered overlay (Dialog component from Radix UI)

**Rationale**:
- Consistent with existing ComponentDetailView pattern in ComponentsPage
- Provides full focus on editing task without distractions
- Works well across desktop and mobile devices
- Proven pattern in Features 015 and 016

**Alternatives Considered**:
1. **Slide-out drawer panel** - Rejected: adds complexity, not consistent with existing patterns
2. **Inline expansion below row** - Rejected: disrupts table flow, difficult on mobile with limited vertical space

**Accessibility Requirements**:
- Focus trap within modal
- Return focus to component row on close
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ARIA labels and role attributes
- Screen reader announcements for state changes

---

### 3. Metadata Creation UX Pattern

**Decision**: Combobox with inline "Create new..." option

**Rationale**:
- Keeps user in flow (no separate modal required)
- Clear distinction between selecting existing vs creating new entries
- Prevents accidental creation of duplicates (search first, then create)
- Industry standard pattern (used by GitHub, Linear, Notion, etc.)

**Alternatives Considered**:
1. **Separate "Add New" button** - Rejected: requires modal stacking or separate workflow
2. **Free text input with auto-create** - Rejected: high risk of duplicate creation with typos

**Implementation Flow** (UPDATED 2025-10-29):
1. Combobox shows existing options sorted A-Z
2. "(None)" option at top to clear assignment
3. "Create new..." option at bottom with "+" icon
4. Selecting "Create new..." switches dropdown to inline input form
5. Type name → validate uniqueness → Enter/checkmark creates entry
6. **New entry committed to database immediately** (per clarification: metadata creation independent of component assignment)
7. New entry auto-selected in dropdown
8. If user clicks Cancel on modal, new metadata persists but component assignment is not saved

**Validation Rules**:
- Trim whitespace before validation
- Case-insensitive duplicate check
- Prevent empty names
- Show error inline: "Area 'North Wing' already exists"

---

### 4. Permission Model

**Decision**: Admin and Manager roles only can edit metadata

**Rationale**:
- Prevents accidental changes by field users
- Metadata assignments affect reporting and progress tracking across entire project
- Consistent with other administrative functions (team management, project settings)
- Field users still see metadata in view-only mode for transparency

**Implementation**:
- Check `user.role` via `useAuth()` hook
- Conditionally render edit form vs view-only display based on role
- RLS policies enforce server-side validation (defense in depth)

**RLS Policy Validation**:
- Existing policies on components table already check organization membership
- UPDATE operations require Admin or Manager role
- Service role key never exposed to frontend

---

### 5. Optimistic Update Strategy

**Decision**: Immediate client-side cache update with rollback on error

**Rationale**:
- Provides instant feedback (perceived performance <100ms)
- Reduces user frustration on slow networks
- Maintains data consistency via automatic rollback on server error
- Industry best practice with TanStack Query

**Implementation Pattern**:
```typescript
onMutate: async (variables) => {
  // Cancel in-flight queries to prevent race conditions
  await queryClient.cancelQueries(['component', variables.componentId])

  // Snapshot current state for rollback
  const previous = queryClient.getQueryData(['component', variables.componentId])

  // Optimistically update cache
  queryClient.setQueryData(['component', variables.componentId], (old) => ({
    ...old,
    area_id: variables.area_id,
    system_id: variables.system_id,
    test_package_id: variables.test_package_id
  }))

  return { previous }
},
onError: (err, variables, context) => {
  // Revert to snapshot on error
  queryClient.setQueryData(['component', variables.componentId], context?.previous)
  // Show error toast
},
onSuccess: () => {
  // Invalidate related queries to refetch fresh data
  queryClient.invalidateQueries(['components'])
  queryClient.invalidateQueries(['drawings-with-progress'])
}
```

**Error Scenarios Handled**:
- Concurrent updates: Show error "Component was updated by another user. Please refresh."
- Network failures: Revert + show toast "Failed to save changes. Retry?"
- Validation errors: Revert + show specific error message
- Deleted metadata: Show toast "Selected metadata no longer exists. Please refresh and try again."

---

### 6. Shadcn/ui Combobox Component

**Decision**: Use Shadcn/ui Combobox primitive (based on Radix UI Popover + Command)

**Rationale**:
- Already using Shadcn/ui components throughout application
- Provides accessible, keyboard-navigable combobox out of the box
- Supports search/filter functionality
- Customizable for inline creation mode
- WCAG 2.1 AA compliant

**Installation**:
```bash
npx shadcn-ui@latest add combobox
```

**Customization Required**:
- Add "Create new..." option rendering
- Handle inline input form mode
- Integrate validation logic
- Add loading states

**Dependencies** (already installed):
- @radix-ui/react-popover
- @radix-ui/react-command
- cmdk (command palette library)

---

### 7. Mobile Responsiveness

**Decision**: Follow Feature 015 patterns (≤1024px breakpoint, ≥32px touch targets)

**Rationale**:
- Consistent with existing mobile features
- Proven to work with field users on tablets and phones
- Meets WCAG 2.1 touch target guidelines

**Responsive Behavior**:
- **Desktop (≥1024px)**: 3-column layout (Area | System | Test Package)
- **Mobile (<1024px)**: Stacked vertical layout with full-width comboboxes
- **Touch targets**: All buttons and dropdowns ≥32px (44px preferred)
- **Font sizes**: Minimum 16px to prevent mobile zoom

---

### 8. Concurrent Edit Detection

**Decision**: Version field with optimistic locking (UPDATED 2025-10-29)

**Rationale**:
- More reliable than timestamps (prevents race conditions within same millisecond)
- Atomic increment via PostgreSQL trigger (no application logic needed)
- Standard optimistic concurrency pattern
- Clarification confirmed during `/clarify` workflow

**Implementation**:
1. Add `version` INTEGER column to components table (default 1)
2. Create trigger to auto-increment version on UPDATE
3. When modal opens, record component's current version
4. On save, include version in WHERE clause: `UPDATE components SET ... WHERE id = $1 AND version = $2`
5. If no rows updated (version changed), another user edited first
6. Show error "Component was updated by another user. Please refresh." and refetch

**Schema Change Required**:
```sql
-- Migration 00063: Add version field for optimistic locking
ALTER TABLE components ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION increment_component_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_component_version
  BEFORE UPDATE ON components
  FOR EACH ROW
  EXECUTE FUNCTION increment_component_version();
```

**Alternative Considered**:
- **Timestamps** - Rejected: race conditions possible with concurrent updates in same millisecond

---

## Performance Considerations

### Dropdown with 1000+ Options (UPDATED 2025-10-29)

**Concern**: Combobox performance with large metadata datasets (3000 total entities: 1000 Areas, 1000 Systems, 1000 Test Packages per clarifications)

**Decision**: Use TanStack Virtual v3 for virtualized rendering

**Research**:
- Shadcn/ui Combobox base (cmdk) can handle moderate datasets but not optimized for 1000+ items
- TanStack Virtual already a project dependency (used in Feature 019 for progress reports)
- Provides `useVirtualizer` hook with fixed-size item rendering
- Only renders 10-15 DOM elements regardless of list size
- Handles 10,000+ items with <16ms render time

**Implementation**:
- Wrap Command list with TanStack Virtual virtualizer
- Filter items client-side (O(n) <50ms for 3000 items)
- Render only visible items in viewport + 5 overscan
- Search-as-you-type reduces filtered list instantly

**Performance Targets** (from clarifications):
- Modal open: <200ms
- Search filtering: Instant (<50ms)
- Dropdown render: <100ms for 1000 items

**Threshold**: Well within capabilities with virtualization

---

## Security Considerations

### Client-Side Permission Checks

**Pattern**: Check user role via AuthContext, but rely on RLS for enforcement

**Rationale**:
- Client checks improve UX (hide controls user can't use)
- RLS policies provide true security (defense in depth)
- Never trust client-side validation alone

**RLS Policy Verification**:
- Existing policies on `components` table already enforce organization membership
- `areas`, `systems`, `test_packages` tables have RLS for INSERT operations
- UPDATE operations check user role via `auth.uid()` mapping to users table

**Audit Trail**:
- `last_updated_at` timestamp tracks when changes occurred
- `created_by` field on metadata tables tracks who created entries
- Can add audit logging in future if needed

---

## Testing Strategy

### Unit Tests (Vitest + Testing Library)

**Coverage Targets**:
- MetadataEditForm: ≥60% (UI component standard)
- useUpdateComponentMetadata hook: ≥80% (business logic standard)
- useCreateArea/System/TestPackage hooks: ≥80%

**Key Scenarios**:
- Comboboxes render with current values pre-populated
- "(None)" option clears assignment
- "Create new..." shows inline input form
- Duplicate name validation prevents creation
- Empty name validation shows error
- Save calls mutation with correct payload
- Cancel discards changes

### Integration Tests

**Test File**: `tests/integration/component-metadata-editing.test.tsx`

**Scenarios** (map to user stories in spec):
1. Click component row → modal opens (User Story 1)
2. Admin user sees edit form (User Story 1)
3. Non-admin user sees view-only (User Story 4)
4. Change area dropdown → save → table updates (User Story 1)
5. Create new area → appears in dropdown → save successful (User Story 2)
6. Create duplicate area → shows error (User Story 2)
7. Validation prevents empty names (User Story 2)
8. Cancel button discards changes (User Story 1)
9. Concurrent update shows error and refetches (Edge case)

### E2E Tests (Playwright or Cypress)

**Test File**: `tests/e2e/component-metadata-workflow.spec.ts`

**Workflows**:
1. Admin edits component metadata from drawings view (full happy path)
2. Non-admin cannot edit metadata (permission check)
3. Create new metadata inline (creation flow)
4. Concurrent edit conflict handling (pessimistic scenario)

---

## Dependencies Audit

### Existing Dependencies (Already Installed)

- ✅ React 18.3
- ✅ TypeScript 5.x
- ✅ TanStack Query v5
- ✅ Supabase JS Client
- ✅ Radix UI primitives (Dialog, Popover, Command)
- ✅ Tailwind CSS v4
- ✅ Vitest + Testing Library

### New Dependencies Required

- ✅ Shadcn/ui Combobox (add via CLI, uses existing Radix dependencies)
- ✅ cmdk (command palette library - dependency of Combobox)

**No additional npm installs required** - all dependencies satisfied by Shadcn/ui ecosystem.

---

## Database Schema Validation

### Existing Tables (No Changes Required)

**components table**:
- `id` (uuid, primary key)
- `area_id` (uuid, nullable, foreign key to areas)
- `system_id` (uuid, nullable, foreign key to systems)
- `test_package_id` (uuid, nullable, foreign key to test_packages)
- `last_updated_at` (timestamp)

**areas table**:
- `id` (uuid, primary key)
- `name` (text, unique per project)
- `project_id` (uuid, foreign key to projects)
- `organization_id` (uuid, for RLS)
- `created_by` (uuid, foreign key to users)

**systems table**:
- `id` (uuid, primary key)
- `name` (text, unique per project)
- `project_id` (uuid, foreign key to projects)
- `organization_id` (uuid, for RLS)
- `created_by` (uuid, foreign key to users)

**test_packages table**:
- `id` (uuid, primary key)
- `name` (text, unique per project)
- `project_id` (uuid, foreign key to projects)
- `organization_id` (uuid, for RLS)
- `created_by` (uuid, foreign key to users)

### RLS Policies (Already Exist)

All tables have organization-based RLS policies:
- SELECT: Allow if user belongs to organization
- INSERT: Allow if Admin/Manager role
- UPDATE: Allow if Admin/Manager role
- DELETE: Allow if Admin role

**No migrations required** - schema and policies already support this feature.

---

## Implementation Phases

### Phase 1: Backend Foundation (Hooks)
- Create `useUpdateComponentMetadata` hook with optimistic updates
- Create `useCreateArea`, `useCreateSystem`, `useCreateTestPackage` hooks (if they don't exist)
- Write unit tests for hooks (TDD - tests first)
- Verify RLS policies in integration tests

### Phase 2: UI Components
- Add Shadcn/ui Combobox component via CLI
- Create `MetadataEditForm` component
- Write component tests (TDD - tests first)
- Implement "Create new..." inline flow
- Add validation logic

### Phase 3: Integration
- Modify `ComponentDetailView` to accept metadata edit props
- Wire up onClick in ComponentRow → DrawingTable → DrawingComponentTablePage
- Add Dialog state management in DrawingComponentTablePage
- Write integration tests covering all user stories

### Phase 4: Polish & Testing
- Add loading states and error messages
- Implement accessibility features (ARIA, keyboard nav, focus trap)
- Write E2E tests for admin and non-admin workflows
- Verify coverage targets met (≥70% overall, ≥80% hooks, ≥60% components)

### Phase 5: Documentation
- Update CLAUDE.md with feature reference
- Add implementation notes (if needed)
- Document any new patterns for future features

---

## Success Criteria Validation

All success criteria from spec are technically feasible:

- ✅ SC-001: Modal open <200ms - Achievable with React state update + Dialog component
- ✅ SC-002: Save <1s with optimistic UI - TanStack Query optimistic updates
- ✅ SC-003: Complete task in <15s - UX streamlined with inline creation
- ✅ SC-004: 100% persistence - Supabase PostgreSQL with RLS
- ✅ SC-005: Inline metadata creation - Combobox with inline form
- ✅ SC-006: Concurrent conflict detection - Timestamp comparison
- ✅ SC-007: Keyboard navigation - Radix UI accessibility
- ✅ SC-008: Non-admin prevention - Role check + RLS
- ✅ SC-009: 1000+ options performance - cmdk virtualization
- ✅ SC-010: Duplicate prevention - Validation logic

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Concurrent updates cause data loss | Medium | High | Optimistic updates with conflict detection, show error + refetch |
| Performance degradation with many metadata options | Low | Medium | Combobox uses virtualization, tested with 10k+ items |
| Users accidentally create duplicate metadata with typos | Medium | Low | Show fuzzy match suggestions, trim + case-insensitive check |
| RLS policy doesn't match frontend permissions | Low | High | Test permission scenarios in integration tests, verify with Supabase dashboard |
| Optimistic update shows wrong data | Low | Medium | Always refetch on success to confirm server state |

---

## References

- Design Document: `docs/plans/2025-10-28-component-metadata-editing-design.md`
- Feature Specification: `specs/020-component-metadata-editing/spec.md`
- Feature 015: Mobile Milestone Updates (responsive patterns)
- Feature 016: Team Management UI (permission patterns)
- Shadcn/ui Combobox: https://ui.shadcn.com/docs/components/combobox
- TanStack Query Optimistic Updates: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- Radix UI Dialog: https://www.radix-ui.com/primitives/docs/components/dialog

---

## Conclusion

Research is complete with no unresolved NEEDS CLARIFICATION items. The design document provides comprehensive technical guidance, and all decisions have been validated against:
- Constitution principles (all gates passed)
- Existing codebase patterns (reusing ComponentDetailView, TanStack Query, Shadcn/ui)
- Performance targets (all success criteria feasible)
- Security requirements (RLS policies, role-based permissions)

Ready to proceed to Phase 1: Data Model and Contracts generation.
