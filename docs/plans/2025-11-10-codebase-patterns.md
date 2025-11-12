# PipeTrak V2 - Codebase Patterns & Architecture Guide

## Overview
This document provides a comprehensive map of PipeTrak V2's codebase structure, implementation patterns, and key infrastructure to guide the milestone templates feature development.

---

## 1. PROJECT STRUCTURE

### Root Organization
```
/home/clachance14/projects/PipeTrak_V2/
├── src/
│   ├── components/        # React UI components
│   ├── hooks/            # Custom React hooks (TanStack Query)
│   ├── pages/            # Full-page components
│   ├── lib/              # Utility functions
│   ├── contexts/         # React Context providers
│   ├── stores/           # Zustand state management
│   ├── schemas/          # Zod validation schemas
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── migrations/       # Database migrations (82+ applied)
│   └── functions/        # PostgreSQL functions
├── tests/
│   ├── integration/      # Database & cross-component tests
│   ├── e2e/             # End-to-end tests
│   └── (colocated .test.tsx in src/)
├── docs/
│   ├── plans/           # Design documents
│   ├── security/        # RLS & permission docs
│   └── BUG-FIXES.md
├── specs/               # Feature specifications & implementation notes
├── vite.config.ts       # Vite build config
├── tsconfig.app.json    # TypeScript config with @/* alias
└── vitest.config.ts     # Test runner config
```

### Key Component Organization
- **UI Components**: `src/components/` (shadcn/ui + custom)
- **Modals/Dialogs**: Scattered in components directory (e.g., `WelderAssignDialog.tsx`)
- **Page Components**: `src/pages/` (full page routes)
- **Hooks**: `src/hooks/` with tests colocated (`useHook.ts` + `useHook.test.ts`)

---

## 2. ROUTING & NAVIGATION PATTERN

**File**: `/home/clachance14/projects/PipeTrak_V2/src/App.tsx`

### Route Structure
```typescript
- / (public homepage)
- /login, /register, /check-email (auth)
- /dashboard (protected)
- /projects (list view)
- /projects/:projectId/drawing-table
- /projects/:projectId/components
- /project-setup
- /components, /drawings, /packages, /needs-review, /welders, /weld-log, /imports
- /metadata (metadata management)
- /reports, /reports/new, /reports/view
- /team (team management - owner/admin only)
```

### Accessing Current Project
```typescript
// App.tsx uses ProjectProvider context wrapper
function ComponentsPageWrapper() {
  const { selectedProjectId } = useProject()
  if (!selectedProjectId) return <Navigate to="/projects" replace />
  return <ComponentsPage projectId={selectedProjectId} />
}
```

### Pattern for Settings Pages
**Currently**: Settings integrated into specific pages (e.g., `/metadata` for metadata management)
**Convention**: Project settings would likely be at `/projects/:projectId/settings` or within project detail page

---

## 3. DATABASE PATTERNS

### Progress Templates (Existing - Reuse This Pattern)

**Migration**: `supabase/migrations/00009_foundation_tables.sql`

```sql
CREATE TABLE progress_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type TEXT NOT NULL,  -- spool, field_weld, support, valve, etc.
  version INTEGER NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('discrete', 'quantity', 'hybrid')),
  milestones_config JSONB NOT NULL,  -- Array of milestone objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestone config validation function
CREATE OR REPLACE FUNCTION validate_milestone_weights(p_milestones_config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validates weights sum to exactly 100%
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Milestones Config Structure**:
```json
[
  {
    "name": "Receive",
    "weight": 5,
    "order": 1,
    "is_partial": false,
    "requires_welder": false
  },
  {
    "name": "Fabricate",
    "weight": 16,
    "order": 2,
    "is_partial": true
  }
]
```

### Progress Calculation Function (Existing - Reference)

**File**: `supabase/migrations/00010_component_tracking.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_component_percent(p_component_id UUID)
RETURNS NUMERIC(5,2) AS $$
DECLARE
  v_template_id UUID;
  v_current_milestones JSONB;
  v_milestones_config JSONB;
  v_total_weight NUMERIC(5,2) := 0;
BEGIN
  SELECT progress_template_id, current_milestones
  INTO v_template_id, v_current_milestones
  FROM components WHERE id = p_component_id;

  SELECT milestones_config INTO v_milestones_config
  FROM progress_templates WHERE id = v_template_id;

  -- Loop through milestones and calculate weighted %
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_milestones_config) LOOP
    DECLARE
      v_milestone_name TEXT := v_milestone->>'name';
      v_weight NUMERIC(5,2) := (v_milestone->>'weight')::NUMERIC(5,2);
      v_is_partial BOOLEAN := COALESCE((v_milestone->>'is_partial')::BOOLEAN, false);
      v_current_value JSONB := v_current_milestones->v_milestone_name;
    BEGIN
      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          v_total_weight := v_total_weight + (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF jsonb_typeof(v_current_value) = 'boolean' AND (v_current_value::TEXT)::BOOLEAN = true THEN
          v_total_weight := v_total_weight + v_weight;
        END IF;
      END IF;
    END;
  END LOOP;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql;
```

### Trigger Pattern (Auto-Update on Change)

**File**: `supabase/migrations/00010_component_tracking.sql`

```sql
CREATE OR REPLACE FUNCTION update_component_percent_on_milestone_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.percent_complete := calculate_component_percent(NEW.id);
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_component_percent_on_milestone_change
BEFORE UPDATE OF current_milestones ON components
FOR EACH ROW
EXECUTE FUNCTION update_component_percent_on_milestone_change();
```

---

## 4. RLS (ROW LEVEL SECURITY) PATTERNS

**Documentation**: `/home/clachance14/projects/PipeTrak_V2/docs/security/RLS-RULES.md`

### Organization-Based Isolation (Fundamental Pattern)
```sql
-- All data access scoped to user's organization
WHERE organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid()
)
```

### Project-Scoped Table Pattern (Most Common)
```sql
-- SELECT
CREATE POLICY "Users can view [table] in their organization"
ON [table_name] FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- INSERT (validates at insert time)
CREATE POLICY "Users can insert [table] in their organization"
ON [table_name] FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- UPDATE (role-based)
CREATE POLICY "Users can update [table] if they have permission"
ON [table_name] FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager')
  )
);
```

### Key Points
- **All project-scoped tables** follow this pattern: areas, systems, test_packages, components, drawings
- **Roles for decision-making**: owner, admin, project_manager, foreman, qc_inspector, welder, viewer
- **Single organization per user** (not multi-tenant): users have direct `organization_id` column
- **No cross-organization visibility** - fundamental security constraint

---

## 5. PERMISSION CHECKING PATTERNS

### Frontend Permission Gate Component

**File**: `src/components/PermissionGate.tsx`

```typescript
interface PermissionGateProps {
  permission:
    | 'can_update_milestones'
    | 'can_manage_team'
    | 'can_view_dashboards'
    | 'can_resolve_reviews'
    | 'can_manage_welders';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  permission,
  children,
  fallback = null
}: PermissionGateProps) {
  // TODO: Integrate with usePermissions() hook
  // Currently placeholder - always shows children (development default)
  return <>{children}</>;
}
```

### Usage Pattern in Components
```typescript
// From ComponentAssignDialog.tsx
<PermissionGate permission="can_manage_team">
  <MetadataDescriptionEditor
    entityType="area"
    entityId={area.id}
  />
</PermissionGate>
```

### Backend Permission Check Pattern
RLS policies enforce at database level using role checks:
```sql
AND EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid()
  AND role IN ('owner', 'admin', 'project_manager')
)
```

---

## 6. FORM & DIALOG PATTERNS

### Form Component with react-hook-form + Zod

**File**: `src/components/AreaForm.tsx` (Pattern Reference)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// 1. Define Zod schema
const areaFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Area name is required')
    .max(50, 'Area name must be 50 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
});

export type AreaFormData = z.infer<typeof areaFormSchema>;

interface AreaFormProps {
  projectId: string;
  areaId?: string;  // If provided, form is in edit mode
  initialData?: AreaFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AreaForm({
  projectId,
  areaId,
  initialData,
  onSuccess,
  onCancel,
}: AreaFormProps) {
  // 2. Setup form with validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaFormSchema),
    mode: 'onChange',  // Real-time validation
    defaultValues: initialData || {
      name: '',
      description: '',
    },
  });

  // 3. Submit handler with error handling
  const onSubmit = async (data: AreaFormData) => {
    try {
      if (areaId) {
        await updateAreaMutation.mutateAsync({
          id: areaId,
          name: data.name,
          description: data.description || undefined,
        });
        toast.success('Area updated successfully');
      } else {
        await createAreaMutation.mutateAsync({
          project_id: projectId,
          name: data.name,
          description: data.description || undefined,
        });
        toast.success('Area created successfully');
      }
      onSuccess?.();
    } catch (error: any) {
      // Handle specific errors
      if (error.code === '23505') {  // Unique constraint violation
        toast.error('An area with this name already exists in this project');
      } else {
        toast.error(error.message || 'Failed to save area');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Area Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., B-68, Tank Farm"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          placeholder="Brief description..."
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : areaId ? 'Update Area' : 'Create Area'}
        </Button>
      </div>
    </form>
  );
}
```

### Dialog Component Pattern

**File**: `src/components/ComponentAssignDialog.tsx` (Pattern Reference)

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ComponentAssignDialogProps {
  projectId: string;
  componentIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ComponentAssignDialog({
  projectId,
  componentIds,
  open,
  onOpenChange,
  onSuccess,
}: ComponentAssignDialogProps) {
  const [areaId, setAreaId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const result = await assignMutation.mutateAsync({
        component_ids: componentIds,
        area_id: areaId || null,
      });
      toast.success(`Successfully assigned ${result.updated_count} component(s)`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign components');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Components</DialogTitle>
          <DialogDescription>
            Assign {componentIds.length} component(s) to area, system, and/or test package
          </DialogDescription>
        </DialogHeader>

        {/* Form content */}
        <div className="space-y-4 py-4">
          {/* Field selects */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Assign Components'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. HOOK PATTERNS (TanStack Query)

### Mutation Hook Pattern

**File**: `src/hooks/useComponentAssignment.ts` (Pattern Reference)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

interface AssignComponentsParams {
  component_ids: string[];
  area_id?: string | null;
  system_id?: string | null;
  test_package_id?: string | null;
}

interface AssignComponentsResult {
  updated_count: number;
  components: Component[];
}

export function useAssignComponents(): UseMutationResult<
  AssignComponentsResult,
  Error,
  AssignComponentsParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ component_ids, area_id, system_id, test_package_id }) => {
      // 1. Validation
      if (!area_id && !system_id && !test_package_id) {
        throw new Error('At least one assignment must be provided');
      }
      if (component_ids.length === 0) {
        throw new Error('component_ids array must not be empty');
      }

      // 2. Build update object
      const updates: Partial<Component> = {};
      if (area_id !== undefined) updates.area_id = area_id;
      if (system_id !== undefined) updates.system_id = system_id;
      if (test_package_id !== undefined) updates.test_package_id = test_package_id;

      // 3. Execute mutation
      const { data, error } = await supabase
        .from('components')
        .update(updates)
        .in('id', component_ids)
        .select();

      if (error) throw error;

      return {
        updated_count: data?.length || 0,
        components: data || [],
      };
    },

    // 4. Invalidate related queries on success
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      console.log(`Successfully assigned ${data.updated_count} components`);
    },
  });
}
```

### Query Hook Pattern

**File**: `src/hooks/useProgressTemplates.ts` (Pattern Reference)

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProgressTemplate, ComponentType } from '@/types/drawing-table.types';

export function useProgressTemplates() {
  return useQuery({
    queryKey: ['progress-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_templates')
        .select('*')
        .order('component_type');

      if (error) throw error;

      // Transform array to Map for O(1) lookup
      const templatesMap = new Map<ComponentType, ProgressTemplate>();
      data.forEach((template) => {
        templatesMap.set(template.component_type as ComponentType, template);
      });

      return templatesMap;
    },
    staleTime: Infinity,  // Templates are static
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
```

---

## 8. VALIDATION & ERROR HANDLING

### Zod Validation Schema Pattern
```typescript
const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less')
    .trim(),
  totalManhours: z
    .number()
    .min(1, 'Must be greater than 0')
    .max(999999, 'Value too large'),
  revisionReason: z.string().min(1, 'Reason is required'),
});
```

### Database Error Handling
```typescript
try {
  await mutation.mutateAsync(data);
  toast.success('Success message');
} catch (error: any) {
  if (error.code === '23505') {
    // Unique constraint violation
    toast.error('Item with this name already exists');
  } else if (error.code === '23503') {
    // Foreign key constraint violation
    toast.error('Referenced item does not exist');
  } else {
    toast.error(error.message || 'Failed to complete action');
  }
}
```

### Toast Notification Pattern
```typescript
import { toast } from 'sonner';

// Success
toast.success('Area created successfully');

// Error
toast.error('Failed to create area');

// Info
toast.info('Processing...');
```

---

## 9. COMPONENT DETAIL VIEW PATTERN

**File**: `src/components/ComponentDetailView.tsx`

The existing component detail view uses a **4-tab interface**:
- **Overview**: Basic info, milestones
- **Details**: Metadata (area, system, test package)
- **Milestones**: Milestone editing with history
- **History**: Timeline of changes

### Pattern to Follow
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="milestones">Milestones</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* Component basic info */}
  </TabsContent>

  <TabsContent value="details">
    {/* Metadata editing */}
  </TabsContent>

  <TabsContent value="milestones">
    {/* Milestone editing UI */}
  </TabsContent>

  <TabsContent value="history">
    {/* Milestone events timeline */}
  </TabsContent>
</Tabs>
```

---

## 10. EXISTING PROGRESS TEMPLATES STRUCTURE

### Component Types & Templates

**File**: `supabase/migrations/00016_add_pipe_fitting_flange_templates.sql`

Template structure shows the pattern:
```sql
INSERT INTO progress_templates (
  component_type,
  version,
  workflow_type,
  milestones_config
) VALUES
  ('pipe', 1, 'discrete', '[
    {"name": "Receive", "weight": 50, "order": 1, "is_partial": false, "requires_welder": false},
    {"name": "Install", "weight": 50, "order": 2, "is_partial": false, "requires_welder": false}
  ]'::jsonb),
  ...
ON CONFLICT (component_type, version) DO NOTHING;
```

### 11 Component Types with Milestones
1. **spool** - Receive, Erect, Connect, Punch Complete, Hydrotest, Restore
2. **field_weld** - Fit-Up, Weld Made, Repair Complete, NDE Final, Paint
3. **support** - Receive, Install, Insulate, Test Complete
4. **valve** - Receive, Install, Test, Restore
5. **fitting** - Receive, Install
6. **flange** - Receive, Install
7. **instrument** - Receive, Install, Punch Complete, Test
8. **tubing** - Receive, Install, Test Complete, Restore
9. **hose** - Receive, Install, Test Complete, Restore
10. **misc_component** - Receive, Install, Test Complete, Restore
11. **threaded_pipe** - Fabricate, Install, Erect, Connect, Support (all partial %)

---

## 11. EARNED VALUE CALCULATION (Existing Reference)

**File**: `supabase/migrations/00057_earned_milestone_function.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_earned_milestone_value(
  p_component_type TEXT,
  p_milestones JSONB,
  p_standard_milestone TEXT
) RETURNS NUMERIC AS $$
-- Maps component-specific milestones to standardized milestones (received, installed, punch, tested, restored)
-- Returns percentage (0-100)
```

This function shows how to:
1. Case on component type
2. Case on milestone type
3. Handle boolean (discrete) vs numeric (partial) milestones
4. Return weighted percentage

**For milestone templates feature**: This same pattern of checking `is_partial` flag will be used.

---

## 12. KEY FILES FOR MILESTONE TEMPLATES FEATURE

### Database Layer
- **Create migrations in**: `/home/clachance14/projects/PipeTrak_V2/supabase/migrations/`
- **RLS pattern reference**: `supabase/migrations/00009_foundation_tables.sql` (progress_templates RLS)
- **Trigger pattern reference**: `supabase/migrations/00010_component_tracking.sql`
- **Type generation**: Run `supabase gen types typescript --linked` after migration

### Hooks Layer
- **Location**: `src/hooks/`
- **Pattern**: `useHookName.ts` with optional `useHookName.test.ts`
- **TanStack Query patterns**: `useProgressTemplates.ts`, `useComponentAssignment.ts`

### Components Layer
- **Location**: `src/components/settings/` (suggested for settings components)
- **Dialog pattern**: `src/components/ComponentAssignDialog.tsx`
- **Form pattern**: `src/components/AreaForm.tsx`, `src/components/SystemForm.tsx`
- **Permission gating**: Use `<PermissionGate>` component

### Pages Layer
- **Location**: `src/pages/`
- **Settings page**: Would integrate with existing project settings navigation
- **Route**: Likely `/projects/:projectId/settings` with tabs

### Tests
- **Unit/Integration**: Colocated in `src/` as `.test.tsx` files
- **Contract tests**: `tests/contract/`
- **E2E tests**: `tests/e2e/`
- **Pattern**: ≥70% coverage required by CI/CD

---

## 13. TYPE SAFETY PATTERNS

### TypeScript Strict Mode (Enabled)
```typescript
// tsconfig.app.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Database Type Generation
```bash
# After creating new migrations
supabase gen types typescript --linked > src/types/database.types.ts
```

### Enum Pattern for Roles
```typescript
type Role = 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer';
```

---

## 14. TESTING PATTERNS

### Test File Colocation
```
src/
  components/
    ComponentName.tsx
    ComponentName.test.tsx  ← Same directory
  hooks/
    useHook.ts
    useHook.test.ts         ← Same directory
```

### Test Structure (Vitest + Testing Library)
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('renders with expected content', () => {
    render(<Component />);
    expect(screen.getByText(/expected text/i)).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<Component />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/result/i)).toBeInTheDocument();
  });
});
```

### Coverage Requirements
- Overall: ≥70% (enforced by CI/CD)
- `src/lib/**`: ≥80%
- `src/components/**`: ≥60%

---

## 15. ACCESSIBILITY PATTERNS (WCAG 2.1 AA)

From Feature 025 (Threaded Pipe Inline Input):
```typescript
<input
  aria-label="Fabricate percentage"
  aria-valuenow={value}
  aria-invalid={hasError}
  role="spinbutton"
  onKeyDown={handleKeyboardNavigation}
  type="number"
/>
```

### Mobile-Responsive Patterns
- **Breakpoint**: ≤1024px for mobile/tablet
- **Touch targets**: ≥44px minimum (preferably ≥48px)
- **Font size**: ≥16px on inputs (prevents iOS zoom)
- **Keyboard navigation**: Tab between fields, Enter to save, Escape to cancel

---

## 16. STYLE PATTERNS

### Tailwind CSS v4 + Shadcn/ui
```typescript
// Component styles use Tailwind classes
<div className="space-y-4 py-4">
  <div className="flex items-center gap-2">
    <Checkbox id="clear-all" />
    <Label htmlFor="clear-all">Clear all assignments</Label>
  </div>
</div>
```

### Color & Status Patterns
```typescript
// From existing codebase
<Alert variant="default" className="border-yellow-500 bg-yellow-50">
  <AlertTriangle className="h-4 w-4 text-yellow-600" />
  <AlertDescription className="text-yellow-800">
    Warning message
  </AlertDescription>
</Alert>
```

---

## 17. STATE MANAGEMENT

### TanStack Query (Server State)
- Used for: API data, caching, synchronization
- Pattern: Custom hooks wrapping `useQuery`, `useMutation`
- Invalidation: Call `queryClient.invalidateQueries()` after mutations

### Zustand (Client State) - Not Heavily Used
- Installed but minimal usage
- Could be used for: UI-only state (modals, filters, selections)

### React Context (Auth State Only)
- `AuthContext` - User authentication state
- `ProjectContext` - Selected project ID

---

## SUMMARY OF KEY PATTERNS FOR MILESTONE TEMPLATES

1. **Database**: Reuse `progress_templates` table structure, add `project_milestone_weight_template` for project-specific overrides
2. **RLS**: Use project-scoped pattern with role checks for owner/admin
3. **Hooks**: Create `useProjectMilestoneTemplates()` and `useUpdateMilestoneTemplate()` following TanStack Query patterns
4. **Forms**: Use react-hook-form + Zod like `AreaForm.tsx` and `SystemForm.tsx`
5. **UI**: Create dialog/modal following `ComponentAssignDialog.tsx` pattern
6. **Settings**: Integrate into Project Settings page (which doesn't yet exist - create `/projects/:projectId/settings`)
7. **Validation**: Validate milestone weights sum to 100% using database CHECK constraint
8. **Permissions**: Restrict to owner/admin roles using RLS + PermissionGate component
9. **Testing**: ≥70% coverage with colocated test files
10. **Types**: Generate database types after migrations with `supabase gen types typescript --linked`

---

**End of Codebase Patterns Document**
