# Data Model: Sprint 0 Infrastructure

**Feature**: Sprint 0 Infrastructure Completion
**Date**: 2025-10-04
**Scope**: Minimal multi-tenant schema (organizations, users, projects, user_organizations)

## Overview

Sprint 0 establishes the foundational multi-tenant data model with basic Row Level Security (RLS). Full validation rules and comprehensive RLS policies are deferred to Sprint 1.

## Entity-Relationship Diagram

```
┌─────────────────┐
│  auth.users     │ (Supabase managed)
│  - id (UUID/PK) │
│  - email        │
└────────┬────────┘
         │
         │ 1:1
         │
         ▼
┌─────────────────┐         ┌──────────────────────┐
│  users          │ N       │  user_organizations  │
│  - id (PK/FK)   │◄────────┤  - user_id (PK/FK)   │
│  - email        │         │  - org_id (PK/FK)    │
│  - full_name    │         │  - role              │
└─────────────────┘         └──────────┬───────────┘
                                       │
                                       │ M:N
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │  organizations       │
                            │  - id (UUID/PK)      │
                            │  - name              │
                            └──────────┬───────────┘
                                       │
                                       │ 1:N
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │  projects            │
                            │  - id (UUID/PK)      │
                            │  - organization_id   │
                            │  - name              │
                            │  - description       │
                            └──────────────────────┘
```

## Tables

### 1. organizations

**Purpose**: Multi-tenant root entity. Each organization is an isolated tenant with its own projects and data.

| Column       | Type         | Constraints           | Description                    |
|--------------|--------------|----------------------|--------------------------------|
| id           | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique organization ID |
| name         | TEXT         | NOT NULL             | Organization display name      |
| created_at   | TIMESTAMPTZ  | DEFAULT NOW()        | Creation timestamp             |
| updated_at   | TIMESTAMPTZ  | DEFAULT NOW()        | Last update timestamp          |

**Indexes**:
- Primary key index on `id` (auto-created)

**RLS Policies** (Sprint 0 - minimal enforcement):
```sql
-- SELECT: Users can read organizations they belong to
CREATE POLICY "Users can read own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));
```

**Deferred to Sprint 1**:
- INSERT/UPDATE/DELETE policies (admin-only)
- Validation: name length 1-100 characters
- Soft delete support

---

### 2. users

**Purpose**: Application user profile extending Supabase auth.users. Stores additional user metadata.

| Column       | Type         | Constraints           | Description                    |
|--------------|--------------|----------------------|--------------------------------|
| id           | UUID         | PRIMARY KEY, REFERENCES auth.users(id) | User ID (matches Supabase auth) |
| email        | TEXT         | NOT NULL, UNIQUE     | User email address             |
| full_name    | TEXT         | NULLABLE             | User display name              |
| created_at   | TIMESTAMPTZ  | DEFAULT NOW()        | Account creation timestamp     |
| updated_at   | TIMESTAMPTZ  | DEFAULT NOW()        | Last profile update            |

**Indexes**:
- Primary key index on `id` (auto-created)
- Unique index on `email` (auto-created)

**RLS Policies** (Sprint 0 - minimal enforcement):
```sql
-- SELECT: Users can read own record
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (id = auth.uid());
```

**Deferred to Sprint 1**:
- UPDATE policy (users can update own profile)
- Email validation format check
- Full name length constraints

---

### 3. user_organizations

**Purpose**: Many-to-many junction table linking users to organizations with role assignment.

| Column          | Type         | Constraints           | Description                    |
|-----------------|--------------|----------------------|--------------------------------|
| user_id         | UUID         | REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY | User foreign key |
| organization_id | UUID         | REFERENCES organizations(id) ON DELETE CASCADE, PRIMARY KEY | Organization foreign key |
| role            | TEXT         | NOT NULL, DEFAULT 'member' | User role in org ('admin' \| 'member') |
| created_at      | TIMESTAMPTZ  | DEFAULT NOW()        | Membership creation timestamp  |

**Composite Primary Key**: (user_id, organization_id)

**Indexes**:
- Composite primary key index (auto-created)
- `idx_user_organizations_user_id` on `user_id` (for user lookup)
- `idx_user_organizations_org_id` on `organization_id` (for org member lookup)

**RLS Policies** (Sprint 0 - minimal enforcement):
```sql
-- SELECT: Users can read own memberships
CREATE POLICY "Users can read own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());
```

**Deferred to Sprint 1**:
- INSERT/DELETE policies (admin-only for invitations/removals)
- Role enum constraint (CHECK role IN ('admin', 'member'))
- Audit trail for membership changes

---

### 4. projects

**Purpose**: Organization-scoped projects. Each project belongs to exactly one organization.

| Column          | Type         | Constraints           | Description                    |
|-----------------|--------------|----------------------|--------------------------------|
| id              | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique project ID |
| organization_id | UUID         | NOT NULL, REFERENCES organizations(id) ON DELETE CASCADE | Parent organization |
| name            | TEXT         | NOT NULL             | Project display name           |
| description     | TEXT         | NULLABLE             | Optional project description   |
| created_at      | TIMESTAMPTZ  | DEFAULT NOW()        | Project creation timestamp     |
| updated_at      | TIMESTAMPTZ  | DEFAULT NOW()        | Last update timestamp          |

**Indexes**:
- Primary key index on `id` (auto-created)
- `idx_projects_org_id` on `organization_id` (for org project lookup)

**RLS Policies** (Sprint 0 - minimal enforcement):
```sql
-- SELECT: Users can read projects from their organizations
CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));
```

**Deferred to Sprint 1**:
- INSERT/UPDATE/DELETE policies (org members can create/edit, admins can delete)
- Name length validation (1-200 characters)
- Project status enum (active, archived, completed)

---

## Relationships

### 1. User ↔ Organization (Many-to-Many via user_organizations)
- **Cardinality**: A user can belong to multiple organizations; an organization can have multiple users
- **Enforcement**: Foreign keys with CASCADE delete (deleting org removes memberships)
- **Business Rule**: User must have ≥1 organization membership to access system (enforced at app level in Sprint 1)

### 2. Organization → Project (One-to-Many)
- **Cardinality**: An organization can have many projects; a project belongs to one organization
- **Enforcement**: Foreign key with CASCADE delete (deleting org deletes all projects)
- **Business Rule**: Projects are isolated by organization (enforced via RLS policies)

### 3. User → User Record (One-to-One)
- **Cardinality**: Each auth.users record has exactly one users profile record
- **Enforcement**: Foreign key to auth.users(id) with REFERENCES constraint
- **Business Rule**: User profile created on first sign-in (handled by Supabase trigger in Sprint 1)

---

## Validation Rules (Sprint 1)

**Deferred to Sprint 1 implementation** (enforced via Edge Functions or database CHECK constraints):

### organizations
- `name`: Required, length 1-100 characters, no leading/trailing whitespace

### users
- `email`: Required, valid email format (RFC 5322), unique across system
- `full_name`: Optional, max length 200 characters

### user_organizations
- `role`: Required, enum ['admin', 'member']

### projects
- `name`: Required, length 1-200 characters, unique within organization
- `description`: Optional, max length 1000 characters

---

## State Transitions

**Sprint 0**: No state machines. CRUD operations only.

**Sprint 1+**:
- Projects: draft → active → archived
- User invitations: pending → accepted → revoked

---

## Migration File

**Location**: `supabase/migrations/00001_initial_schema.sql`

**Contents**:
```sql
-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- User-Organizations junction
CREATE TABLE user_organizations (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_projects_org_id ON projects(organization_id);
CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);
```

---

## Type Generation

**Command**:
```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

**Expected Output** (src/types/database.types.ts):
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_organizations: {
        Row: {
          user_id: string
          organization_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          organization_id: string
          role?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          organization_id?: string
          role?: string
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
```

---

## Acceptance Criteria

Sprint 0 data model is complete when:
- ✅ Migration file creates all 4 tables with RLS enabled
- ✅ All foreign key relationships enforce referential integrity
- ✅ Indexes exist on all foreign keys for performance
- ✅ RLS policies allow users to read their own organization data
- ✅ TypeScript types generated from schema compile with `tsc -b`
- ✅ Types provide autocomplete for `supabase.from('projects').select('*')`

---

**Next Steps**: Run `/tasks` to generate implementation tasks for this schema.
