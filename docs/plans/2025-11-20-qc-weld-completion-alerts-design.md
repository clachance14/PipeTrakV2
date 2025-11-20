# QC Weld Completion Alerts - Design Document

**Date**: 2025-11-20
**Status**: Approved
**Feature**: Notify QC inspectors when field welds are completed

---

## Problem Statement

QC inspectors must manually check the Weld Log page to discover newly completed welds that need inspection. There is no automatic notification when a weld's `date_welded` field is set, forcing QC to rely on periodic manual checks rather than proactive alerts.

---

## Solution Overview

Extend the existing Needs Review queue with a new review type (`weld_completed`) that automatically triggers when any user sets the `date_welded` field on a field weld. Only QC inspectors will see these notifications, enforced via RLS policies.

---

## Requirements

### Functional Requirements
- **FR1**: When `date_welded` is set (NULL → NOT NULL), create a `needs_review` entry
- **FR2**: All welds trigger notification (no filtering by type, NDE status, etc.)
- **FR3**: Only users with `role='qc_inspector'` can see `weld_completed` reviews
- **FR4**: Only QC inspectors can resolve `weld_completed` reviews
- **FR5**: Resolution requires no specific action (simple acknowledgment + optional note)

### Non-Functional Requirements
- **NFR1**: Trigger must be idempotent (no duplicate reviews on subsequent updates)
- **NFR2**: Trigger must work regardless of update source (UI, import, SQL, RPC)
- **NFR3**: RLS enforcement at database level (not just UI filtering)
- **NFR4**: Minimal frontend changes (reuse existing Needs Review infrastructure)

---

## Architecture

### Implementation Approach
**PostgreSQL Database Trigger** - Automatically detects when `date_welded` changes from NULL to NOT NULL and creates corresponding `needs_review` entry.

**Alternatives Considered**:
- Edge function + client hook: Requires updating every code path that sets date_welded
- RPC wrapper: Requires refactoring existing update code
- **Selected**: Database trigger (automatic, no client changes, follows existing patterns)

---

## Database Design

### New Review Type
Add `weld_completed` to the existing `needs_review.type` field (TEXT column, no enum constraint).

### Payload Structure
```json
{
  "weld_id": "uuid",
  "weld_number": "W-051",
  "component_id": "uuid",
  "drawing_number": "DWG-001",
  "welder_id": "uuid",
  "welder_name": "John Smith",
  "date_welded": "2025-11-20",
  "weld_type": "BW",
  "nde_required": false
}
```

### RLS Policy Update

**Current Policy**: Show all `needs_review` entries to all users in the project's organization.

**Updated Policy**: Show `weld_completed` reviews ONLY to users with `role='qc_inspector'`:

```sql
CREATE POLICY needs_review_select_policy ON needs_review
FOR SELECT USING (
  -- User must be in same organization as project
  auth.uid() IN (
    SELECT id FROM users WHERE organization_id = (
      SELECT organization_id FROM projects WHERE id = needs_review.project_id
    )
  )
  AND (
    -- Non-QC review types: visible to everyone
    type != 'weld_completed'
    OR
    -- weld_completed type: only visible to QC inspectors
    (type = 'weld_completed' AND auth.uid() IN (
      SELECT id FROM users WHERE role = 'qc_inspector'
    ))
  )
);
```

**Resolution Permissions**: Existing UPDATE policy already restricts based on user role. No changes needed - QC inspectors already have permission to update `needs_review` table.

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION notify_qc_on_weld_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when date_welded transitions from NULL to NOT NULL
  IF OLD.date_welded IS NULL AND NEW.date_welded IS NOT NULL THEN

    -- Create needs_review entry with full weld context
    INSERT INTO needs_review (
      project_id,
      type,
      payload,
      status,
      created_at
    )
    SELECT
      NEW.project_id,
      'weld_completed',
      jsonb_build_object(
        'weld_id', NEW.id,
        'weld_number', c.weld_number,
        'component_id', NEW.component_id,
        'drawing_number', d.drawing_number,
        'welder_id', NEW.welder_id,
        'welder_name', w.full_name,
        'date_welded', NEW.date_welded,
        'weld_type', NEW.weld_type,
        'nde_required', NEW.nde_required
      ),
      'pending',
      NOW()
    FROM components c
    LEFT JOIN drawings d ON c.drawing_id = d.id
    LEFT JOIN welders w ON NEW.welder_id = w.id
    WHERE c.id = NEW.component_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key Design Decisions**:
- **AFTER UPDATE trigger**: Ensures `date_welded` is committed before creating review
- **SECURITY DEFINER**: Allows trigger to insert into `needs_review` with elevated permissions
- **Single INSERT with joins**: Atomic operation, avoids race conditions
- **Idempotent check**: `OLD.date_welded IS NULL AND NEW.date_welded IS NOT NULL` prevents duplicates

### Trigger Registration

```sql
CREATE TRIGGER weld_completion_notification
AFTER UPDATE ON field_welds
FOR EACH ROW
EXECUTE FUNCTION notify_qc_on_weld_completion();
```

---

## Frontend Changes

### Minimal Updates Required

**File**: `src/pages/NeedsReviewPage.tsx`

1. **Add `weld_completed` to filter dropdown**:
   ```typescript
   const reviewTypes = [
     'out_of_sequence',
     'rollback',
     'delta_quantity',
     'drawing_change',
     'similar_drawing',
     'verify_welder',
     'weld_completed' // NEW
   ];
   ```

2. **Add rendering logic for `weld_completed` payload**:
   ```typescript
   if (review.type === 'weld_completed') {
     const payload = review.payload as WeldCompletedPayload;
     return (
       <div>
         <strong>{payload.weld_number}</strong> on {payload.drawing_number}
         <br/>
         Completed on {payload.date_welded}
         {payload.welder_name && ` by ${payload.welder_name}`}
         {payload.nde_required && <Badge>NDE Required</Badge>}
       </div>
     );
   }
   ```

3. **Optional enhancement**: Add link to Weld Log page filtered to specific weld for quick navigation.

### No Changes Required

- **Weld creation dialogs** (CreateUnplannedWeldDialog)
- **Welder assignment dialogs** (WelderAssignDialog)
- **Import flows** (useImportFieldWelds, Excel import edge function)
- **Trigger fires automatically regardless of update source**

---

## Testing Strategy

### Database Integration Tests

**File**: `tests/integration/triggers/weld-completion.test.ts`

1. **Happy path**: Update `date_welded` from NULL → '2025-11-20', verify `needs_review` entry created
2. **Idempotency**: Update `date_welded` again (already set), verify NO duplicate review created
3. **Payload accuracy**: Verify all joined data (welder name, drawing number, etc.) populated correctly
4. **Null welder**: Update `date_welded` when `welder_id` is NULL, verify review still created (welder_name null)

### RLS Policy Tests

**File**: `tests/integration/rls/needs-review-qc.test.ts`

1. **QC visibility**: Query `needs_review` as QC inspector, verify `weld_completed` entries visible
2. **Non-QC filtering**: Query as PM/Foreman/Admin, verify `weld_completed` entries NOT visible
3. **Other review types**: Verify non-QC users still see other review types (out_of_sequence, etc.)
4. **Resolution permissions**: Verify only QC can UPDATE `status='resolved'` for `weld_completed` type
5. **Project isolation**: Verify reviews only visible to users in same organization

### Frontend Unit Tests

**File**: `src/pages/NeedsReviewPage.test.tsx`

1. **Rendering**: Mock `weld_completed` review data, verify display shows weld number, drawing, date
2. **Filtering**: Verify `weld_completed` appears in type filter dropdown
3. **Role-based UI**: Mock QC user, verify review visible; mock PM user, verify hidden
4. **Optional link**: If implemented, verify link to Weld Log renders correctly

### End-to-End Test

**File**: `tests/e2e/qc-weld-completion-workflow.spec.ts`

1. Login as PM user
2. Create field weld (via CreateUnplannedWeldDialog)
3. Assign welder and set `date_welded` (via WelderAssignDialog)
4. Logout and login as QC user
5. Navigate to Needs Review page
6. Verify `weld_completed` entry appears with correct details
7. Resolve entry with optional note
8. Verify entry marked resolved and removed from pending queue
9. Logout and login as PM user
10. Verify PM does not see the `weld_completed` entry in Needs Review

---

## Implementation Checklist

- [ ] Write migration file: `supabase/migrations/XXXXXX_qc_weld_completion_alerts.sql`
  - [ ] Drop existing `needs_review` SELECT policy
  - [ ] Create updated SELECT policy with `weld_completed` filtering
  - [ ] Create `notify_qc_on_weld_completion()` function
  - [ ] Create `weld_completion_notification` trigger
- [ ] Test migration on staging: `./db-push.sh`
- [ ] Regenerate TypeScript types: `supabase gen types typescript --linked`
- [ ] Update `src/pages/NeedsReviewPage.tsx`
  - [ ] Add `weld_completed` to filter dropdown
  - [ ] Add rendering logic for `weld_completed` payload
  - [ ] (Optional) Add link to Weld Log page
- [ ] Write database trigger tests
- [ ] Write RLS policy tests
- [ ] Write frontend unit tests
- [ ] Write E2E workflow test
- [ ] Verify all tests pass
- [ ] Deploy to production

---

## Migration File Location

`supabase/migrations/XXXXXX_qc_weld_completion_alerts.sql`

---

## Files Modified

- `supabase/migrations/XXXXXX_qc_weld_completion_alerts.sql` (new)
- `src/pages/NeedsReviewPage.tsx` (update rendering + filter)
- `src/types/database.types.ts` (regenerate after migration)
- `tests/integration/triggers/weld-completion.test.ts` (new)
- `tests/integration/rls/needs-review-qc.test.ts` (new)
- `src/pages/NeedsReviewPage.test.tsx` (update)
- `tests/e2e/qc-weld-completion-workflow.spec.ts` (new)

---

## Success Criteria

✅ When `date_welded` is set, `needs_review` entry created automatically
✅ Only QC inspectors see `weld_completed` reviews (RLS enforced)
✅ QC can resolve reviews from Needs Review page
✅ Non-QC users cannot see or resolve `weld_completed` reviews
✅ Trigger is idempotent (no duplicate reviews)
✅ All database, RLS, frontend, and E2E tests pass
✅ Works regardless of update source (UI, import, bulk operations)

---

## Future Enhancements (Out of Scope)

- Email notifications to QC inspectors
- In-app notification center with bell icon
- Real-time alerts via Supabase Realtime
- Daily digest of pending QC tasks
- User notification preferences
