# Quickstart Guide: User Profile Management

**Feature**: 017-user-profile-management
**Date**: 2025-10-27
**Purpose**: Get started implementing the user profile feature with TDD workflow

## Prerequisites

Before starting implementation, ensure you have:
- ✅ Read the [spec.md](./spec.md) (feature requirements)
- ✅ Read the [plan.md](./plan.md) (implementation plan)
- ✅ Read the [research.md](./research.md) (technical decisions)
- ✅ Read the [data-model.md](./data-model.md) (entities and relationships)
- ✅ Reviewed contracts in `contracts/` (TypeScript interfaces)
- ✅ Constitution v1.0.2 principles understood (TDD, type safety, Supabase RLS)

## Development Environment Setup

### 1. Verify Branch

```bash
# Ensure you're on the feature branch
git branch  # Should show: * 017-user-profile-management

# If not, check out the branch
git checkout 017-user-profile-management
```

### 2. Install Dependencies

All required dependencies are already in `package.json`. Verify they're installed:

```bash
npm install
```

**Key dependencies for this feature:**
- `@radix-ui/react-dialog` - Modal component
- `@radix-ui/react-dropdown-menu` - Avatar dropdown
- `@tanstack/react-query` - Server state management
- `@supabase/supabase-js` - Database + Auth + Storage

### 3. Configure Supabase Storage

**Create the `avatars` bucket** (manual step, cannot be done via SQL migration):

```bash
# Option 1: Via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard/project/[PROJECT_ID]/storage/buckets
# 2. Click "New bucket"
# 3. Name: "avatars"
# 4. Public bucket: TRUE
# 5. Click "Create bucket"

# Option 2: Via Supabase CLI
supabase storage create-bucket avatars --public --linked
```

**Note**: RLS policies for the avatars bucket will be created via SQL migration later.

### 4. Run Database Migration

```bash
# Create and apply the migration
supabase migration new add_avatar_url
# Edit the migration file (supabase/migrations/00050_add_avatar_url.sql)
# See data-model.md for SQL

# Push to linked database
supabase db push --linked

# Regenerate TypeScript types
supabase gen types typescript --linked > src/types/database.types.ts
```

---

## TDD Workflow Example

This section demonstrates the **Red-Green-Refactor** cycle for implementing the first component.

### Example: Building `UserMenu.tsx`

#### Step 1: Write Failing Test (RED)

**File**: `tests/unit/components/profile/UserMenu.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { UserMenu } from '@/components/profile/UserMenu'
import { AuthContext } from '@/contexts/AuthContext'

describe('UserMenu', () => {
  const mockUser = {
    id: '123',
    email: 'john@example.com',
    avatar_url: null
  }

  const mockAuthContext = {
    user: mockUser,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn()
  }

  it('displays user avatar button', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserMenu />
      </AuthContext.Provider>
    )

    // Expect avatar button with initial letter
    const avatarButton = screen.getByRole('button', { name: /user menu/i })
    expect(avatarButton).toBeInTheDocument()
    expect(avatarButton).toHaveTextContent('J')  // First letter of email
  })

  it('opens dropdown menu when avatar clicked', async () => {
    const user = userEvent.setup()

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserMenu />
      </AuthContext.Provider>
    )

    // Click avatar button
    const avatarButton = screen.getByRole('button', { name: /user menu/i })
    await user.click(avatarButton)

    // Expect dropdown with menu items
    expect(screen.getByRole('menuitem', { name: /view profile/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls signOut when Sign Out clicked', async () => {
    const user = userEvent.setup()

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserMenu />
      </AuthContext.Provider>
    )

    // Open dropdown
    const avatarButton = screen.getByRole('button', { name: /user menu/i })
    await user.click(avatarButton)

    // Click Sign Out
    const signOutItem = screen.getByRole('menuitem', { name: /sign out/i })
    await user.click(signOutItem)

    // Expect signOut called
    expect(mockAuthContext.signOut).toHaveBeenCalledOnce()
  })
})
```

**Run the test** (it should FAIL because UserMenu doesn't exist yet):

```bash
npm test tests/unit/components/profile/UserMenu.test.tsx
```

**Expected output**:
```
FAIL  tests/unit/components/profile/UserMenu.test.tsx
  ● UserMenu › displays user avatar button
    Cannot find module '@/components/profile/UserMenu'
```

✅ **RED phase complete** - Test fails as expected

---

#### Step 2: Write Minimum Code to Pass (GREEN)

**File**: `src/components/profile/UserMenu.tsx`

```typescript
import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  // Get first letter of email for avatar fallback
  const initial = user.email?.charAt(0).toUpperCase() || '?'

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="User menu"
          className="flex items-center justify-center rounded-full bg-slate-600 text-white font-semibold w-8 h-8"
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="Avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-white rounded-md shadow-lg p-2 min-w-[200px]"
          sideOffset={5}
        >
          <DropdownMenu.Item
            className="px-3 py-2 rounded hover:bg-slate-100 cursor-pointer"
            onSelect={() => {
              // TODO: Open UserProfileModal
              console.log('View Profile clicked')
            }}
          >
            View Profile
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-slate-200 my-1" />

          <DropdownMenu.Item
            className="px-3 py-2 rounded hover:bg-slate-100 cursor-pointer text-red-600"
            onSelect={signOut}
          >
            Sign Out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
```

**Run the test again**:

```bash
npm test tests/unit/components/profile/UserMenu.test.tsx
```

**Expected output**:
```
PASS  tests/unit/components/profile/UserMenu.test.tsx
  UserMenu
    ✓ displays user avatar button (125ms)
    ✓ opens dropdown menu when avatar clicked (234ms)
    ✓ calls signOut when Sign Out clicked (189ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

✅ **GREEN phase complete** - All tests pass

---

#### Step 3: Refactor While Keeping Tests Green (REFACTOR)

Now that tests pass, refactor for quality improvements:

**Improvements to consider**:
1. Extract avatar display to separate `Avatar` component (reusable)
2. Extract dropdown menu items to constants (easier to maintain)
3. Add TypeScript interfaces for props (type safety)
4. Add accessibility attributes (ARIA labels)

**Example refactor** (extract Avatar component):

**File**: `src/components/profile/Avatar.tsx`

```typescript
interface AvatarProps {
  url: string | null
  email: string
  size?: number
}

export function Avatar({ url, email, size = 32 }: AvatarProps) {
  const initial = email.charAt(0).toUpperCase()

  if (url) {
    return (
      <img
        src={url}
        alt="Avatar"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, fontSize: size / 2 }}
    >
      {initial}
    </div>
  )
}
```

**Update UserMenu to use Avatar**:

```typescript
import { Avatar } from './Avatar'

export function UserMenu() {
  const { user, signOut } = useAuth()
  // ... rest of component

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button aria-label="User menu">
          <Avatar url={user.avatar_url} email={user.email} size={32} />
        </button>
      </DropdownMenu.Trigger>
      {/* ... rest of dropdown */}
    </DropdownMenu.Root>
  )
}
```

**Run tests again** to ensure refactoring didn't break anything:

```bash
npm test tests/unit/components/profile/UserMenu.test.tsx
```

**Expected**: All tests still pass ✅

✅ **REFACTOR phase complete** - Code is cleaner, tests still pass

---

#### Step 4: Commit

**Commit pattern** (per Constitution TDD principles):

```bash
# Stage test file first
git add tests/unit/components/profile/UserMenu.test.tsx
git commit -m "test: add UserMenu component tests (RED)"

# Stage implementation
git add src/components/profile/UserMenu.tsx src/components/profile/Avatar.tsx
git commit -m "feat: implement UserMenu with dropdown and avatar (GREEN)"

# Or combine if preferred:
git add tests/unit/components/profile/UserMenu.test.tsx \
        src/components/profile/UserMenu.tsx \
        src/components/profile/Avatar.tsx
git commit -m "feat: add UserMenu with avatar dropdown

- Add UserMenu component with Radix DropdownMenu
- Add Avatar component for display
- Include View Profile and Sign Out menu items
- Test coverage: avatar display, dropdown interaction, signOut callback

Follows TDD: tests written first (RED), implementation (GREEN), refactored to extract Avatar component (REFACTOR)"
```

---

## Implementation Order (Recommended)

Follow this order to build incrementally with TDD:

### Phase 1: Foundation (P1 - View Profile)
1. ✅ **UserMenu** (avatar dropdown) - *Start here* (example above)
2. **UserProfileModal** (modal container with open/close)
3. **ProfileInfoSection** (read-only email, org, role display)
4. **useUserProfile hook** (fetch user + org data)
5. **Integration**: Wire UserMenu → UserProfileModal → ProfileInfoSection

**Deliverable**: Users can view their profile information (P1 user story complete)

### Phase 2: Name Editing (P1 - Update Full Name)
6. **ProfileHeader** (avatar display + name edit mode)
7. **useUpdateProfile hook** (update full_name with optimistic updates)
8. **Integration**: ProfileHeader save button → useUpdateProfile

**Deliverable**: Users can edit their name (P1 user story complete)

### Phase 3: Avatar Upload (P2 - Upload Profile Photo)
9. **Avatar file validation** (lib/avatar-utils.ts)
10. **useUpdateAvatar hook** (upload to Storage + update DB)
11. **ProfileHeader avatar upload** (file picker + upload flow)

**Deliverable**: Users can upload profile photos (P2 user story complete)

### Phase 4: Password Change (P2 - Change Password)
12. **PasswordChangeForm** (form with validation)
13. **useChangePassword hook** (verify current + update new)
14. **Integration**: PasswordChangeForm → useChangePassword

**Deliverable**: Users can change passwords (P2 user story complete)

### Phase 5: Polish & Integration
15. **Layout.tsx modification** (replace avatar with UserMenu)
16. **AuthContext.tsx enhancement** (add refreshUser function)
17. **Mobile responsiveness** (test on ≤768px)
18. **Accessibility audit** (keyboard nav, ARIA, screen readers)
19. **Integration test** (complete profile workflow end-to-end)

**Deliverable**: Feature complete and production-ready

---

## Running Tests

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test UserMenu.test.tsx

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run with UI (visual test runner)
npm run test:ui
```

### Coverage Report

```bash
# Generate coverage report
npm test -- --coverage

# View HTML coverage report
open coverage/index.html
```

**Coverage targets** (enforced in CI):
- Overall: ≥70%
- `src/lib/**`: ≥80%
- `src/components/**`: ≥60%

### Integration Tests

```bash
# Run integration tests only
npm test tests/integration/

# Run specific integration test
npm test profile-workflow.test.tsx
```

---

## Common Patterns

### Mocking Supabase

```typescript
import { vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '123', email: 'test@example.com' }],
        error: null
      }),
      update: vi.fn().mockResolvedValue({
        data: { id: '123', full_name: 'John Doe' },
        error: null
      })
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/avatar.jpg' } }))
      }))
    },
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null })
    }
  }
}))
```

### Mocking TanStack Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create test query client (no retries, no cache)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 },
    mutations: { retry: false }
  }
})

// Wrap component in test
<QueryClientProvider client={queryClient}>
  <YourComponent />
</QueryClientProvider>
```

### Mocking AuthContext

```typescript
const mockAuthContext = {
  user: { id: '123', email: 'test@example.com', avatar_url: null },
  session: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn()
}

<AuthContext.Provider value={mockAuthContext}>
  <YourComponent />
</AuthContext.Provider>
```

---

## Debugging Tips

### Test Failures

```bash
# Run single test with verbose output
npm test UserMenu.test.tsx -- --reporter=verbose

# Debug test in VS Code
# 1. Add breakpoint in test file
# 2. Run "Debug Test" from VS Code test explorer
```

### Component Rendering

```typescript
import { screen, debug } from '@testing-library/react'

// Print DOM tree to console
debug()

// Print specific element
debug(screen.getByRole('button'))
```

### TanStack Query State

```typescript
// Log query cache
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()
console.log(queryClient.getQueryData(['userProfile']))
```

---

## Next Steps

1. **Review all Phase 0 and Phase 1 artifacts** (you're here now!)
2. **Run `/speckit.tasks`** to generate ordered task breakdown
3. **Run `/speckit.implement`** to execute tasks with per-task commits
4. **Follow TDD workflow** (RED → GREEN → REFACTOR) for each task

---

## Resources

- **Radix UI Dialog**: https://www.radix-ui.com/primitives/docs/components/dialog
- **Radix UI DropdownMenu**: https://www.radix-ui.com/primitives/docs/components/dropdown-menu
- **TanStack Query**: https://tanstack.com/query/latest/docs/react/overview
- **Vitest**: https://vitest.dev/guide/
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro
- **Supabase Storage**: https://supabase.com/docs/guides/storage
- **Supabase Auth**: https://supabase.com/docs/guides/auth

---

**Status**: ✅ Quickstart complete, ready for tasks generation
**Next**: Run `/speckit.tasks` to generate implementation tasks
