# API Contracts: Sprint 1 - Core Foundation

**Feature**: 005-sprint-1-core
**Date**: 2025-10-15
**Phase**: 1 (Design & Contracts)

## Overview

Sprint 1 provides 9 TanStack Query hooks wrapping Supabase queries for all 10 new tables. All hooks follow consistent patterns for caching, optimistic updates, and error handling.

## Contract Files

1. **hooks-api.md** - TanStack Query hooks for CRUD operations
2. **database-schema.md** - Table/column/constraint validation (contract tests)
3. **stored-procedures.md** - Stored procedure function signatures and test cases

## Hook Naming Convention

- `useProjects()` - List query
- `useProject(id)` - Single item query
- `useCreateProject()` - Mutation (create)
- `useUpdateProject()` - Mutation (update)
- `useDeleteProject()` - Mutation (delete)

## Testing Strategy

All contracts have corresponding tests in `tests/contract/`:
- `hooks-api.test.ts` - Validates hook signatures, return types, query keys
- `database-schema.test.ts` - Validates table structure, constraints, indexes
- `stored-procedures.test.ts` - Validates function signatures, return types, test cases

Tests MUST fail before implementation (TDD requirement per Constitution Principle III).
