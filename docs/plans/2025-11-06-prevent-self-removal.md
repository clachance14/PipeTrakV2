# Prevent Self-Removal from Team - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent users from removing themselves from the team by hiding the "Remove Member" button when viewing their own row.

**Architecture:** UI-level enforcement in the MemberRow component. Add currentUserId prop, check if member.user_id matches currentUserId, and hide the Remove button when true. Parent component (TeamManagement) passes the authenticated user's ID from AuthContext.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library

---

## Task 1: Add Unit Test for Self-Removal Prevention

**Files:**
- Modify: `src/components/team/MemberRow.test.tsx` (existing test file)
- Reference: `src/components/team/MemberRow.tsx`

**Context:** The MemberRow component currently shows a "Remove Member" button for all team members when the current user has admin/owner permissions. We need to hide this button when viewing your own row to prevent accidental self-removal.

**Step 1: Write the failing test**

Add this test to the existing test suite in `src/components/team/MemberRow.test.tsx`:

```typescript
describe('MemberRow - Self-removal prevention', () => {
  it('should hide Remove button when viewing own row', () => {
    const currentUserId = 'user-123';
    const member: TeamMember = {
      user_id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      joined_at: '2025-01-01T00:00:00Z',
    };

    render(
      <MemberRow
        member={member}
        isExpanded={false}
        onToggle={vi.fn()}
        organizationId="org-1"
        currentUserRole="admin"
        currentUserId={currentUserId}
      />
    );

    expect(screen.queryByText('Remove Member')).not.toBeInTheDocument();
  });

  it('should show Remove button when viewing other users row', () => {
    const currentUserId = 'user-456';
    const member: TeamMember = {
      user_id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      joined_at: '2025-01-01T00:00:00Z',
    };

    render(
      <MemberRow
        member={member}
        isExpanded={false}
        onToggle={vi.fn()}
        organizationId="org-1"
        currentUserRole="owner"
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('Remove Member')).toBeInTheDocument();
  });

  it('should hide Remove button for non-admin even if not self', () => {
    const currentUserId = 'user-456';
    const member: TeamMember = {
      user_id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      joined_at: '2025-01-01T00:00:00Z',
    };

    render(
      <MemberRow
        member={member}
        isExpanded={false}
        onToggle={vi.fn()}
        organizationId="org-1"
        currentUserRole="viewer"
        currentUserId={currentUserId}
      />
    );

    expect(screen.queryByText('Remove Member')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/team/MemberRow.test.tsx`

Expected: FAIL with error about missing `currentUserId` prop on MemberRow component

**Step 3: Add currentUserId prop to MemberRowProps interface**

In `src/components/team/MemberRow.tsx`, update the interface (around line 9):

```typescript
interface MemberRowProps {
  member?: TeamMember;
  invitation?: Invitation;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  organizationId: string;
  currentUserRole: Role;
  currentUserId: string; // NEW: ID of authenticated user
}
```

**Step 4: Add self-check logic in MemberRow component**

In `src/components/team/MemberRow.tsx`, after line 29 (after `canRemoveMember` check), add:

```typescript
// Check if this row represents the current user
const isSelf = member?.user_id === currentUserId;
```

**Step 5: Update rendering logic to hide button for self**

In `src/components/team/MemberRow.tsx`, modify line 158 conditional:

```typescript
{/* Remove Member action (only for active members, not self) - Touch-friendly on mobile */}
{isMember && member && !isSelf && (
  <div className="w-full lg:w-auto lg:ml-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
    {canRemoveMember ? (
      <RemoveMemberDialog
        member={member}
        organizationId={organizationId}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full lg:w-auto min-h-[44px]"
          >
            Remove Member
          </Button>
        }
      />
    ) : (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="You need admin or owner role to remove members"
        className="text-slate-400 cursor-not-allowed w-full lg:w-auto min-h-[44px]"
      >
        Remove Member
      </Button>
    )}
  </div>
)}
```

**Step 6: Run test to verify it passes**

Run: `npm test -- src/components/team/MemberRow.test.tsx`

Expected: Tests still fail because TeamManagement page doesn't pass `currentUserId` yet, but the component logic is ready

**Step 7: Commit MemberRow changes**

```bash
git add src/components/team/MemberRow.tsx src/components/team/MemberRow.test.tsx
git commit -m "feat: add self-removal prevention to MemberRow component

Add currentUserId prop to MemberRow and hide Remove Member button
when viewing own row to prevent accidental self-removal.

- Add currentUserId prop to MemberRowProps interface
- Add isSelf check logic
- Update conditional rendering to exclude self
- Add unit tests for self-removal scenarios

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Update TeamManagement Page to Pass currentUserId

**Files:**
- Modify: `src/pages/TeamManagement.tsx`
- Reference: `src/contexts/AuthContext.tsx` (for useAuth hook)

**Context:** The TeamManagement page renders MemberRow components but doesn't yet pass the currentUserId prop. We need to get the authenticated user's ID from AuthContext and pass it to each MemberRow.

**Step 1: Find where MemberRow is rendered**

In `src/pages/TeamManagement.tsx`, locate the MemberRow component usage (should be in the members mapping section).

**Step 2: Get current user ID from AuthContext**

The page already imports and uses `useAuth()`. Verify the user object is available:

```typescript
const { user } = useAuth();
```

**Step 3: Pass currentUserId to MemberRow components**

Update both active member and invitation MemberRow components to include:

```typescript
<MemberRow
  // ... existing props
  currentUserId={user?.id || ''}
/>
```

**Important:** Use empty string as fallback to prevent false positives if user.id is undefined.

**Step 4: Run all tests to verify**

Run: `npm test`

Expected: All MemberRow tests should now pass, including the new self-removal prevention tests

**Step 5: Commit TeamManagement changes**

```bash
git add src/pages/TeamManagement.tsx
git commit -m "feat: pass currentUserId to MemberRow components

Wire up currentUserId prop from AuthContext to MemberRow components
to enable self-removal prevention logic.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Add Integration Test for TeamManagement Page

**Files:**
- Create: `src/pages/TeamManagement.test.tsx` (if doesn't exist)
- Modify: `src/pages/TeamManagement.test.tsx` (if exists)
- Reference: `src/pages/TeamManagement.tsx`

**Context:** Add integration test to verify the complete flow: authenticated user viewing their own row should not see the Remove button.

**Step 1: Write the integration test**

Create or add to `src/pages/TeamManagement.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamManagement } from './TeamManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authContext from '@/contexts/AuthContext';
import * as organizationHook from '@/hooks/useOrganization';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useOrganization hook
vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}));

describe('TeamManagement - Self-removal prevention', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hide Remove button on current users own row', async () => {
    const currentUserId = 'user-123';

    // Mock authenticated user
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { id: currentUserId, email: 'admin@example.com' },
      session: { access_token: 'token' } as any,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    // Mock organization data
    vi.spyOn(organizationHook, 'useOrganization').mockReturnValue({
      members: [
        {
          user_id: 'user-123',
          name: 'Current User',
          email: 'admin@example.com',
          role: 'owner',
          joined_at: '2025-01-01T00:00:00Z',
        },
        {
          user_id: 'user-456',
          name: 'Other User',
          email: 'other@example.com',
          role: 'admin',
          joined_at: '2025-01-02T00:00:00Z',
        },
      ],
      invitations: [],
      isLoading: false,
      currentUserRole: 'owner',
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TeamManagement />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Current User')).toBeInTheDocument();
    });

    // Get all "Remove Member" buttons
    const removeButtons = screen.queryAllByText('Remove Member');

    // Should only have 1 button (for Other User), not 2 (for both users)
    expect(removeButtons).toHaveLength(1);

    // Verify the button is associated with the Other User row
    const otherUserRow = screen.getByText('Other User').closest('[role="button"]');
    expect(otherUserRow?.parentElement).toContainHTML('Remove Member');

    // Verify Current User row does NOT have Remove button
    const currentUserRow = screen.getByText('Current User').closest('[role="button"]');
    expect(currentUserRow?.parentElement).not.toContainHTML('Remove Member');
  });
});
```

**Step 2: Run integration test to verify behavior**

Run: `npm test -- src/pages/TeamManagement.test.tsx`

Expected: PASS - integration test validates complete flow

**Step 3: Run full test suite with coverage**

Run: `npm test -- --coverage`

Expected: Coverage ≥70%, all tests passing

**Step 4: Commit integration test**

```bash
git add src/pages/TeamManagement.test.tsx
git commit -m "test: add integration test for self-removal prevention

Verify complete flow where authenticated user viewing their own
row does not see Remove Member button while other users do.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Manual Testing and Verification

**Context:** Automated tests verify logic, but manual testing confirms UX and edge cases.

**Step 1: Start development server**

Run: `npm run dev`

Navigate to: `http://localhost:5173/team` (or wherever TeamManagement page is mounted)

**Step 2: Test as Owner**

1. Log in as a user with owner role
2. Navigate to Team Management page
3. **Verify:** Your own row does NOT show "Remove Member" button
4. **Verify:** Other team members' rows DO show "Remove Member" button
5. **Verify:** Clicking on other members' Remove buttons works correctly

**Step 3: Test as Admin**

1. Log in as a user with admin role
2. Navigate to Team Management page
3. **Verify:** Same behavior as owner (no self-removal button)

**Step 4: Test as Viewer**

1. Log in as a user with viewer role
2. Navigate to Team Management page
3. **Verify:** NO "Remove Member" buttons visible (existing permission logic)

**Step 5: Test Edge Cases**

1. **Single member organization:** Verify you can't remove yourself (you're the only one)
2. **Multiple browser tabs:** Verify consistent behavior across tabs
3. **Mobile viewport:** Verify button layout on mobile (≤1024px)

**Step 6: Document manual test results**

Create a comment in the PR or add to implementation notes documenting manual test results.

---

## Testing Checklist

Before marking complete, verify:

- [ ] All unit tests pass (`npm test`)
- [ ] Coverage ≥70% (`npm test -- --coverage`)
- [ ] Integration test passes
- [ ] Manual testing completed for owner, admin, viewer roles
- [ ] Mobile viewport tested (≤1024px)
- [ ] No console errors or warnings
- [ ] TypeScript compilation succeeds (`tsc -b`)
- [ ] Lint passes (`npm run lint`)

---

## Related Skills

- @superpowers:test-driven-development - For TDD workflow (write test first, watch fail, implement, watch pass)
- @superpowers:verification-before-completion - For verifying all tests pass before claiming done

---

## Implementation Notes

**Why UI-only enforcement:**
- Simplest approach with minimal code changes
- Provides immediate visual feedback (no button = no confusion)
- Sufficient for preventing accidental self-removal
- Future enhancement: Add database RLS policy for defense-in-depth

**Key Files Modified:**
- `src/components/team/MemberRow.tsx` - Component logic
- `src/components/team/MemberRow.test.tsx` - Unit tests
- `src/pages/TeamManagement.tsx` - Parent component wiring
- `src/pages/TeamManagement.test.tsx` - Integration tests
