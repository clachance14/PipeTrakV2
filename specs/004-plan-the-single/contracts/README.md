# API Contracts: Single-Organization User Model

This directory contains the API contracts for the single-organization refactor.

## Contract Files

### Database Migration Contract
**File**: `migration-schema.sql`
**Purpose**: SQL schema changes for single-org model
**Consumer**: Supabase migration system
**Status**: Defined

### Hook Contracts
**File**: `hooks-api.md`
**Purpose**: TypeScript hook signatures for updated organization logic
**Consumers**: React components, pages
**Status**: Defined

### Permission System Contract
**File**: `permissions-api.md`
**Purpose**: Role-based permission function signatures
**Consumers**: All components requiring permission checks
**Status**: Defined

## Contract Testing

All contracts will have corresponding contract tests in `tests/contract/`:
- `migration-schema.test.ts` - Validates migration SQL syntax and constraints
- `hooks-api.test.ts` - Validates hook return types and error states
- `permissions-api.test.ts` - Validates permission mappings for all roles

These tests MUST fail before implementation begins (TDD requirement).
