# Contract: Package CRUD RPC Functions

**Feature**: 012-test-package-readiness
**Entity**: `create_test_package`, `update_test_package` RPC functions
**Type**: Database Functions

## Function 1: `create_test_package`

### Signature
```sql
create_test_package(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS UUID;
```

### Request Contract
```typescript
interface CreatePackageRequest {
  p_project_id: string; // UUID format
  p_name: string; // Required, max 100 chars (UI enforced)
  p_description?: string | null; // Optional, max 100 chars
  p_target_date?: string | null; // ISO 8601 date (YYYY-MM-DD)
  p_user_id?: string; // Defaults to auth.uid()
}
```

### Response Contract
```typescript
type CreatePackageResponse = string; // UUID of created package
```

### Behavioral Contracts

#### BC-CREATE-001: Valid Package Creation
**Given**: User authenticated, project exists, name = "Test Package 1"
**When**: Call `create_test_package(project_id, "Test Package 1")`
**Then**: Returns new package UUID, package inserted into test_packages table

#### BC-CREATE-002: Name Trimming
**Given**: Name = "  Test Package  " (with whitespace)
**When**: Call `create_test_package(project_id, "  Test Package  ")`
**Then**: Package created with name = "Test Package" (trimmed)

#### BC-CREATE-003: Empty Name Rejection
**Given**: Name = "" or name = "   " (empty/whitespace only)
**When**: Call `create_test_package(project_id, "")`
**Then**: Raises exception "Package name cannot be empty"

#### BC-CREATE-004: Description Length Validation
**Given**: Description = "A" * 101 (101 characters)
**When**: Call `create_test_package(project_id, "Name", description)`
**Then**: Raises exception "Description max 100 characters"

#### BC-CREATE-005: NULL Description Allowed
**Given**: Description = NULL
**When**: Call `create_test_package(project_id, "Name", NULL)`
**Then**: Package created with description = NULL

#### BC-CREATE-006: Target Date Validation
**Given**: Target date = "2025-12-31"
**When**: Call `create_test_package(project_id, "Name", NULL, "2025-12-31")`
**Then**: Package created with target_date = 2025-12-31

#### BC-CREATE-007: Invalid Project Rejection
**Given**: Project ID does not exist
**When**: Call `create_test_package("invalid-uuid", "Name")`
**Then**: Raises exception or returns NULL (foreign key constraint)

#### BC-CREATE-008: RLS Enforcement
**Given**: User belongs to Organization A, attempts to create package in Project B (Organization B)
**When**: Call `create_test_package(project_b_id, "Name")`
**Then**: Operation fails (RLS policy violation)

## Function 2: `update_test_package`

### Signature
```sql
update_test_package(
  p_package_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB;
```

### Request Contract
```typescript
interface UpdatePackageRequest {
  p_package_id: string; // UUID format, required
  p_name?: string | null; // If provided, must be non-empty
  p_description?: string | null; // If provided, max 100 chars
  p_target_date?: string | null; // ISO 8601 date or NULL to clear
  p_user_id?: string; // Defaults to auth.uid()
}
```

### Response Contract
```typescript
type UpdatePackageResponse =
  | { success: true }
  | { error: string };
```

### Behavioral Contracts

#### BC-UPDATE-001: Update Name Only
**Given**: Package exists with name = "Old Name"
**When**: Call `update_test_package(package_id, p_name="New Name")`
**Then**: Returns `{success: true}`, package name updated, other fields unchanged

#### BC-UPDATE-002: Update Description Only
**Given**: Package exists with description = "Old Desc"
**When**: Call `update_test_package(package_id, p_description="New Desc")`
**Then**: Returns `{success: true}`, description updated, other fields unchanged

#### BC-UPDATE-003: Update Multiple Fields
**Given**: Package exists
**When**: Call `update_test_package(package_id, p_name="New Name", p_description="New Desc")`
**Then**: Returns `{success: true}`, both name and description updated

#### BC-UPDATE-004: Clear Description (Set to NULL)
**Given**: Package has description = "Some description"
**When**: Call `update_test_package(package_id, p_description=NULL)`
**Then**: Returns `{success: true}`, description set to NULL

#### BC-UPDATE-005: Empty Name Rejection
**Given**: Package exists
**When**: Call `update_test_package(package_id, p_name="")`
**Then**: Returns `{error: "Package name cannot be empty"}`

#### BC-UPDATE-006: Description Length Validation
**Given**: Package exists
**When**: Call `update_test_package(package_id, p_description="A" * 101)`
**Then**: Returns `{error: "Description max 100 characters"}`

#### BC-UPDATE-007: Package Not Found
**Given**: Package ID does not exist
**When**: Call `update_test_package("invalid-uuid", p_name="Name")`
**Then**: Returns `{error: "Package not found"}`

#### BC-UPDATE-008: RLS Enforcement
**Given**: User belongs to Organization A, attempts to update package in Project B (Organization B)
**When**: Call `update_test_package(package_b_id, p_name="Name")`
**Then**: Returns `{error: "Package not found"}` (RLS hides row)

#### BC-UPDATE-009: No-Op When All Parameters NULL
**Given**: Package exists
**When**: Call `update_test_package(package_id)` (all p_* params NULL)
**Then**: Returns `{success: true}`, no changes made

## Test Implementation

**Test File**: `tests/contract/package-crud.contract.test.ts`

**Test Cases (Create)**:
1. ✅ BC-CREATE-001: Valid creation returns UUID
2. ✅ BC-CREATE-002: Name trimmed
3. ✅ BC-CREATE-003: Empty name rejected
4. ✅ BC-CREATE-004: Description length validated
5. ✅ BC-CREATE-005: NULL description allowed
6. ✅ BC-CREATE-006: Target date accepted
7. ✅ BC-CREATE-007: Invalid project rejected
8. ✅ BC-CREATE-008: RLS enforced

**Test Cases (Update)**:
1. ✅ BC-UPDATE-001: Name updated
2. ✅ BC-UPDATE-002: Description updated
3. ✅ BC-UPDATE-003: Multiple fields updated
4. ✅ BC-UPDATE-004: Description cleared
5. ✅ BC-UPDATE-005: Empty name rejected
6. ✅ BC-UPDATE-006: Description length validated
7. ✅ BC-UPDATE-007: Package not found error
8. ✅ BC-UPDATE-008: RLS enforced
9. ✅ BC-UPDATE-009: No-op allowed

**Tests must FAIL before migration 00027 is applied** (RPC functions do not exist yet).
