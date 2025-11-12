# Unified Settings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create unified settings hub at `/projects/:projectId/settings` with landing page and three subsections (Milestone Templates, Metadata, Project Details) using shared layout component.

**Architecture:** Unified Layout approach with shared SettingsLayout component providing consistent header, breadcrumbs, and permission enforcement. Refactor existing pages (Milestones, Metadata) to use layout. Add new Project Details page with soft delete capability.

**Tech Stack:** React 18, TypeScript, TanStack Query v5, React Router v7, Supabase PostgreSQL, Tailwind CSS, Vitest, Testing Library

---

## Task 1: Database Migration - Add Soft Delete to Projects

**Files:**
- Create: `supabase/migrations/00110_add_deleted_at_to_projects.sql`

**Step 1: Write migration for deleted_at column**

Create migration file:

```sql
-- Add soft delete capability to projects table
ALTER TABLE projects
ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- Add index for query performance
CREATE INDEX idx_projects_deleted_at
ON projects(deleted_at);

-- Add comment documenting soft delete pattern
COMMENT ON COLUMN projects.deleted_at IS
'Soft delete timestamp. NULL = active, NOT NULL = archived. Archived projects hidden from UI but recoverable.';
```

**Step 2: Update RLS policies to filter archived projects**

Add to same migration file:

```sql
-- Update all SELECT policies to filter archived projects
-- Policy: Users can view projects in their organization
DROP POLICY IF EXISTS "Users can view projects in their organization" ON projects;
CREATE POLICY "Users can view projects in their organization"
ON projects
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- Policy: Users can update projects in their organization
DROP POLICY IF EXISTS "Users can update projects in their organization" ON projects;
CREATE POLICY "Users can update projects in their organization"
ON projects
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

**Step 3: Apply migration to remote database**

Run:
```bash
./db-push.sh
```

Expected: Migration applied successfully

**Step 4: Regenerate TypeScript types**

Run:
```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

Expected: Types updated with deleted_at field

**Step 5: Commit migration**

```bash
git add supabase/migrations/00110_add_deleted_at_to_projects.sql src/types/database.types.ts
git commit -m "feat: add soft delete to projects table"
```

---

## Task 2: SettingsLayout Component - Test Setup

**Files:**
- Create: `src/components/settings/SettingsLayout.test.tsx`

**Step 1: Write test for basic rendering**

```typescript
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SettingsLayout } from './SettingsLayout'
import { usePermissions } from '@/hooks/usePermissions'

vi.mock('@/hooks/usePermissions')

describe('SettingsLayout', () => {
  beforeEach(() => {
    vi.mocked(usePermissions).mockReturnValue({
      role: 'admin',
      can_manage_project: true,
      can_manage_team: false,
      can_update_milestones: true,
      can_edit_metadata: true,
      can_view_reports: true,
    })
  })

  it('renders title and description', () => {
    render(
      <BrowserRouter>
        <SettingsLayout title="Test Settings" description="Test description">
          <div>Content</div>
        </SettingsLayout>
      </BrowserRouter>
    )

    expect(screen.getByText('Test Settings')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/components/settings/SettingsLayout.test.tsx
```

Expected: FAIL with "Cannot find module './SettingsLayout'"

---

## Task 3: SettingsLayout Component - Implementation

**Files:**
- Create: `src/components/settings/SettingsLayout.tsx`

**Step 1: Create SettingsLayout component**

```typescript
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'

interface SettingsLayoutProps {
  title: string
  description: string
  children: ReactNode
}

export function SettingsLayout({ title, description, children }: SettingsLayoutProps) {
  const { can_manage_project } = usePermissions()
  const projectId = window.location.pathname.split('/')[2] // Extract from URL

  if (!can_manage_project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to access project settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-600 mb-6" aria-label="Breadcrumb">
        <Link
          to={`/projects/${projectId}/settings`}
          className="hover:text-slate-900 transition-colors"
        >
          Settings
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600">{description}</p>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  )
}
```

**Step 2: Run test to verify it passes**

Run:
```bash
npm test -- src/components/settings/SettingsLayout.test.tsx
```

Expected: PASS

**Step 3: Add test for permission denial**

Add to test file:

```typescript
it('shows access denied for unauthorized users', () => {
  vi.mocked(usePermissions).mockReturnValue({
    role: 'viewer',
    can_manage_project: false,
    can_manage_team: false,
    can_update_milestones: false,
    can_edit_metadata: false,
    can_view_reports: true,
  })

  render(
    <BrowserRouter>
      <SettingsLayout title="Test Settings" description="Test description">
        <div>Content</div>
      </SettingsLayout>
    </BrowserRouter>
  )

  expect(screen.getByText('Access Denied')).toBeInTheDocument()
  expect(screen.queryByText('Content')).not.toBeInTheDocument()
})
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/components/settings/SettingsLayout.test.tsx
```

Expected: PASS

**Step 5: Add test for breadcrumbs**

Add to test file:

```typescript
it('renders breadcrumb navigation', () => {
  render(
    <BrowserRouter>
      <SettingsLayout title="Milestone Templates" description="Test description">
        <div>Content</div>
      </SettingsLayout>
    </BrowserRouter>
  )

  expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  expect(screen.getByText('Milestone Templates')).toBeInTheDocument()
})
```

**Step 6: Run tests to verify they pass**

Run:
```bash
npm test -- src/components/settings/SettingsLayout.test.tsx
```

Expected: PASS (all tests)

**Step 7: Commit SettingsLayout**

```bash
git add src/components/settings/SettingsLayout.tsx src/components/settings/SettingsLayout.test.tsx
git commit -m "feat: add SettingsLayout component with breadcrumbs and permission gate"
```

---

## Task 4: SettingsIndexPage Component - Test Setup

**Files:**
- Create: `src/pages/SettingsIndexPage.test.tsx`

**Step 1: Write test for card rendering**

```typescript
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SettingsIndexPage } from './SettingsIndexPage'
import { usePermissions } from '@/hooks/usePermissions'

vi.mock('@/hooks/usePermissions')

describe('SettingsIndexPage', () => {
  beforeEach(() => {
    vi.mocked(usePermissions).mockReturnValue({
      role: 'admin',
      can_manage_project: true,
      can_manage_team: false,
      can_update_milestones: true,
      can_edit_metadata: true,
      can_view_reports: true,
    })
  })

  it('renders all three settings cards', () => {
    render(
      <BrowserRouter>
        <SettingsIndexPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Milestone Templates')).toBeInTheDocument()
    expect(screen.getByText('Metadata Management')).toBeInTheDocument()
    expect(screen.getByText('Project Details')).toBeInTheDocument()
  })

  it('renders manage buttons for each card', () => {
    render(
      <BrowserRouter>
        <SettingsIndexPage />
      </BrowserRouter>
    )

    const buttons = screen.getAllByRole('link', { name: /manage/i })
    expect(buttons).toHaveLength(3)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/pages/SettingsIndexPage.test.tsx
```

Expected: FAIL with "Cannot find module './SettingsIndexPage'"

---

## Task 5: SettingsIndexPage Component - Implementation

**Files:**
- Create: `src/pages/SettingsIndexPage.tsx`

**Step 1: Create SettingsIndexPage component**

```typescript
import { Link, useParams } from 'react-router-dom'
import { Sliders, Database, FolderCog, ArrowRight } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'

interface SettingsCard {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  path: string
}

export function SettingsIndexPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { can_manage_project } = usePermissions()

  if (!can_manage_project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to access project settings.</p>
        </div>
      </div>
    )
  }

  const cards: SettingsCard[] = [
    {
      title: 'Milestone Templates',
      description: 'Customize progress tracking weights for each component type. Changes apply to all existing and future components.',
      icon: Sliders,
      path: `/projects/${projectId}/settings/milestones`,
    },
    {
      title: 'Metadata Management',
      description: 'Create and manage Areas, Systems, and Test Packages used to organize and categorize components across your project.',
      icon: Database,
      path: `/projects/${projectId}/settings/metadata`,
    },
    {
      title: 'Project Details',
      description: 'Edit project name and description, or archive this project to hide it from active project lists.',
      icon: FolderCog,
      path: `/projects/${projectId}/settings/project`,
    },
  ]

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Project Settings</h1>
        <p className="text-slate-600">
          Manage your project configuration, templates, and metadata
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.path}
              to={card.path}
              className="block p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
            >
              <Icon className="w-8 h-8 text-blue-600 mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{card.title}</h2>
              <p className="text-sm text-slate-600 mb-4 min-h-[3rem]">{card.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">Manage</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Run test to verify it passes**

Run:
```bash
npm test -- src/pages/SettingsIndexPage.test.tsx
```

Expected: PASS

**Step 3: Add test for card navigation**

Add to test file:

```typescript
it('links to correct subsections', () => {
  // Mock useParams to return projectId
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useParams: () => ({ projectId: 'test-project-id' }),
    }
  })

  render(
    <BrowserRouter>
      <SettingsIndexPage />
    </BrowserRouter>
  )

  expect(screen.getByRole('link', { name: /milestone templates/i }))
    .toHaveAttribute('href', '/projects/test-project-id/settings/milestones')

  expect(screen.getByRole('link', { name: /metadata management/i }))
    .toHaveAttribute('href', '/projects/test-project-id/settings/metadata')

  expect(screen.getByRole('link', { name: /project details/i }))
    .toHaveAttribute('href', '/projects/test-project-id/settings/project')
})
```

**Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- src/pages/SettingsIndexPage.test.tsx
```

Expected: PASS (all tests)

**Step 5: Commit SettingsIndexPage**

```bash
git add src/pages/SettingsIndexPage.tsx src/pages/SettingsIndexPage.test.tsx
git commit -m "feat: add settings landing page with three section cards"
```

---

## Task 6: useUpdateProject Hook - Test Setup

**Files:**
- Create: `src/hooks/useUpdateProject.test.ts`

**Step 1: Write test for project update mutation**

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateProject } from './useUpdateProject'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('useUpdateProject', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.clearAllMocks()
  })

  it('updates project name and description', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { id: 'project-1', name: 'Updated Name', description: 'Updated Description' },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockUpdate,
          }),
        }),
      }),
    } as any)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useUpdateProject(), { wrapper })

    result.current.mutate({
      projectId: 'project-1',
      name: 'Updated Name',
      description: 'Updated Description',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/hooks/useUpdateProject.test.ts
```

Expected: FAIL with "Cannot find module './useUpdateProject'"

---

## Task 7: useUpdateProject Hook - Implementation

**Files:**
- Create: `src/hooks/useUpdateProject.ts`

**Step 1: Create useUpdateProject hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Project = Database['public']['Tables']['projects']['Row']

interface UpdateProjectParams {
  projectId: string
  name: string
  description?: string | null
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, name, description }: UpdateProjectParams) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate project queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', data.id] })
    },
  })
}
```

**Step 2: Run test to verify it passes**

Run:
```bash
npm test -- src/hooks/useUpdateProject.test.ts
```

Expected: PASS

**Step 3: Add test for error handling**

Add to test file:

```typescript
it('handles update errors', async () => {
  const mockError = new Error('Update failed')

  vi.mocked(supabase.from).mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    }),
  } as any)

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const { result } = renderHook(() => useUpdateProject(), { wrapper })

  result.current.mutate({
    projectId: 'project-1',
    name: 'Updated Name',
  })

  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error).toEqual(mockError)
})
```

**Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- src/hooks/useUpdateProject.test.ts
```

Expected: PASS (all tests)

**Step 5: Commit useUpdateProject hook**

```bash
git add src/hooks/useUpdateProject.ts src/hooks/useUpdateProject.test.ts
git commit -m "feat: add useUpdateProject hook for project name/description updates"
```

---

## Task 8: useArchiveProject Hook - Test Setup

**Files:**
- Create: `src/hooks/useArchiveProject.test.ts`

**Step 1: Write test for archive mutation**

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useArchiveProject } from './useArchiveProject'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('useArchiveProject', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.clearAllMocks()
  })

  it('sets deleted_at timestamp', async () => {
    const now = new Date().toISOString()
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { id: 'project-1', deleted_at: now },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockUpdate,
          }),
        }),
      }),
    } as any)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useArchiveProject(), { wrapper })

    result.current.mutate('project-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/hooks/useArchiveProject.test.ts
```

Expected: FAIL with "Cannot find module './useArchiveProject'"

---

## Task 9: useArchiveProject Hook - Implementation

**Files:**
- Create: `src/hooks/useArchiveProject.ts`

**Step 1: Create useArchiveProject hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all project queries to remove archived project from lists
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
```

**Step 2: Run test to verify it passes**

Run:
```bash
npm test -- src/hooks/useArchiveProject.test.ts
```

Expected: PASS

**Step 3: Commit useArchiveProject hook**

```bash
git add src/hooks/useArchiveProject.ts src/hooks/useArchiveProject.test.ts
git commit -m "feat: add useArchiveProject hook for soft delete"
```

---

## Task 10: ProjectDetailsPage Component - Test Setup

**Files:**
- Create: `src/pages/ProjectDetailsPage.test.tsx`

**Step 1: Write test for form rendering**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectDetailsPage } from './ProjectDetailsPage'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'

vi.mock('@/hooks/usePermissions')
vi.mock('@/lib/supabase')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'test-project-id' }),
    useNavigate: () => vi.fn(),
  }
})

describe('ProjectDetailsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    vi.mocked(usePermissions).mockReturnValue({
      role: 'admin',
      can_manage_project: true,
      can_manage_team: false,
      can_update_milestones: true,
      can_edit_metadata: true,
      can_view_reports: true,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-project-id',
              name: 'Test Project',
              description: 'Test description',
            },
            error: null,
          }),
        }),
      }),
    } as any)
  })

  it('renders project details form', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })

  it('renders danger zone', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Danger Zone')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /archive project/i })).toBeInTheDocument()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/pages/ProjectDetailsPage.test.tsx
```

Expected: FAIL with "Cannot find module './ProjectDetailsPage'"

---

## Task 11: ProjectDetailsPage Component - Implementation (Part 1)

**Files:**
- Create: `src/pages/ProjectDetailsPage.tsx`

**Step 1: Create ProjectDetailsPage component structure**

```typescript
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { useUpdateProject } from '@/hooks/useUpdateProject'
import { useArchiveProject } from '@/hooks/useArchiveProject'
import { supabase } from '@/lib/supabase'

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  // Initialize form when project loads
  useState(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
    }
  })

  const updateProject = useUpdateProject()
  const archiveProject = useArchiveProject()

  const isDirty = name !== project?.name || description !== (project?.description || '')

  const handleSave = () => {
    if (!projectId) return

    updateProject.mutate(
      { projectId, name, description: description || null },
      {
        onSuccess: () => {
          // Show success toast (implement toast later)
          console.log('Project updated successfully')
        },
      }
    )
  }

  const handleArchive = () => {
    if (!projectId) return

    archiveProject.mutate(projectId, {
      onSuccess: () => {
        navigate('/dashboard')
      },
    })
  }

  if (isLoading) {
    return (
      <SettingsLayout
        title="Project Details"
        description="Edit project information and manage project lifecycle"
      >
        <div>Loading...</div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout
      title="Project Details"
      description="Edit project information and manage project lifecycle"
    >
      {/* Basic Information Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Project Name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">{name.length}/100 characters</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">{description.length}/500 characters</p>
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty || !name.trim() || updateProject.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {updateProject.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-red-600 mb-1">Danger Zone</h2>
            <p className="text-sm text-slate-600">
              Archive this project to hide it from active project lists. Components and data will be preserved.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowArchiveDialog(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Archive Project
        </button>
      </div>

      {/* Archive Confirmation Dialog */}
      {showArchiveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Archive Project?</h3>
            <p className="text-slate-600 mb-6">
              This project will be hidden from active lists. Components and data are preserved and can be restored later.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveDialog(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleArchive()
                  setShowArchiveDialog(false)
                }}
                disabled={archiveProject.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300"
              >
                {archiveProject.isPending ? 'Archiving...' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  )
}
```

**Step 2: Fix useState initialization bug**

Replace the incorrect `useState()` call with proper `useEffect`:

```typescript
import { useState, useEffect } from 'react'

// ... rest of imports

export function ProjectDetailsPage() {
  // ... existing code

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
    }
  }, [project])

  // ... rest of component
}
```

**Step 3: Run test to verify it passes**

Run:
```bash
npm test -- src/pages/ProjectDetailsPage.test.tsx
```

Expected: PASS

**Step 4: Commit ProjectDetailsPage**

```bash
git add src/pages/ProjectDetailsPage.tsx src/pages/ProjectDetailsPage.test.tsx
git commit -m "feat: add project details page with edit and archive"
```

---

## Task 12: Update App.tsx Routes

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add settings routes**

Add new routes to App.tsx (find the existing Route components and add these):

```typescript
import { SettingsIndexPage } from './pages/SettingsIndexPage'
import { ProjectDetailsPage } from './pages/ProjectDetailsPage'
import { MilestoneTemplatesPage } from './pages/MilestoneTemplatesPage'
import { MetadataManagementPage } from './pages/MetadataManagementPage'

// Inside the Routes component, add:
<Route path="/projects/:projectId/settings" element={<ProtectedRoute><SettingsIndexPage /></ProtectedRoute>} />
<Route path="/projects/:projectId/settings/milestones" element={<ProtectedRoute><MilestoneTemplatesPage /></ProtectedRoute>} />
<Route path="/projects/:projectId/settings/metadata" element={<ProtectedRoute><MetadataManagementPage /></ProtectedRoute>} />
<Route path="/projects/:projectId/settings/project" element={<ProtectedRoute><ProjectDetailsPage /></ProtectedRoute>} />
```

**Step 2: Remove old /metadata route**

Find and remove (or comment out) the old route:

```typescript
// OLD: Remove this line
// <Route path="/metadata" element={<ProtectedRoute><MetadataManagementPage /></ProtectedRoute>} />
```

**Step 3: Test navigation**

Run:
```bash
npm run dev
```

Manually test:
1. Navigate to `/projects/[any-project-id]/settings`
2. Verify settings landing page loads
3. Click each card to verify navigation

Expected: All routes work, no 404 errors

**Step 4: Commit route updates**

```bash
git add src/App.tsx
git commit -m "feat: add settings routes and remove old metadata route"
```

---

## Task 13: Refactor MilestoneTemplatesPage

**Files:**
- Modify: `src/pages/MilestoneTemplatesPage.tsx`

**Step 1: Import SettingsLayout**

Add import at top of file:

```typescript
import { SettingsLayout } from '@/components/settings/SettingsLayout'
```

**Step 2: Wrap existing content with SettingsLayout**

Find the main return statement and wrap with SettingsLayout:

```typescript
return (
  <SettingsLayout
    title="Milestone Templates"
    description="Customize progress tracking weights for each component type. Changes apply to all existing and future components."
  >
    {/* Remove duplicate h1 and description if they exist */}

    {/* Keep CloneTemplatesBanner */}
    {!hasTemplates && (
      <CloneTemplatesBanner
        projectId={projectId!}
        onComplete={() => refetch()}
      />
    )}

    {/* Keep existing TemplateCard grid and all other content */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Existing cards */}
    </div>
  </SettingsLayout>
)
```

**Step 3: Remove duplicate header**

Find and remove any existing h1 title and description paragraph that duplicates SettingsLayout.

**Step 4: Test milestone templates page**

Run:
```bash
npm run dev
```

Navigate to `/projects/[project-id]/settings/milestones` and verify:
1. Breadcrumbs appear
2. Title and description from SettingsLayout
3. CloneTemplatesBanner works if no templates
4. Template cards render correctly
5. Edit functionality unchanged

Expected: Page works as before with new layout

**Step 5: Commit refactored milestone templates page**

```bash
git add src/pages/MilestoneTemplatesPage.tsx
git commit -m "refactor: wrap milestone templates with SettingsLayout"
```

---

## Task 14: Refactor MetadataManagementPage

**Files:**
- Modify: `src/pages/MetadataManagementPage.tsx`

**Step 1: Import SettingsLayout**

Add import at top of file:

```typescript
import { SettingsLayout } from '@/components/settings/SettingsLayout'
```

**Step 2: Wrap existing content with SettingsLayout**

Find the main return statement and wrap with SettingsLayout:

```typescript
return (
  <SettingsLayout
    title="Metadata Management"
    description="Create and manage Areas, Systems, and Test Packages used to organize and categorize components across your project."
  >
    {/* Keep existing three-column grid and all content */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Existing Areas, Systems, Test Packages columns */}
    </div>
  </SettingsLayout>
)
```

**Step 3: Remove duplicate header if exists**

Find and remove any existing h1 title and description that duplicates SettingsLayout.

**Step 4: Test metadata management page**

Run:
```bash
npm run dev
```

Navigate to `/projects/[project-id]/settings/metadata` and verify:
1. Breadcrumbs appear
2. Title and description from SettingsLayout
3. Three-column grid renders
4. Create forms work
5. Inline editing works
6. Permission gate blocks unauthorized users

Expected: Page works as before with new layout and permission enforcement

**Step 5: Commit refactored metadata management page**

```bash
git add src/pages/MetadataManagementPage.tsx
git commit -m "refactor: wrap metadata management with SettingsLayout and add permissions"
```

---

## Task 15: Update Sidebar Navigation

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Update Settings link**

Find the "Template Settings" link (around line 163-182 based on research) and update:

```typescript
// OLD:
{selectedProjectId && (role === 'owner' || role === 'admin' || role === 'project_manager') && (
  <Link
    to={`/projects/${selectedProjectId}/settings/milestones`}  // OLD
    className={/* existing classes */}
  >
    <Sliders className="w-5 h-5" />
    Template Settings  // OLD
  </Link>
)}

// NEW:
{selectedProjectId && (role === 'owner' || role === 'admin' || role === 'project_manager') && (
  <Link
    to={`/projects/${selectedProjectId}/settings`}  // Point to landing page
    className={/* existing classes */}
  >
    <Sliders className="w-5 h-5" />
    Settings  // Shorter label
  </Link>
)}
```

**Step 2: Remove Details (metadata) link**

Find and remove the "Details" link that points to `/metadata` (around line 127-138):

```typescript
// REMOVE this entire Link component:
// <Link to="/metadata">
//   <Database className="w-5 h-5" />
//   Details
// </Link>
```

**Step 3: Test sidebar navigation**

Run:
```bash
npm run dev
```

Verify:
1. "Settings" link appears when project selected and user is owner/admin/PM
2. Clicking "Settings" navigates to `/projects/[id]/settings` landing page
3. "Details" link is gone
4. Other sidebar links unchanged

Expected: Sidebar navigation updated, all links work

**Step 4: Commit sidebar updates**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: update sidebar to link to settings landing page"
```

---

## Task 16: Integration Tests

**Files:**
- Create: `tests/integration/settings/unified-settings.test.tsx`

**Step 1: Write integration test for complete flow**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/App'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'

vi.mock('@/hooks/usePermissions')
vi.mock('@/lib/supabase')

describe('Unified Settings Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    vi.mocked(usePermissions).mockReturnValue({
      role: 'admin',
      can_manage_project: true,
      can_manage_team: false,
      can_update_milestones: true,
      can_edit_metadata: true,
      can_view_reports: true,
    })

    // Mock project query
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-project-id',
              name: 'Test Project',
              description: 'Test description',
            },
            error: null,
          }),
        }),
      }),
    } as any)
  })

  it('navigates through settings flow', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/test-project-id/settings']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Should show settings landing page
    await waitFor(() => {
      expect(screen.getByText('Project Settings')).toBeInTheDocument()
    })

    // Should show all three cards
    expect(screen.getByText('Milestone Templates')).toBeInTheDocument()
    expect(screen.getByText('Metadata Management')).toBeInTheDocument()
    expect(screen.getByText('Project Details')).toBeInTheDocument()

    // Click Project Details card
    await user.click(screen.getByText('Project Details'))

    // Should navigate to project details page
    await waitFor(() => {
      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Danger Zone')).toBeInTheDocument()
    })

    // Should show breadcrumbs
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('blocks unauthorized users', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      role: 'viewer',
      can_manage_project: false,
      can_manage_team: false,
      can_update_milestones: false,
      can_edit_metadata: false,
      can_view_reports: true,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/test-project-id/settings']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    expect(screen.queryByText('Project Settings')).not.toBeInTheDocument()
  })
})
```

**Step 2: Run integration tests**

Run:
```bash
npm test -- tests/integration/settings/unified-settings.test.tsx
```

Expected: PASS (all tests)

**Step 3: Commit integration tests**

```bash
git add tests/integration/settings/unified-settings.test.tsx
git commit -m "test: add integration tests for unified settings flow"
```

---

## Task 17: E2E Tests

**Files:**
- Create: `tests/e2e/settings-workflow.spec.ts`

**Step 1: Write E2E test for archive workflow**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Settings Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to settings
    await page.goto('/login')
    // Add login steps based on your auth flow
    await page.goto('/projects/test-project-id/settings')
  })

  test('complete settings navigation flow', async ({ page }) => {
    // Should show landing page
    await expect(page.getByText('Project Settings')).toBeVisible()

    // Should show all three cards
    await expect(page.getByText('Milestone Templates')).toBeVisible()
    await expect(page.getByText('Metadata Management')).toBeVisible()
    await expect(page.getByText('Project Details')).toBeVisible()

    // Click Milestone Templates
    await page.getByText('Milestone Templates').click()
    await expect(page).toHaveURL(/\/settings\/milestones/)

    // Navigate back via breadcrumb
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('archive project workflow', async ({ page }) => {
    // Navigate to Project Details
    await page.goto('/projects/test-project-id/settings')
    await page.getByText('Project Details').click()

    // Should show project form
    await expect(page.getByLabel(/project name/i)).toBeVisible()

    // Click Archive button
    await page.getByRole('button', { name: /archive project/i }).click()

    // Should show confirmation dialog
    await expect(page.getByText('Archive Project?')).toBeVisible()

    // Confirm archive
    await page.getByRole('button', { name: /archive project/i }).last().click()

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
  })
})
```

**Step 2: Run E2E tests**

Run:
```bash
npx playwright test tests/e2e/settings-workflow.spec.ts
```

Expected: PASS (requires Playwright setup)

**Step 3: Commit E2E tests**

```bash
git add tests/e2e/settings-workflow.spec.ts
git commit -m "test: add E2E tests for settings workflow"
```

---

## Task 18: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `Documents/implementation/PROJECT-STATUS.md`

**Step 1: Update CLAUDE.md with new routes**

Add to Route Structure section:

```markdown
### Settings Routes (NEW)
- `/projects/:projectId/settings` - Settings landing page (owner/admin/PM only)
- `/projects/:projectId/settings/milestones` - Milestone template weights (moved from old location)
- `/projects/:projectId/settings/metadata` - Areas, Systems, Test Packages (moved from /metadata)
- `/projects/:projectId/settings/project` - Project details and archive

All settings routes require Owner, Admin, or Project Manager role.
```

**Step 2: Update PROJECT-STATUS.md**

Add new feature section:

```markdown
**Feature 027**: Unified Settings Page (2025-11-12) - **PRODUCTION READY**
- ✅ Settings landing page with three section cards at `/projects/:projectId/settings`
- ✅ Shared SettingsLayout component with breadcrumbs and permission gates
- ✅ Moved Milestone Templates to `/settings/milestones` with consistent layout
- ✅ Moved Metadata Management to `/settings/metadata` with permission enforcement
- ✅ New Project Details page with name/description editing and archive capability
- ✅ Soft delete (deleted_at column) for project archiving
- ✅ Updated Sidebar navigation (Settings link, removed Details link)
- ✅ Complete test coverage with integration and E2E tests
- ✅ WCAG 2.1 AA accessibility (keyboard navigation, ARIA labels, screen reader support)
- 📁 Documentation in `docs/plans/2025-11-12-unified-settings-page-design.md`
```

**Step 3: Commit documentation updates**

```bash
git add CLAUDE.md Documents/implementation/PROJECT-STATUS.md
git commit -m "docs: update documentation for unified settings page"
```

---

## Task 19: Manual Testing Checklist

**Manual Testing Steps:**

1. **Settings Landing Page**
   - [ ] Navigate to `/projects/[id]/settings`
   - [ ] Verify three cards render with correct icons, titles, descriptions
   - [ ] Verify "Manage" buttons link to correct subsections
   - [ ] Test responsive layout (mobile, tablet, desktop)

2. **Milestone Templates**
   - [ ] Navigate to `/settings/milestones`
   - [ ] Verify breadcrumbs work (click Settings to go back)
   - [ ] Verify existing functionality unchanged (clone banner, edit weights, save)
   - [ ] Verify permission gate blocks viewers

3. **Metadata Management**
   - [ ] Navigate to `/settings/metadata`
   - [ ] Verify breadcrumbs work
   - [ ] Verify three-column grid renders
   - [ ] Verify create forms work
   - [ ] Verify inline editing works
   - [ ] Verify permission gate blocks viewers (NEW - wasn't enforced before)

4. **Project Details**
   - [ ] Navigate to `/settings/project`
   - [ ] Verify breadcrumbs work
   - [ ] Edit project name and description
   - [ ] Verify Save button disabled until form is dirty
   - [ ] Verify character counters update
   - [ ] Click Archive button
   - [ ] Verify confirmation dialog appears
   - [ ] Cancel archive, verify returns to form
   - [ ] Confirm archive, verify redirects to dashboard
   - [ ] Verify archived project no longer in project list

5. **Sidebar Navigation**
   - [ ] Verify "Settings" link appears when project selected
   - [ ] Verify "Settings" link only visible to owner/admin/PM
   - [ ] Verify "Details" link is removed
   - [ ] Click "Settings" link, verify navigates to landing page

6. **Keyboard Navigation**
   - [ ] Tab through all interactive elements
   - [ ] Press Enter on cards to navigate
   - [ ] Press Escape to close archive dialog
   - [ ] Verify focus indicators visible

7. **Permission Enforcement**
   - [ ] Login as viewer
   - [ ] Attempt to access `/settings`
   - [ ] Verify "Access Denied" message
   - [ ] Verify cannot access any subsections

**Step 1: Perform manual testing**

Follow checklist above and document any issues.

**Step 2: Fix any bugs found**

Create fix commits as needed.

**Step 3: Create final commit for feature**

```bash
git add .
git commit -m "feat: unified settings page complete with all subsections"
```

---

## Task 20: Final Verification

**Files:**
- Review: All modified files

**Step 1: Run full test suite**

Run:
```bash
npm test
```

Expected: All tests pass, ≥70% coverage maintained

**Step 2: Run type checking**

Run:
```bash
tsc -b
```

Expected: No type errors

**Step 3: Run linter**

Run:
```bash
npm run lint
```

Expected: No linting errors

**Step 4: Build for production**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 5: Review git log**

Run:
```bash
git log --oneline -20
```

Expected: Clean commit history with descriptive messages

**Step 6: Create feature summary commit**

```bash
git commit --allow-empty -m "feat: unified settings page feature complete

- Settings landing page at /projects/:id/settings
- Shared SettingsLayout with breadcrumbs and permissions
- Refactored Milestone Templates and Metadata Management
- New Project Details page with soft delete
- Updated Sidebar navigation
- Complete test coverage and documentation"
```

---

## Success Criteria Checklist

- [ ] All routes functional (`/settings`, `/settings/milestones`, `/settings/metadata`, `/settings/project`)
- [ ] SettingsLayout provides consistent header, breadcrumbs, permission gates
- [ ] Settings landing page renders three cards with correct navigation
- [ ] Milestone Templates page uses SettingsLayout (existing functionality preserved)
- [ ] Metadata Management page uses SettingsLayout (permission enforcement added)
- [ ] Project Details page edits name/description and archives projects
- [ ] Soft delete (deleted_at) hides archived projects from lists
- [ ] Sidebar updated (Settings link, Details link removed)
- [ ] All tests pass with ≥70% coverage
- [ ] No type errors, no lint errors, build succeeds
- [ ] WCAG 2.1 AA accessibility verified (keyboard nav, ARIA, screen readers)
- [ ] Documentation updated (CLAUDE.md, PROJECT-STATUS.md)
- [ ] Manual testing checklist completed

---

## Rollback Plan

If critical issues found after deployment:

1. **Revert sidebar changes** - Point Settings link back to old route temporarily
2. **Add redirect** - Redirect `/settings` to `/settings/milestones` to restore old behavior
3. **Restore /metadata route** - Re-add old route in App.tsx
4. **Database rollback** - Archive functionality isolated, can be disabled without rolling back migration

The design minimizes breaking changes by preserving existing page functionality.

---

## Notes for Engineer

**Key Context:**
- This project uses TanStack Query v5 for server state
- Permission checks use `usePermissions()` hook returning role and boolean flags
- Supabase RLS policies already filter by organization_id
- Testing requires mocking Supabase client and usePermissions hook
- SettingsLayout enforces `can_manage_project` permission for all settings pages

**Common Pitfalls:**
- Don't forget to update RLS policies when adding deleted_at filter
- Remember to invalidate queries after mutations
- Use `useParams` to extract projectId from URL
- Mock `react-router-dom` useParams in tests
- Breadcrumb navigation requires extracting projectId from URL

**Existing Patterns to Follow:**
- Feature 026 milestone templates for card-based layouts
- Existing metadata page for three-column grids
- Existing permission gates for role-based access
- Existing form patterns for validation and character limits

**Testing Strategy:**
- Write tests BEFORE implementation (TDD)
- Unit test components and hooks in isolation
- Integration test complete user flows
- E2E test critical workflows (archive project)
- Manual test keyboard navigation and screen readers
