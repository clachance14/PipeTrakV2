# Prevent Self-Removal from Team

**Date**: 2025-11-06
**Status**: Design Approved
**Related Feature**: Feature 016 - Team Management UI

## Problem

Users with admin or owner roles can currently remove themselves from the team using the "Remove Member" button on their own row. This creates a poor user experience and could lead to accidental self-removal.

## Solution

Hide the "Remove Member" button when a user views their own row in the team member list.

## Architecture

### Implementation Layer
**UI Component Level** - Enforce prevention at the MemberRow component by hiding the button.

**Rationale**:
- Provides immediate visual feedback (no button = no confusion)
- Simplest implementation with minimal code changes
- Consistent with existing permission checks (role-based rendering)
- Prevents accidental self-removal for typical use cases

**Trade-off**: Does not prevent API calls if user bypasses UI. For production hardening, consider adding database RLS policy validation in a future enhancement.

## Component Changes

### MemberRow.tsx

**1. Add new prop**:
```typescript
interface MemberRowProps {
  // ... existing props
  currentUserId: string;  // NEW: ID of the currently authenticated user
}
```

**2. Add self-check logic** (after line 29):
```typescript
const isSelf = member?.user_id === currentUserId;
```

**3. Update rendering logic** (line 158):
```typescript
{isMember && member && !isSelf && (
  // existing RemoveMemberDialog code
)}
```

### TeamManagement.tsx

**1. Get current user ID**:
Already available via `user` from `useAuth()` context.

**2. Pass prop to MemberRow**:
```typescript
<MemberRow
  currentUserId={user?.id || ''}
  // ... other props
/>
```

## Edge Cases

| Case | Handling |
|------|----------|
| `user?.id` is undefined | Pass empty string to prevent false positives |
| Invitation rows (no member object) | Check happens after `isMember` check, so invitations unaffected |
| User lacks admin/owner role | Existing `canRemoveMember` check already hides button |
| Multiple members with same ID | Shouldn't occur (database constraint), but self-check handles gracefully |

## Testing Strategy

### Unit Tests (MemberRow.test.tsx)

1. **Test**: When `currentUserId` matches `member.user_id`, Remove button should not render
2. **Test**: When `currentUserId` differs from `member.user_id`, Remove button should render (if user has permission)
3. **Test**: When user is not admin/owner, button shouldn't render regardless of `currentUserId`
4. **Test**: Invitations (no `member` object) should not be affected by self-check

**Example**:
```typescript
it('hides Remove button when viewing own row', () => {
  const currentUser = 'user-123';
  render(
    <MemberRow
      member={{ user_id: 'user-123', ...otherProps }}
      currentUserId={currentUser}
      currentUserRole="admin"
      {...otherProps}
    />
  );
  expect(screen.queryByText('Remove Member')).not.toBeInTheDocument();
});
```

### Integration Tests (TeamManagement page)

1. **Test**: Current user's row does not show Remove button
2. **Test**: Other members' rows show Remove button (for admin/owner)
3. **Test**: Multiple members edge case validation

**Coverage Target**: ≥70% (per project standards)

## Implementation Checklist

- [ ] Update `MemberRowProps` interface with `currentUserId` prop
- [ ] Add `isSelf` check in MemberRow component
- [ ] Update conditional rendering logic to include `!isSelf`
- [ ] Pass `currentUserId` from TeamManagement page
- [ ] Write unit tests for MemberRow self-removal scenarios
- [ ] Write integration test for TeamManagement page
- [ ] Verify coverage meets ≥70% threshold
- [ ] Manual testing across different roles (owner, admin, viewer)
- [ ] Manual testing with multiple team members

## Future Enhancements

**Database Layer Validation** (optional):
Add RLS policy to prevent self-removal at the database level for defense-in-depth security. This would catch API calls that bypass the UI.

```sql
-- Example RLS policy (not implemented in this design)
CREATE POLICY "users_cannot_remove_themselves"
ON users FOR UPDATE
USING (auth.uid() != id OR deleted_at IS NULL);
```

**Consideration**: Only needed if API security becomes a concern or if there's evidence of UI bypass attempts.
