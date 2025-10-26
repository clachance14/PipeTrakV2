# Data Model: Add New Project

**Feature**: 013-the-new-add
**Date**: 2025-10-21

## Overview
This feature uses existing data models with no schema changes. The `projects` table and `ProjectContext` already support the required functionality.

## Existing Entities

### Project (Database)
**Table**: `projects` (defined in migration 00001_initial_schema.sql)

**Schema**:
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints**:
- `name`: NOT NULL (enforced at database level)
- `organization_id`: NOT NULL, foreign key to organizations table
- No unique constraint on `name` (duplicate project names allowed within organization)

**RLS Policies** (already configured):
- SELECT: Users can read projects in their organization
- INSERT: Users can create projects in their organization
- UPDATE: Users can update projects in their organization

**Relevance to Feature**:
- This feature creates new rows in this table via `useCreateProject()` mutation
- No schema changes required
- Existing RLS policies enforce multi-tenant isolation

---

### ProjectContext (Client State)
**File**: `src/contexts/ProjectContext.tsx`

**State Shape**:
```typescript
interface ProjectContextType {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
}
```

**Storage**: localStorage (key: `pipetrak_selected_project_id`)

**Relevance to Feature**:
- This feature calls `setSelectedProjectId(newProject.id)` after creation
- No changes required to context implementation

---

## Type Definitions

### Database Types (Generated)
**File**: `src/types/database.types.ts` (auto-generated from Supabase schema)

**Relevant Types**:
```typescript
type Project = Database['public']['Tables']['projects']['Row']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
```

**Used By**:
- `src/hooks/useProjects.ts`: useCreateProject() mutation accepts `ProjectInsert`
- Return type: `Project`

---

### Form State (Component-Local)
**File**: `src/pages/CreateProjectPage.tsx` (to be created)

**State Shape**:
```typescript
interface FormState {
  name: string;
  description: string;
}

interface FormErrors {
  name?: string;
  description?: string;
}
```

**Validation Rules**:
- `name`: Required, trimmed, length > 0
- `description`: Required, trimmed, length > 0

**Not Persisted**: Form state is ephemeral (discarded on navigation)

---

## Data Flow

### Creation Flow
```
User submits form
  ↓
CreateProjectPage validates input
  ↓
useCreateProject() mutation called
  ↓
Mutation fetches user's organization_id
  ↓
Supabase INSERT into projects table
  ↓
RLS policy validates organization membership
  ↓
Database returns new Project row
  ↓
setSelectedProjectId(newProject.id) updates context
  ↓
localStorage updated with new project ID
  ↓
navigate('/') redirects to home
  ↓
Layout dropdown shows new project as selected
```

### Error Flow
```
User submits form
  ↓
CreateProjectPage validates input
  ↓
Validation fails
  ↓
Display inline error messages (no network call)

OR

Validation passes
  ↓
useCreateProject() mutation called
  ↓
Network/RLS error occurs
  ↓
Display toast notification
  ↓
User remains on form page (data preserved)
```

---

## Validation

### Client-Side Validation
**Location**: CreateProjectPage component

**Rules**:
```typescript
function validate(name: string, description: string): FormErrors {
  const errors: FormErrors = {}

  if (!name.trim()) {
    errors.name = 'Project name is required'
  } else if (name.length > 255) {
    errors.name = 'Project name must be less than 255 characters'
  }

  if (!description.trim()) {
    errors.description = 'Description is required'
  } else if (description.length > 500) {
    errors.description = 'Description must be less than 500 characters'
  }

  return errors
}
```

### Server-Side Validation
**Location**: Supabase RLS policies + database constraints

**Enforced**:
- `name` NOT NULL (database constraint)
- `organization_id` valid foreign key (database constraint)
- User belongs to organization (RLS policy)

---

## No New Tables
This feature introduces **zero new database tables**. All persistence uses the existing `projects` table.

## No New Migrations
This feature requires **zero new migrations**. Existing schema is sufficient.

## No State Management Changes
This feature uses existing state management:
- Server state: TanStack Query (`useCreateProject` hook already exists)
- Client state: ProjectContext (`setSelectedProjectId` already exists)
- Form state: Local React useState (component-scoped)

---

**Status**: ✅ Data model analysis complete, no schema changes required
