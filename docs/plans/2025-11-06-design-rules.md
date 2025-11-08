# PipeTrak V2 Design Rules

**Version**: 1.0.0
**Created**: 2025-11-06
**Purpose**: Establish patterns for building features that fit the existing architecture

## Philosophy

PipeTrak V2 follows three principles:

1. **Composition over configuration** - Assemble features from primitives
2. **Mobile-first accessibility** - Design for touch, scale to desktop
3. **Type safety throughout** - Database generates TypeScript types

## How to Use This Document

This cookbook provides recipes for common development tasks. Each recipe shows:
- When to use the pattern
- Required ingredients (files, hooks, components)
- Implementation steps
- Example from existing codebase
- Common pitfalls

Use recipes when building new features. Reference pattern lookup tables for quick answers.

---

## Recipe 1: Creating a New Page

**When**: Adding a new route or feature section

**Architecture**: Page component → Protected route → Layout integration → Context access

**Ingredients**:
- Page component in `src/pages/`
- Route entry in `App.tsx`
- `<ProtectedRoute>` wrapper
- `<Layout>` component for sidebar
- `useProject()` for context

**Steps**:

1. Create page component
```tsx
// src/pages/MyFeaturePage.tsx
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';

export function MyFeaturePage() {
  const { selectedProjectId } = useProject();

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        {/* Feature content */}
      </div>
    </Layout>
  );
}
```

2. Add route in `App.tsx`
```tsx
<Route
  path="/my-feature"
  element={
    <ProtectedRoute>
      <MyFeaturePage />
    </ProtectedRoute>
  }
/>
```

3. Inject context if needed
```tsx
// Wrapper for project-dependent pages
function MyFeaturePageWrapper() {
  const { selectedProjectId } = useProject();
  if (!selectedProjectId) {
    return <Navigate to="/projects" replace />;
  }
  return <MyFeaturePage projectId={selectedProjectId} />;
}
```

**Example**: `src/pages/TeamManagement.tsx` (Feature 016)

**Pitfalls**:
- Missing `<ProtectedRoute>` wrapper exposes route to unauthenticated users
- Forgetting `<Layout>` loses sidebar navigation
- No project context check causes runtime errors

---

## Recipe 2: Adding a Data Entity (CRUD Operations)

**When**: Creating or managing database entities (components, drawings, users)

**Architecture**: Custom hook → TanStack Query → Supabase client → Cache invalidation

**Ingredients**:
- Custom hook file in `src/hooks/use[Entity].ts`
- TanStack Query for queries/mutations
- Supabase client from `@/lib/supabase`
- Database types from `@/types/database.types`

**Steps**:

1. Define hook with query
```tsx
// src/hooks/useMyEntity.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type MyEntity = Database['public']['Tables']['my_entities']['Row'];

export function useMyEntities(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'my-entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_entities')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

2. Add mutation with cache invalidation
```tsx
export function useCreateMyEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newEntity: Omit<MyEntity, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('my_entities')
        .insert(newEntity)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'my-entities'],
      });
    },
  });
}
```

3. Use in component
```tsx
const { data: entities, isLoading } = useMyEntities(projectId);
const createMutation = useCreateMyEntity();

const handleCreate = (values) => {
  createMutation.mutate(values, {
    onSuccess: () => toast.success('Created'),
    onError: () => toast.error('Failed'),
  });
};
```

**Example**: `src/hooks/useComponents.ts` (full CRUD pattern)

**Pitfalls**:
- Missing cache invalidation causes stale data
- Wrong query key structure breaks invalidation
- Forgetting error handling leaves users confused
- Not using typed database types loses type safety

---

## Recipe 3: Building Forms with Validation

**When**: User input required (create/edit entities, settings, filters)

**Architecture**: Zod schema → Controlled inputs → Form state → Error display → Toast notification

**Ingredients**:
- Zod schema in `src/schemas/`
- Form component with local state
- Shadcn form primitives (`<Input>`, `<Button>`, `<Label>`)
- Toast notifications (sonner)
- Permission gates for submission

**Steps**:

1. Define validation schema
```tsx
// src/schemas/my-entity.schema.ts
import { z } from 'zod';

export const myEntitySchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'user']),
});

export type MyEntityInput = z.infer<typeof myEntitySchema>;
```

2. Build form component
```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { myEntitySchema } from '@/schemas/my-entity.schema';

export function MyEntityForm({ onSubmit }) {
  const [values, setValues] = useState({ name: '', email: '', role: 'user' });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const result = myEntitySchema.safeParse(values);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
        />
        {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

3. Mobile-responsive layout
```tsx
<form className="space-y-4 lg:space-y-6">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Fields stack on mobile, side-by-side on desktop */}
  </div>
</form>
```

**Example**: `src/components/team/InvitationForm.tsx` (Feature 016)

**Pitfalls**:
- Client-only validation allows bad data through RLS
- Uncontrolled inputs lose React state benefits
- Missing ARIA labels fail accessibility
- Hard-coded widths break mobile layout

---

## Recipe 4: Creating Tables & Lists

**When**: Displaying collections (team members, components, drawings)

**Architecture**: Desktop table → Mobile cards → Filters → Sorting → Pagination → URL state

**Ingredients**:
- Query hook for data
- Filter hooks for URL-driven state
- Responsive breakpoint: ≤1024px
- Empty states and loading skeletons

**Steps**:

1. Query data with filters
```tsx
const { data, isLoading } = useMyEntities(projectId, {
  search: searchTerm,
  role: roleFilter,
  status: statusFilter,
});
```

2. Desktop table layout
```tsx
<div className="hidden lg:block">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Name
        </th>
        {/* More columns */}
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map(item => (
        <tr key={item.id}>
          <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

3. Mobile card layout
```tsx
<div className="lg:hidden space-y-2">
  {data.map(item => (
    <div key={item.id} className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-medium">{item.name}</h3>
      <p className="text-sm text-gray-500">{item.email}</p>
    </div>
  ))}
</div>
```

4. Client-side filtering
```tsx
const filteredData = data.filter(item => {
  if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
    return false;
  }
  if (roleFilter !== 'all' && item.role !== roleFilter) {
    return false;
  }
  return true;
});
```

**Example**: `src/components/team/TeamMemberList.tsx` with filters and sorting

**Pitfalls**:
- Desktop-only design breaks mobile usability
- Missing empty states confuse users
- Server-side filtering without client fallback causes blank screens
- No loading skeleton causes layout shift

---

## Recipe 5: Adding Modals & Dialogs

**When**: Focused actions (delete confirmation, edit forms, details view)

**Architecture**: Shadcn Dialog → Local state → Trigger pattern → Keyboard navigation

**Ingredients**:
- Shadcn dialog components
- `useState` for open/close
- `asChild` trigger pattern
- Escape/Enter keyboard handlers

**Steps**:

1. Basic dialog structure
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function MyDialog({ trigger, onConfirm }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
        </DialogHeader>
        {/* Content */}
      </DialogContent>
    </Dialog>
  );
}
```

2. Confirmation dialog with mutation
```tsx
const handleConfirm = () => {
  mutation.mutate(data, {
    onSuccess: () => {
      setOpen(false);
      onConfirm?.();
    },
    onError: () => {
      setOpen(false);
    },
  });
};
```

3. Keyboard navigation
```tsx
// Radix Dialog handles automatically:
// - Escape to close
// - Tab to cycle focus
// - Enter on focused button to submit
```

4. Mobile full-screen
```tsx
<DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
  {/* Auto-adapts: full screen on mobile, modal on desktop */}
</DialogContent>
```

**Example**: `src/components/team/RemoveMemberDialog.tsx`, `src/components/field-welds/WelderAssignDialog.tsx`

**Pitfalls**:
- Missing `asChild` causes nested buttons (invalid HTML)
- No loading state during mutation confuses users
- Fixed height causes content clipping on mobile
- Custom keyboard handlers break Radix behavior
- **Transparent backgrounds**: Always use explicit `bg-white` on dialog content (not `bg-background` CSS variable)

---

## Recipe 6: Mobile-Responsive Layouts

**When**: Every feature (mobile-first is mandatory)

**Architecture**: Mobile baseline → Desktop enhancements → Touch targets → Responsive utilities

**Ingredients**:
- Breakpoint: ≤1024px for mobile
- Touch target minimum: ≥44px
- Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- `useMobileDetection()` hook (optional)

**Steps**:

1. Set mobile breakpoint
```tsx
// Mobile-first: start with mobile layout, enhance for desktop
<div className="flex flex-col lg:flex-row">
  {/* Stacks vertically on mobile, horizontal on desktop */}
</div>
```

2. Touch target sizing
```tsx
// All buttons must meet 44px minimum
<Button className="min-h-[44px] w-full lg:w-auto">
  Action
</Button>
```

3. Responsive table pattern
```tsx
{/* Desktop: Full table */}
<div className="hidden lg:block">
  <table>{/* 7+ columns */}</table>
</div>

{/* Mobile: Simplified 3-column table or cards */}
<div className="lg:hidden">
  <table>{/* 3 essential columns only */}</table>
</div>
```

4. Responsive text sizing
```tsx
<h1 className="text-2xl lg:text-3xl">Title</h1>
<p className="text-sm lg:text-base">Body text</p>
```

**Example**: `src/components/weld-log/WeldLogTable.tsx` (Feature 022 - 3-column mobile layout)

**Pitfalls**:
- Desktop-first design requires retrofitting
- Touch targets below 44px fail WCAG 2.1 AA
- Horizontal scroll on mobile ruins UX
- Fixed pixel widths break responsive flow

---

## Recipe 7: Implementing Permission-Gated Features

**When**: Actions restricted by role (delete, edit, invite)

**Architecture**: Database RLS → Client permission checks → Conditional rendering → Disabled states

**Ingredients**:
- RLS policies in database migrations
- Permission helper functions (`src/lib/permissions.ts`)
- `<PermissionGate>` component
- Role types: owner, admin, engineer, field_tech, viewer

**Steps**:

1. Check permissions
```tsx
import { canManageTeam } from '@/lib/permissions';

const canManage = canManageTeam(currentUserRole);
```

2. Conditional rendering
```tsx
{canManage && (
  <Button onClick={handleDelete}>Delete</Button>
)}
```

3. Permission gate component
```tsx
import { PermissionGate } from '@/components/PermissionGate';

<PermissionGate permission="can_update_milestones">
  <EditButton />
</PermissionGate>
```

4. Disabled state with tooltip
```tsx
<Button
  disabled={!canManage}
  title={!canManage ? "You need admin or owner role" : undefined}
>
  Remove Member
</Button>
```

5. Database RLS enforcement
```sql
-- Example: Only owners/admins can remove members
CREATE POLICY "allow_admins_to_remove_members"
ON users FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM users
    WHERE organization_id = users.organization_id
    AND role IN ('owner', 'admin')
  )
);
```

**Example**: `src/pages/TeamManagement.tsx` with role-based actions

**Pitfalls**:
- Client-only checks allow bypass via console
- Missing RLS policies leak data
- No visual feedback leaves users confused
- Hard-coded role checks break when roles change

---

## Pattern Reference

### Component Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| Page Component | Top-level routes | `TeamManagement.tsx` |
| Container Component | Data fetching + logic | `TeamMemberList.tsx` |
| Presentational Component | Pure UI, no logic | `MemberRow.tsx` |
| Feature Folder | Related components | `src/components/team/` |
| UI Primitive | Reusable atoms | `src/components/ui/button.tsx` |

### Hook Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| `useQuery` | Fetch data | `useMyEntities(projectId)` |
| `useMutation` | Create/update/delete | `useCreateMyEntity()` |
| `useState` | Local UI state | Dialog open/close |
| `useContext` | Global state | `useProject()`, `useAuth()` |
| Custom hook | Reusable logic | `useDebouncedValue()` |

**Query Key Structure**:
```tsx
// Entity list
['projects', projectId, 'entities']

// Single entity
['entities', entityId]

// With filters
['projects', projectId, 'entities', { search, filter }]
```

**Cache Invalidation**:
```tsx
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['entities', id] });

// Invalidate all entity queries for project
queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'entities'] });
```

### Styling Patterns

| Pattern | Usage |
|---------|-------|
| `cn()` helper | Merge Tailwind classes with conditional logic |
| HSL variables | `bg-primary`, `text-destructive` (defined in CSS) |
| Responsive prefix | `lg:text-xl`, `sm:flex-row` |
| Touch targets | `min-h-[44px]` for all interactive elements |
| Mobile breakpoint | `lg:` prefix for ≥1024px |

**Color System**:
```tsx
// Use design tokens, not hard-coded colors
<div className="bg-primary text-primary-foreground">  // ✅ Good
<div className="bg-blue-500 text-white">             // ❌ Bad
```

### Type Safety Patterns

| Pattern | When to Use |
|---------|-------------|
| Database types | `Database['public']['Tables']['users']['Row']` |
| Zod schemas | Runtime validation of user input |
| Utility types | `Omit<User, 'password'>` for safe types |
| Type inference | `z.infer<typeof schema>` from Zod |

**Type Import**:
```tsx
import type { Database } from '@/types/database.types';
type User = Database['public']['Tables']['users']['Row'];
```

---

## Accessibility Checklist

Every feature must meet WCAG 2.1 AA standards:

- [ ] Touch targets ≥44px on mobile
- [ ] Semantic HTML (`<button>`, `<nav>`, `<main>`)
- [ ] ARIA labels for icon buttons
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus visible on interactive elements
- [ ] Color contrast ≥4.5:1 for text
- [ ] No horizontal scroll on mobile
- [ ] Alt text for images
- [ ] Form labels associated with inputs

---

## Testing Patterns

**Required Coverage**:
- Overall: ≥70%
- `src/lib/**`: ≥80%
- `src/components/**`: ≥60%

**Test Organization**:
```
src/components/MyComponent.tsx
src/components/MyComponent.test.tsx  // Co-located unit tests
tests/integration/my-feature.test.ts  // Integration tests
tests/e2e/my-workflow.spec.ts         // E2E tests
```

**Common Test Patterns**:
```tsx
// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [...], error: null })
    }))
  }
}));

// Mock TanStack Query
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

// Render with providers
render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <MyComponent />
    </BrowserRouter>
  </QueryClientProvider>
);
```

---

## Common Pitfalls

**Architecture**:
- Skipping `<ProtectedRoute>` exposes authenticated routes
- Missing RLS policies leak data despite client checks
- Wrong query key structure breaks cache invalidation

**Mobile/Accessibility**:
- Touch targets below 44px fail WCAG standards
- Desktop-first design requires expensive retrofitting
- Missing ARIA labels break screen readers

**Data Flow**:
- Client-only validation allows bad data through
- Forgetting `queryClient.invalidateQueries()` causes stale data
- Mutation without error handling confuses users

**Performance**:
- Re-fetching on every render (missing `staleTime`)
- Rendering 1000+ rows without virtualization
- Large bundle size from unused imports

**Styling**:
- Transparent modal backgrounds (use `bg-white` explicitly, not `bg-background` CSS variable)
- CSS variable issues not caught until runtime
- Missing explicit colors cause invisible dialogs

---

## Questions & Troubleshooting

**Q: When should I use URL state vs local state?**
A: URL state for filters/search (shareable, bookmarkable). Local state for dialogs/UI (transient).

**Q: How do I test mutations?**
A: Mock the hook, verify `mutate()` called with correct arguments, test success/error callbacks.

**Q: Mobile breakpoint 768px or 1024px?**
A: 1024px per Feature 015+. Tablets use mobile layout.

**Q: Should I use Zustand or React Context?**
A: Context for auth/project (global, infrequent changes). Zustand not yet adopted.

**Q: How do I generate database types?**
A: `supabase gen types typescript --linked > src/types/database.types.ts`

---

## Version History

- **1.0.0** (2025-11-06): Initial design rules based on Features 015-022 patterns
