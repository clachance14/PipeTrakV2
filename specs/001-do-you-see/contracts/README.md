# API Contracts: Sprint 0

**Sprint 0 Scope**: No custom API endpoints. Supabase PostgREST auto-generates CRUD operations.

## Supabase PostgREST Patterns

Sprint 0 uses Supabase's auto-generated REST API via PostgREST. All CRUD operations are handled through the Supabase JavaScript client.

### Base URL
```
https://<project-ref>.supabase.co/rest/v1/
```

### Authentication
All requests require authentication via JWT token (managed by Supabase Auth SDK):
```typescript
import { supabase } from '@/lib/supabase'

// Authenticated request (automatic via SDK)
const { data, error } = await supabase
  .from('projects')
  .select('*')
```

### Available Endpoints (Auto-generated)

#### 1. Organizations (`/organizations`)
- **GET** `/organizations` - List user's organizations (filtered by RLS)
- **GET** `/organizations?id=eq.<uuid>` - Get single organization
- **POST** `/organizations` - Create organization (Sprint 1+)
- **PATCH** `/organizations?id=eq.<uuid>` - Update organization (Sprint 1+)
- **DELETE** `/organizations?id=eq.<uuid>` - Delete organization (Sprint 1+)

**Row Level Security**: Users can only read organizations they belong to (via `user_organizations` join)

#### 2. Users (`/users`)
- **GET** `/users?id=eq.<uuid>` - Get own user profile (RLS enforced)
- **PATCH** `/users?id=eq.<uuid>` - Update own profile (Sprint 1+)

**Row Level Security**: Users can only read/update their own record

#### 3. User Organizations (`/user_organizations`)
- **GET** `/user_organizations` - List user's organization memberships
- **GET** `/user_organizations?organization_id=eq.<uuid>` - Get members of organization (Sprint 1+)

**Row Level Security**: Users can only read their own memberships in Sprint 0

#### 4. Projects (`/projects`)
- **GET** `/projects` - List projects from user's organizations (filtered by RLS)
- **GET** `/projects?id=eq.<uuid>` - Get single project
- **GET** `/projects?organization_id=eq.<uuid>` - Get projects by organization
- **POST** `/projects` - Create project (Sprint 1+)
- **PATCH** `/projects?id=eq.<uuid>` - Update project (Sprint 1+)
- **DELETE** `/projects?id=eq.<uuid>` - Delete project (Sprint 1+)

**Row Level Security**: Users can only read projects from organizations they belong to

### Query Patterns (via Supabase SDK)

```typescript
// Select with filtering
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('organization_id', orgId)

// Select with joins
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    organization:organizations(name)
  `)

// Insert (Sprint 1+)
const { data } = await supabase
  .from('projects')
  .insert({ name: 'New Project', organization_id: orgId })

// Update (Sprint 1+)
const { data } = await supabase
  .from('projects')
  .update({ name: 'Updated Name' })
  .eq('id', projectId)

// Delete (Sprint 1+)
const { data } = await supabase
  .from('projects')
  .delete()
  .eq('id', projectId)
```

### Error Handling

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')

if (error) {
  // Handle error
  console.error(error.message)
  // Possible errors:
  // - "JWT expired" (401) - reauth required
  // - "permission denied" (403) - RLS policy violation
  // - "relation does not exist" (42P01) - table not found
}
```

---

## Future Contracts (Sprint 1+)

When custom business logic is needed, Edge Functions will be added:

### Planned Edge Functions
- `POST /functions/v1/invite-user` - Send organization invitation
- `POST /functions/v1/accept-invite` - Accept organization invitation
- `POST /functions/v1/bulk-update-components` - Bulk component milestone updates (Sprint 2+)
- `GET /functions/v1/package-readiness` - Calculate test package readiness % (Sprint 2+)

### Contract Testing Strategy (Sprint 1+)
When Edge Functions are added, contract tests will verify:
1. Request schema validation
2. Response schema matches OpenAPI spec
3. Error responses include proper status codes and messages
4. RLS policies prevent unauthorized access

---

## Sprint 0 Testing

No contract tests in Sprint 0. Testing focuses on:
- ✅ AuthContext unit tests (mocked Supabase client)
- ✅ ProtectedRoute unit tests (mocked auth state)
- ⏳ RLS policy integration tests (Sprint 1)
- ⏳ Edge Function contract tests (Sprint 1+)

---

**Next Steps**: Run `/tasks` to generate implementation tasks.
