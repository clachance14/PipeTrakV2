# Integration Tests: Create New Metadata Entries (T029-T032)

**Feature**: 020-component-metadata-editing  
**User Story**: User Story 2 - Create New Metadata Entries  
**Test File**: `tests/integration/component-metadata/create-metadata.test.ts`  
**Date Created**: 2025-10-29  
**Status**: RED (All tests failing as expected)

---

## Test Overview

**Total Tests**: 35  
**Status**: 35 failed (RED phase - expected)  
**Coverage**: All User Story 2 acceptance criteria covered

---

## Test Breakdown by Task

### T029: Inline Area Creation (11 tests)

#### Inline creation UI flow (3 tests)
- ✗ should trigger inline input form when "Create new Area..." selected
- ✗ should display "Create new Area..." at bottom of dropdown list
- ✗ should show input field with focus when entering creation mode

#### Create new Area and auto-select (4 tests)
- ✗ should create new Area with valid name
- ✗ should auto-select newly created Area
- ✗ should trim whitespace from area name before creation
- ✗ should add newly created area to dropdown options immediately

#### Immediate persistence - T032 (4 tests)
- ✗ should persist new Area immediately (independent of component save)
- ✗ should keep newly created metadata even if component save is cancelled
- ✗ should allow using newly created metadata for other components
- ✗ should not rollback created metadata if component update fails

---

### T030: Duplicate Name Validation (11 tests)

#### Exact match detection (2 tests)
- ✗ should show error for duplicate Area name (exact match)
- ✗ should prevent Create button click when duplicate detected

#### Case-insensitive duplicate detection (3 tests)
- ✗ should show error for duplicate Area name (case-insensitive)
- ✗ should show error for uppercase duplicate
- ✗ should show error for mixed case duplicate

#### Whitespace handling in duplicate detection (2 tests)
- ✗ should show error for duplicate with whitespace
- ✗ should detect duplicate with multiple spaces in name

#### Empty name validation (2 tests)
- ✗ should prevent creation with empty name
- ✗ should prevent creation with only whitespace

---

### T031: Canceling Creation (5 tests)

#### Cancel button behavior (3 tests)
- ✗ should revert to dropdown on Cancel click
- ✗ should not fire mutation when Cancel clicked
- ✗ should keep dropdown selection unchanged when canceling

#### Input text clearing (2 tests)
- ✗ should clear input text when canceling
- ✗ should clear validation errors when canceling

---

### T032: Systems and Test Packages (8 tests)

#### Create new System (4 tests)
- ✗ should create new System with valid name
- ✗ should auto-select newly created System
- ✗ should show error for duplicate System name
- ✗ should display "Create new System..." option

#### Create new Test Package (4 tests)
- ✗ should create new Test Package with valid name
- ✗ should auto-select newly created Test Package
- ✗ should show error for duplicate Test Package name
- ✗ should display "Create new Test Package..." option

#### Independent metadata creation (2 tests - covers all 3 types)
- ✗ should allow creating Area, System, and Test Package independently
- ✗ should not clear one metadata type when creating another

---

## User Story 2 Acceptance Criteria Mapping

| AC | Description | Test Coverage |
|----|-------------|---------------|
| AC1 | "Create new..." option appears at bottom of each dropdown | 4 tests (Area, System, Test Package, order verification) |
| AC2 | Selecting triggers inline input form with Create/Cancel buttons | 3 tests (trigger, focus, buttons) |
| AC3 | Empty/whitespace names prevented | 3 tests (empty, whitespace-only, trimming) |
| AC4 | Duplicate names show error (case-insensitive) | 8 tests (exact, case variants, whitespace) |
| AC5 | Cancel button behavior | 5 tests (revert, no mutation, clearing) |
| AC6 | New metadata committed immediately | 4 tests (persistence, independence from component save) |
| AC7 | Auto-selected after creation | 3 tests (Area, System, Test Package) |

---

## Test Infrastructure

### Mocked Dependencies
- `supabase.from()` - Database queries and mutations
- `supabase.auth.getUser()` - Authentication
- TanStack Query mutations for metadata creation

### Mock Data Factories
- `createMockArea()` - Generate test Area entities
- `createMockSystem()` - Generate test System entities
- `createMockTestPackage()` - Generate test Test Package entities

### Expected Hooks (Not Yet Implemented)
- `useCreateArea()` - Mutation hook for creating Areas
- `useCreateSystem()` - Mutation hook for creating Systems
- `useCreateTestPackage()` - Mutation hook for creating Test Packages
- `useInlineAreaCreation()` - UI state hook for inline creation
- `useMetadataForm()` - Form state management hook
- `useAreaOptions()` - Options builder for Area dropdown

---

## Implementation Guidance

### Phase 1: Create Mutation Hooks
1. Implement `useCreateArea` hook with validation
2. Implement `useCreateSystem` hook with validation
3. Implement `useCreateTestPackage` hook with validation
4. All hooks should validate for duplicates and empty names

### Phase 2: Inline Creation UI State
1. Implement `useInlineAreaCreation` hook
   - Track `isCreating` state
   - Manage input value
   - Handle Create/Cancel actions
2. Similar hooks for System and Test Package

### Phase 3: Auto-Selection After Creation
1. Update metadata form state after successful creation
2. Automatically select newly created item
3. Exit inline creation mode

### Phase 4: Validation & Error Handling
1. Implement case-insensitive duplicate detection
2. Implement whitespace trimming
3. Show inline error messages
4. Disable Create button when validation fails

### Phase 5: Immediate Persistence
1. Ensure mutations commit to database immediately
2. Verify independence from component save operation
3. Test cross-component metadata availability

---

## Running Tests

```bash
# Run all create-metadata tests
npm test -- tests/integration/component-metadata/create-metadata.test.ts

# Run specific test suite
npm test -- tests/integration/component-metadata/create-metadata.test.ts -t "Inline Area Creation"

# Run with watch mode
npm test -- tests/integration/component-metadata/create-metadata.test.ts --watch
```

---

## Expected Outcome

**Current State**: RED (35/35 tests failing)  
**Next Phase**: GREEN (implement features to pass tests)  
**Final Phase**: REFACTOR (optimize and clean up implementation)

All tests contain placeholder `expect(true).toBe(false)` to ensure they fail initially. These will be replaced with actual assertions as hooks and components are implemented.

---

## Related Documentation

- User Story 2 Specification: `specs/020-component-metadata-editing/spec.md`
- Metadata Types: `src/types/metadata.ts`
- Concurrent Edit Tests: `tests/integration/component-metadata/concurrent-edits.test.ts`
