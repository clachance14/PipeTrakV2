# Research: Add New Project

**Feature**: 013-the-new-add
**Date**: 2025-10-21
**Status**: Complete

## Overview
Research findings for implementing "Add New Project" feature in PipeTrak V2. This feature adds a dropdown option for project creation and implements a dedicated form page.

## Technical Decisions

### 1. Dropdown Implementation Approach

**Decision**: Use native HTML `<select>` with special option value
**Rationale**:
- Existing dropdown already uses native select element (Layout.tsx:68-83)
- Minimal code changes (add one option + conditional navigation)
- No dependencies on Radix UI Select component
- Consistent with current implementation

**Alternatives Considered**:
- **Radix UI Select Component**: Would require replacing existing dropdown, significant refactoring
- **Separate "+" Button**: Would add UI complexity and require navbar layout changes

**Implementation Pattern**:
```tsx
<option value="__new__">➕ Add New Project</option>
```

When `value === '__new__'`, trigger navigation instead of project selection.

---

### 2. Form Validation Strategy

**Decision**: Client-side validation with React state + inline error display
**Rationale**:
- Backend validation already exists in `useCreateProject()` hook
- Prevents unnecessary network requests for obvious errors
- Immediate user feedback improves UX
- Aligns with Constitution Principle II (component responsibility)

**Validation Rules**:
- Project Name: Required, non-empty after trim, max 255 chars
- Description: Required, non-empty after trim, max 500 chars (pragmatic limit)

**Alternatives Considered**:
- **React Hook Form + Zod**: Already in dependencies, but overkill for 2 fields
- **Server-only validation**: Poor UX, unnecessary network calls

**Implementation Pattern**:
```tsx
const [errors, setErrors] = useState({ name: '', description: '' })

const validate = () => {
  const newErrors = {}
  if (!name.trim()) newErrors.name = 'Project name is required'
  if (!description.trim()) newErrors.description = 'Description is required'
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

---

### 3. Post-Creation Navigation

**Decision**: Auto-select new project + navigate to home (/)
**Rationale**:
- Matches user expectation (brainstorming session confirmed)
- Leverages existing `ProjectContext.setSelectedProjectId()`
- Immediate context switch allows user to start working
- Home page shows project-specific data (drawings, components)

**Implementation Pattern**:
```tsx
const { mutate: createProject } = useCreateProject()
const { setSelectedProjectId } = useProject()
const navigate = useNavigate()

createProject(data, {
  onSuccess: (newProject) => {
    setSelectedProjectId(newProject.id)
    navigate('/')
  }
})
```

**Alternatives Considered**:
- **Navigate to project list**: No such page exists yet
- **Stay on form with success message**: User would need to manually select project

---

### 4. Error Notification Approach

**Decision**: Use Sonner toast notifications for submission errors
**Rationale**:
- Sonner already in dependencies (package.json:41)
- Non-blocking UI feedback
- Auto-dismisses after timeout
- Used elsewhere in codebase (DrawingAssignDialog)

**Implementation Pattern**:
```tsx
import { toast } from 'sonner'

createProject(data, {
  onError: (error) => {
    toast.error(`Failed to create project: ${error.message}`)
  }
})
```

**Alternatives Considered**:
- **Inline error alert**: Requires more UI space, no auto-dismiss
- **Modal error dialog**: Too intrusive for transient errors

---

### 5. Form Component Structure

**Decision**: Single CreateProjectPage component (no separate form extraction)
**Rationale**:
- Only 2 form fields (name + description)
- Form not reused elsewhere
- YAGNI principle (don't create abstractions prematurely)
- Easier to test as single component

**Component Responsibilities**:
- **CreateProjectPage**: Form state, validation, submission, navigation
- **Layout**: Dropdown navigation trigger
- **App**: Routing configuration

**Alternatives Considered**:
- **Separate ProjectForm component**: Unnecessary abstraction for single use case
- **Generic form builder**: Over-engineering for 2 fields

---

### 6. Test Strategy

**Decision**: Component integration tests + user flow coverage
**Rationale**:
- Spec defines 7 acceptance scenarios → 7 test cases
- Testing Library simulates real user interactions
- Vitest already configured (vitest.config.ts)
- TDD principle (write tests first)

**Test Coverage**:
1. Dropdown shows "Add New Project" option
2. Clicking option navigates to /projects/new
3. Form validates empty fields
4. Form validates whitespace-only fields
5. Successful submission creates project + navigates
6. Failed submission shows error toast + stays on page
7. Cancel button returns to home

**Mocking Strategy**:
- Mock `useCreateProject()` mutation (return success/error)
- Mock `useNavigate()` (verify navigation calls)
- Mock `useProject()` (verify `setSelectedProjectId` calls)

---

## Performance Considerations

### Form Submission Latency
- **Target**: <500ms perceived latency
- **Approach**: TanStack Query optimistic updates (not implemented for this feature, mutation is fast enough)
- **Measurement**: Monitor via React DevTools Profiler

### Dropdown Rendering
- **Current**: No performance issues with <100 projects
- **Future**: If users have >100 projects, consider virtualization or search

---

## Accessibility

### Keyboard Navigation
- ✅ Dropdown navigable via Tab + Arrow keys (native select)
- ✅ Form inputs focusable and labeled
- ✅ Submit/Cancel buttons keyboard accessible

### Screen Readers
- ✅ Form labels associated with inputs (htmlFor/id)
- ✅ Error messages announced (aria-live="polite")
- ✅ Required fields marked (aria-required="true")

---

## Security

### Input Sanitization
- **Server-side**: Supabase RLS enforces organization_id isolation
- **Client-side**: No XSS risk (React escapes all content by default)
- **SQL Injection**: N/A (Supabase client uses parameterized queries)

### Authorization
- ✅ Route protected by `<ProtectedRoute>` component
- ✅ RLS policies enforce organization membership
- ✅ useCreateProject() validates user auth before calling Supabase

---

## Dependencies

### Existing (No New Additions)
- React 18.3.1 (UI framework)
- React Router v7.9.3 (routing)
- TanStack Query v5.90.2 (server state)
- Supabase JS v2.58.0 (backend)
- Sonner v2.0.7 (toast notifications)
- Vitest + Testing Library (testing)

### Why No New Dependencies?
All required functionality exists in current stack:
- Form state: React useState
- Navigation: React Router useNavigate
- Validation: Custom logic (2 fields don't justify library)
- Styling: Tailwind CSS (already configured)

---

## Risks & Mitigations

### Risk 1: User Creates Duplicate Project Names
- **Impact**: Low (no unique constraint on project names)
- **Mitigation**: Not blocking (users can differentiate by context)
- **Future**: Add optional search/deduplication if users request

### Risk 2: Form Abandonment (User Navigates Away During Submission)
- **Impact**: Low (TanStack Query handles cleanup)
- **Mitigation**: Mutation completes in background, no side effects
- **Behavior**: User not redirected if they manually navigate

### Risk 3: Dropdown Doesn't Reset After Navigation
- **Impact**: Medium (dropdown shows "__new__" instead of real project)
- **Mitigation**: Reset dropdown to selectedProjectId on navigation
- **Test**: Verify dropdown value after returning from /projects/new

---

## Open Questions (All Resolved)

~~1. Should description be required?~~ → **YES** (brainstorming decision)
~~2. Where should form appear?~~ → **Dedicated page** (brainstorming decision)
~~3. What happens after creation?~~ → **Auto-select + navigate home** (brainstorming decision)

---

## Next Steps (Phase 1)

1. Create `data-model.md` (minimal - no new entities)
2. Create contract tests for form behavior
3. Create `quickstart.md` with manual test steps
4. Update CLAUDE.md with new feature context
5. Re-evaluate Constitution Check

---

**Status**: ✅ All research complete, no blockers identified
