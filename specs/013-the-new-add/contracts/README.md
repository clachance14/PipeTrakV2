# Component Contracts: Add New Project

**Feature**: 013-the-new-add
**Type**: UI-only feature (no backend API changes)

## Overview
This feature has no new REST/GraphQL API endpoints. All backend interaction uses the existing `useCreateProject()` mutation hook, which calls Supabase client methods.

Instead of API contracts, we define **component behavior contracts** that specify the expected inputs, outputs, and side effects of each component.

---

## Contract 1: Dropdown Navigation

**Component**: `Layout.tsx` (modified)
**Behavior**: Dropdown includes "Add New Project" option that triggers navigation

### Input
- User clicks dropdown
- User selects option with value `"__new__"`

### Expected Output
- Navigate to `/projects/new` route
- Dropdown value resets to `selectedProjectId` (does not show "__new__" as selected)
- `selectedProjectId` in ProjectContext **unchanged**

### Test Assertions
```typescript
describe('Layout dropdown navigation', () => {
  it('includes "Add New Project" option in dropdown', () => {
    render(<Layout><div /></Layout>)
    const dropdown = screen.getByRole('combobox')
    expect(dropdown).toContainHTML('➕ Add New Project')
  })

  it('navigates to /projects/new when "Add New Project" selected', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    render(<Layout><div /></Layout>)
    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: '__new__' } })

    expect(navigate).toHaveBeenCalledWith('/projects/new')
  })

  it('does not change selectedProjectId when navigating to create page', () => {
    const setSelectedProjectId = vi.fn()
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: 'existing-project-id',
      setSelectedProjectId
    })

    render(<Layout><div /></Layout>)
    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: '__new__' } })

    expect(setSelectedProjectId).not.toHaveBeenCalled()
  })
})
```

---

## Contract 2: Form Validation

**Component**: `CreateProjectPage.tsx` (new)
**Behavior**: Form validates required fields before submission

### Input States
1. Empty name field
2. Empty description field
3. Whitespace-only name
4. Whitespace-only description
5. Valid name + valid description

### Expected Outputs
| Input State | Submit Enabled | Error Displayed | Network Call |
|-------------|---------------|-----------------|--------------|
| Empty name | ❌ | "Project name is required" | ❌ |
| Empty description | ❌ | "Description is required" | ❌ |
| Whitespace name | ❌ | "Project name is required" | ❌ |
| Whitespace desc | ❌ | "Description is required" | ❌ |
| Valid both | ✅ | None | ✅ |

### Test Assertions
```typescript
describe('CreateProjectPage form validation', () => {
  it('displays error when name is empty', async () => {
    render(<CreateProjectPage />)
    const nameInput = screen.getByLabelText(/project name/i)
    const descInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create project/i })

    await userEvent.clear(nameInput)
    await userEvent.type(descInput, 'Valid description')
    await userEvent.click(submitButton)

    expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
  })

  it('displays error when description is empty', async () => {
    render(<CreateProjectPage />)
    const nameInput = screen.getByLabelText(/project name/i)
    const descInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create project/i })

    await userEvent.type(nameInput, 'Valid project name')
    await userEvent.clear(descInput)
    await userEvent.click(submitButton)

    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
  })

  it('displays error when name is whitespace-only', async () => {
    render(<CreateProjectPage />)
    const nameInput = screen.getByLabelText(/project name/i)
    const submitButton = screen.getByRole('button', { name: /create project/i })

    await userEvent.type(nameInput, '   ')
    await userEvent.click(submitButton)

    expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
  })
})
```

---

## Contract 3: Successful Project Creation

**Component**: `CreateProjectPage.tsx` (new)
**Behavior**: Successful submission creates project, auto-selects it, and navigates home

### Input
- Valid name: "New Construction Project"
- Valid description: "Downtown pipeline installation"
- `useCreateProject()` mutation succeeds

### Expected Output
1. Call `createProject({ name, description })`
2. On success, call `setSelectedProjectId(newProject.id)`
3. Call `navigate('/')`
4. Display no error messages

### Test Assertions
```typescript
describe('CreateProjectPage successful creation', () => {
  it('creates project, auto-selects, and navigates on success', async () => {
    const mockMutate = vi.fn((data, { onSuccess }) => {
      const newProject = { id: 'new-project-id', name: data.name, description: data.description }
      onSuccess(newProject)
    })
    vi.mocked(useCreateProject).mockReturnValue({ mutate: mockMutate, isPending: false })

    const setSelectedProjectId = vi.fn()
    vi.mocked(useProject).mockReturnValue({ selectedProjectId: null, setSelectedProjectId })

    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    render(<CreateProjectPage />)

    await userEvent.type(screen.getByLabelText(/project name/i), 'New Construction Project')
    await userEvent.type(screen.getByLabelText(/description/i), 'Downtown pipeline installation')
    await userEvent.click(screen.getByRole('button', { name: /create project/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'New Construction Project', description: 'Downtown pipeline installation' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(setSelectedProjectId).toHaveBeenCalledWith('new-project-id')
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
```

---

## Contract 4: Failed Project Creation

**Component**: `CreateProjectPage.tsx` (new)
**Behavior**: Failed submission shows error toast and keeps user on page

### Input
- Valid name: "Test Project"
- Valid description: "Test Description"
- `useCreateProject()` mutation fails with error

### Expected Output
1. Call `createProject({ name, description })`
2. On error, display toast: `toast.error('Failed to create project: {error.message}')`
3. Do **NOT** call `setSelectedProjectId()`
4. Do **NOT** call `navigate()`
5. Form data preserved (inputs not cleared)

### Test Assertions
```typescript
describe('CreateProjectPage failed creation', () => {
  it('shows error toast and stays on page when creation fails', async () => {
    const mockMutate = vi.fn((data, { onError }) => {
      onError(new Error('Network error'))
    })
    vi.mocked(useCreateProject).mockReturnValue({ mutate: mockMutate, isPending: false })

    const setSelectedProjectId = vi.fn()
    const navigate = vi.fn()
    vi.mocked(useProject).mockReturnValue({ selectedProjectId: null, setSelectedProjectId })
    vi.mocked(useNavigate).mockReturnValue(navigate)

    render(<CreateProjectPage />)

    await userEvent.type(screen.getByLabelText(/project name/i), 'Test Project')
    await userEvent.type(screen.getByLabelText(/description/i), 'Test Description')
    await userEvent.click(screen.getByRole('button', { name: /create project/i }))

    expect(screen.getByText(/failed to create project: network error/i)).toBeInTheDocument()
    expect(setSelectedProjectId).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/project name/i)).toHaveValue('Test Project')
  })
})
```

---

## Contract 5: Cancel Navigation

**Component**: `CreateProjectPage.tsx` (new)
**Behavior**: Cancel button navigates to home without creating project

### Input
- User enters data in form (or doesn't)
- User clicks Cancel button

### Expected Output
1. Do **NOT** call `createProject()`
2. Call `navigate('/')`
3. Form data discarded (not persisted)

### Test Assertions
```typescript
describe('CreateProjectPage cancel', () => {
  it('navigates to home without creating project', async () => {
    const mockMutate = vi.fn()
    vi.mocked(useCreateProject).mockReturnValue({ mutate: mockMutate, isPending: false })

    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    render(<CreateProjectPage />)

    await userEvent.type(screen.getByLabelText(/project name/i), 'Partial data')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockMutate).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
```

---

## Contract 6: Submit Button Disabled During Submission

**Component**: `CreateProjectPage.tsx` (new)
**Behavior**: Submit button disabled while mutation is pending

### Input
- User submits valid form
- Mutation is pending (network in progress)

### Expected Output
- Submit button has `disabled` attribute
- Button text or icon shows loading state (optional)

### Test Assertions
```typescript
describe('CreateProjectPage loading state', () => {
  it('disables submit button while mutation is pending', () => {
    vi.mocked(useCreateProject).mockReturnValue({ mutate: vi.fn(), isPending: true })

    render(<CreateProjectPage />)

    const submitButton = screen.getByRole('button', { name: /create project/i })
    expect(submitButton).toBeDisabled()
  })
})
```

---

## No Backend API Contracts
This feature does **NOT** define any new REST/GraphQL endpoints. All backend interaction happens via the existing `useCreateProject()` hook, which internally calls:

```typescript
supabase.from('projects').insert(projectData).select().single()
```

The Supabase client handles:
- Request serialization
- Authentication headers
- RLS policy enforcement
- Response deserialization

**Existing Backend Contract** (unchanged):
- **Endpoint**: Supabase REST API (`/rest/v1/projects`)
- **Method**: POST
- **Auth**: Bearer token (Supabase session)
- **Body**: `{ name: string, description: string, organization_id: UUID }`
- **Response**: `{ id: UUID, name: string, description: string, organization_id: UUID, created_at: timestamp, updated_at: timestamp }`

---

**Status**: ✅ Component contracts defined, ready for test implementation
