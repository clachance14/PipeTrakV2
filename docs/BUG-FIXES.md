# Bug Fix History

This document tracks all bug fixes applied to the PipeTrak V2 system. Bug fixes are organized chronologically (most recent first) to provide a historical record of issues encountered and resolved.

For the most current bug fix status, see the "Recent Bug Fixes" section in `/CLAUDE.md`.

---

## 2025-11-08: Welder Assignment 400 Error - CRITICAL FIX

**Status**: RESOLVED

**Severity**: Critical - Blocking core functionality

**Issue**: 400 Bad Request error when assigning welders in Component Detail modal

### Root Cause
Schema evolution inconsistency between data storage and RPC expectations:
- `current_milestones` JSONB field stored boolean values (`true`/`false`)
- `update_component_milestone` RPC expected numeric values (`1`/`0`)

### Error Details
- **Error Message**: `invalid input syntax for type numeric: "true"`
- **PostgreSQL Error Code**: 22P02
- **Affected Components**: Field weld components and other component types with discrete milestones (28 components total)

### Solution
Data migration converted all boolean milestone values to numeric format

### Files Modified
- `src/hooks/useAssignWelder.ts`
- `src/components/WelderAssignDialog.tsx`
- `src/components/ComponentDetailView.tsx`

### Database Changes
- **Migration**: `supabase/migrations/00084_convert_boolean_milestones_to_numeric.sql`
- Converted all boolean milestone values to numeric (1/0) format
- Updated 28 affected components

### Testing
- Verified welder assignment flow in Component Detail modal
- Tested discrete milestone updates with numeric values
- Confirmed no regression in partial milestone functionality

---

## 2025-11-05: Team Management - Remove Member Functionality

**Status**: RESOLVED

**Severity**: Medium - Feature not working as expected

**Issue**: Remove Member button disabled for owners/admins, preventing member removal

### Root Cause
Two-layer issue affecting remove member functionality:
1. **Database Layer**: Missing RLS policy preventing owners/admins from soft-deleting users in their organization
2. **UI Layer**: Missing `currentUserRole` prop in TeamManagement page component

### Solution
1. Added RLS policy allowing owners/admins to soft-delete organization members
2. Fixed missing prop passing in TeamManagement page

### Files Modified
- `src/pages/TeamManagement.tsx` - Added currentUserRole prop
- Database migration for RLS policy update
- Test coverage for remove member functionality

### Database Changes
- **Migration**: `supabase/migrations/00081_allow_admins_to_remove_members.sql`
- Added RLS policy for soft-delete operations
- Policy scope: Owners and admins within the same organization

### Testing
- Verified owner can remove team members
- Verified admin can remove team members
- Verified non-admin/non-owner cannot remove members
- Tested soft-delete behavior (deleted_at timestamp)

---

## Additional Bug Fixes

For historical bug fixes prior to 2025-11-05, see feature-specific implementation notes in the `specs/` directory:

- **Feature 016**: Team Management UI - `specs/016-team-management-ui/IMPLEMENTATION-NOTES.md`
- **Feature 015**: Mobile Milestone Updates - `specs/015-mobile-milestone-updates/IMPLEMENTATION-NOTES.md`
- **Feature 011**: Drawing & Component Metadata - `specs/011-the-drawing-component/IMPLEMENTATION_STATUS.md`
- **Feature 010**: Component Progress Table - `specs/010-let-s-spec/IMPLEMENTATION_STATUS.md`

---

## Bug Fix Template

When documenting new bug fixes, use this template:

```markdown
## YYYY-MM-DD: Bug Title

**Status**: RESOLVED | IN PROGRESS | MONITORING

**Severity**: Critical | High | Medium | Low

**Issue**: Brief description of the bug

### Root Cause
Detailed explanation of what caused the bug

### Error Details (if applicable)
- Error messages
- Error codes
- Affected users/components

### Solution
What was done to fix the bug

### Files Modified
- List of files changed

### Database Changes (if applicable)
- Migration file names
- Schema changes

### Testing
- Test scenarios performed
- Verification steps
```

---

## Reporting Bugs

If you encounter a bug:

1. Check this file and `/CLAUDE.md` to see if it's a known issue
2. Create a GitHub issue with reproduction steps
3. Include error messages, screenshots, and environment details
4. Tag with appropriate severity label (critical, high, medium, low)

---

**Last Updated**: 2025-11-08
