# Unified Settings Page Design

**Date**: 2025-11-12
**Author**: Design discussion with user
**Status**: Approved for implementation

## Purpose

Consolidate project settings into a unified hub with consistent navigation, layout, and permissions. Currently, settings scatter across three locations with inconsistent patterns and permission enforcement.

## Goals

1. Create settings landing page with clear navigation to subsections
2. Establish shared layout component for consistency
3. Move metadata management under settings umbrella
4. Add project details editing with archive capability
5. Enforce strict permission model (Owner/Admin/PM only)

## Route Structure

### New Routes

- `/projects/:projectId/settings` - Landing page with three section cards
- `/projects/:projectId/settings/milestones` - Milestone template weights (moved from current location)
- `/projects/:projectId/settings/metadata` - Areas, Systems, Test Packages (moved from `/metadata`)
- `/projects/:projectId/settings/project` - Project details editing and archive (NEW)

All routes require Owner, Admin, or Project Manager role.

### Routes to Remove

- `/metadata` - Replaced by `/projects/:projectId/settings/metadata`

## Architecture

### Unified Layout Approach

**Choice rationale**: Balance consistency with practicality. Shared layout enforces consistent patterns without requiring complete rebuild.

**Components**:
1. SettingsLayout - Shared header, breadcrumbs, permission gate
2. SettingsIndexPage - Landing page with section cards
3. Refactored pages - Existing pages wrapped in new layout
4. ProjectDetailsPage - New page for project editing

### Permission Model

**Strict enforcement**: All settings sections require Owner, Admin, or Project Manager role.

**Implementation**: SettingsLayout wraps children in `<PermissionGate permission="can_manage_project">`. Unauthorized users see "Access Denied" message.

## Component Specifications

### SettingsLayout (NEW)

**File**: `src/components/settings/SettingsLayout.tsx`

**Props**:
```typescript
interface SettingsLayoutProps {
  title: string
  description: string
  children: React.ReactNode
}
```

**Features**:
- Breadcrumb navigation: "Settings" > current page name
- Page header with title and description
- Permission gate wrapping children
- Max width 1400px, responsive padding (p-6 mobile, p-8 desktop)

**Usage**:
```tsx
<SettingsLayout title="Milestone Templates" description="...">
  {/* Page content */}
</SettingsLayout>
```

### SettingsIndexPage (NEW)

**File**: `src/pages/SettingsIndexPage.tsx`
**Route**: `/projects/:projectId/settings`

**Layout**: Three-column responsive card grid
- Mobile (≤768px): 1 column
- Tablet (769-1024px): 2 columns
- Desktop (>1024px): 3 columns
- Gap: 24px

**Card Design**:
- White background, border, rounded corners
- Shadow on hover, clickable with hover state
- Icon at top (lucide-react)
- Title (text-lg font-semibold)
- Description (text-sm text-slate-600, 2-3 lines)
- "Manage →" button (primary style, full width)

**Three Cards**:

1. **Milestone Templates**
   - Icon: Sliders
   - Description: "Customize progress tracking weights for each component type. Changes apply to all existing and future components."
   - Links to: `/projects/:projectId/settings/milestones`

2. **Metadata Management**
   - Icon: Database
   - Description: "Create and manage Areas, Systems, and Test Packages used to organize and categorize components across your project."
   - Links to: `/projects/:projectId/settings/metadata`

3. **Project Details**
   - Icon: FolderCog
   - Description: "Edit project name and description, or archive this project to hide it from active project lists."
   - Links to: `/projects/:projectId/settings/project`

### MilestoneTemplatesPage (REFACTOR)

**Changes**:
1. Wrap entire page content in SettingsLayout
2. Remove duplicate header (title and description now come from layout)
3. Keep CloneTemplatesBanner and TemplateCard grid unchanged
4. Update route from current location to `/projects/:projectId/settings/milestones`

**Preserved**:
- All 6 existing components in `src/components/settings/`
- All 4 TanStack Query hooks
- CloneTemplatesBanner logic
- TemplateEditor modal with validation
- Retroactive recalculation
- Audit trail display

### MetadataManagementPage (REFACTOR)

**Changes**:
1. Wrap entire page in SettingsLayout
2. Add permission enforcement via layout (current page has no permission checks)
3. Update route from `/metadata` to `/projects/:projectId/settings/metadata`
4. Remove "Details" link from Sidebar

**Preserved**:
- Three-column grid layout (Areas, Systems, Test Packages)
- Create forms with 100-character descriptions
- Inline description editing via MetadataDescriptionEditor
- All existing hooks and components

### ProjectDetailsPage (NEW)

**File**: `src/pages/ProjectDetailsPage.tsx`
**Route**: `/projects/:projectId/settings/project`

**Layout**: Single form wrapped in SettingsLayout

**Sections**:

1. **Basic Information**
   - Project Name: Text input, required, max 100 characters
   - Description: Textarea, optional, max 500 characters, 4 rows
   - Save button: Disabled until form is dirty
   - Optimistic update on save with success toast

2. **Danger Zone**
   - Separate card with red border
   - Title: "Danger Zone" (text-red-600)
   - Archive button with warning icon
   - Button text: "Archive Project"

3. **Archive Confirmation Dialog**
   - Title: "Archive Project?"
   - Message: "This project will be hidden from active lists. Components and data are preserved and can be restored later."
   - Cancel button (secondary)
   - Archive button (destructive red)
   - On confirm: Sets `deleted_at = NOW()`
   - Redirects to `/dashboard` after success

**New Hooks**:
- `useUpdateProject.ts` - Mutation for name and description updates
- `useArchiveProject.ts` - Mutation for soft delete

## Database Changes

### Migration: Add Soft Delete to Projects

**File**: `supabase/migrations/0000X_add_deleted_at_to_projects.sql`

```sql
-- Add deleted_at column for soft delete
ALTER TABLE projects
ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- Add index for query performance
CREATE INDEX idx_projects_deleted_at
ON projects(deleted_at);

-- Update RLS policies to filter archived projects
-- Example policy update:
ALTER POLICY "Users can view projects in their organization"
ON projects
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND deleted_at IS NULL  -- Hide archived projects
);

COMMENT ON COLUMN projects.deleted_at IS
'Soft delete timestamp. NULL = active, NOT NULL = archived. Archived projects are hidden but can be restored.';
```

**All RLS policies on projects table** must add `AND deleted_at IS NULL` filter to hide archived projects from normal operations.

### No Hard Delete

Archive is soft delete only. No permanent deletion capability. This preserves data integrity and enables restoration if needed.

## Navigation Changes

### Sidebar Updates

**File**: `src/components/Sidebar.tsx`

**Changes**:
1. Update "Template Settings" link:
   - Change label to "Settings"
   - Point to `/projects/:projectId/settings` (landing page)
   - Keep existing permission check (owner/admin/PM only)
   - Keep existing conditional rendering (only when project selected)

2. Remove "Details" link:
   - Delete current `/metadata` navigation item
   - Metadata now accessible only via Settings landing page

## Testing Requirements

### Unit Tests (≥70% coverage)

**New Components**:
- SettingsLayout: Rendering, breadcrumbs, permission gate
- SettingsIndexPage: Card rendering, navigation
- ProjectDetailsPage: Form validation, disabled states

**New Hooks**:
- useUpdateProject: Optimistic updates, error handling
- useArchiveProject: Mutation success, redirect behavior

### Integration Tests

**Permission Enforcement**:
- Verify Owner/Admin/PM can access all settings pages
- Verify Foreman/QC/Viewer see "Access Denied"
- Verify unauthorized users redirected appropriately

**Archive Workflow**:
- Fill project details form → click Archive → confirm dialog → mutation → redirect to dashboard
- Verify archived project no longer appears in project list
- Verify deleted_at timestamp set correctly

**Navigation**:
- Click Settings in sidebar → lands on settings index page
- Click Manage on each card → navigates to correct subsection
- Click Settings breadcrumb → returns to landing page

### E2E Tests

**Complete Settings Flow**:
1. Navigate to Settings from sidebar
2. Click "Manage" on Milestone Templates card
3. Edit a template weight
4. Save changes
5. Click "Settings" breadcrumb to return to landing

**Archive Project Flow**:
1. Navigate to Settings → Project Details
2. Edit project name and description, save
3. Click Archive Project button
4. Confirm in dialog
5. Verify redirect to dashboard
6. Verify project no longer in project list

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- Tab: Move between interactive elements
- Enter: Activate buttons, submit forms
- Escape: Close dialogs, cancel edits
- Focus indicators: Visible on all interactive elements

### Screen Reader Support
- Proper labels on all form inputs
- ARIA attributes for custom components
- Live region announcements for form errors and success messages
- Semantic HTML (nav, main, section, article)

### Touch Targets
- Minimum 44×44px for all buttons and interactive elements
- Increased spacing on mobile to prevent accidental taps

### Visual Design
- Sufficient color contrast ratios
- Don't rely on color alone to convey information
- Focus indicators visible in high contrast mode

## Implementation Plan Summary

### Phase 1: Shared Components
1. Create SettingsLayout component
2. Create SettingsIndexPage component
3. Add routes to App.tsx
4. Update Sidebar navigation

### Phase 2: Database Changes
1. Write and test migration locally
2. Apply migration to remote database
3. Verify RLS policies filter archived projects

### Phase 3: Refactor Existing Pages
1. Wrap MilestoneTemplatesPage with SettingsLayout
2. Wrap MetadataManagementPage with SettingsLayout
3. Update routes in App.tsx
4. Remove old /metadata route

### Phase 4: Project Details Page
1. Create ProjectDetailsPage component
2. Create useUpdateProject hook
3. Create useArchiveProject hook
4. Add route to App.tsx

### Phase 5: Testing
1. Write unit tests for new components and hooks
2. Write integration tests for permission enforcement and workflows
3. Write E2E tests for complete user flows
4. Manual accessibility audit with keyboard and screen reader

### Phase 6: Documentation
1. Update CLAUDE.md with new routes and components
2. Update PROJECT-STATUS.md with feature completion
3. Create IMPLEMENTATION-NOTES.md in feature directory

## Success Criteria

1. All settings accessible from unified landing page
2. Consistent layout and navigation across all settings sections
3. Permission enforcement blocks unauthorized users
4. Archive project workflow functions correctly
5. Archived projects hidden from dashboard and project lists
6. All tests pass with ≥70% coverage
7. WCAG 2.1 AA accessibility compliance verified
8. No regressions in existing settings features (milestones, metadata)

## Future Enhancements (Out of Scope)

- Project status field (active, on_hold, completed, archived)
- Project date tracking (start date, target completion, actual completion)
- Report configuration UI (report_configs table exists but unused)
- Restore archived projects functionality
- User roles and permissions management
- Organization-level settings (beyond project scope)

## References

- Feature 026: Editable Milestone Templates - `specs/026-editable-milestone-templates/`
- KNOWLEDGE-BASE.md - Architecture patterns and RLS guidance
- GLOSSARY.md - Domain terminology and user roles
- Design Rules - `docs/plans/2025-11-06-design-rules.md`
