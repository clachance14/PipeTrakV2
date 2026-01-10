# Research: Revise Pipe Component Milestones

**Feature**: 035-revise-pipe-milestones
**Date**: 2026-01-10

## Research Summary

This feature has minimal research requirements. All technical questions were resolved during exploration.

## Decisions

### 1. Template Versioning Strategy

**Decision**: Insert a new v2 template rather than updating v1

**Rationale**:
- Supabase `progress_templates` table supports versioned templates via `(component_type, version)` unique constraint
- v1 template remains for historical reference and potential rollback
- Existing pattern used by threaded_pipe (has v1) confirms this approach

**Alternatives Considered**:
- Update v1 in place: Rejected - loses audit trail, no rollback path
- Create new component type: Rejected - pipe identity already established

### 2. Hybrid Workflow Configuration

**Decision**: Use `workflow_type: 'hybrid'` with `is_partial: true` for first 4 milestones

**Rationale**:
- Threaded pipe already uses hybrid workflow with identical pattern (verified in migration 00009)
- `calculate_component_percent()` already handles `is_partial` flag correctly
- UI milestone inputs automatically render as percentage inputs vs checkboxes based on `is_partial`

**Alternatives Considered**:
- Discrete workflow only: Rejected - user explicitly requested partial completion for Receive/Erect/Connect/Support
- All partial: Rejected - user explicitly requested discrete for Punch/Test/Restore

### 3. Weight Distribution

**Decision**: 5/30/30/20/5/5/5 (similar to spool pattern)

**Rationale**:
- User selected "Similar to spool" option
- Front-loads weight on installation phases (Erect 30%, Connect 30%)
- Light weight on administrative phases (Receive 5%, Punch/Test/Restore 5% each)
- Total: 5 + 30 + 30 + 20 + 5 + 5 + 5 = 100%

**Alternatives Considered**:
- Balanced weights (equal distribution): Rejected by user
- Front-loaded (higher Receive): Rejected by user
- Custom weights: User chose spool-like instead

### 4. Data Migration Strategy

**Decision**: No data migration required

**Rationale**:
- User confirmed no production pipe components exist
- Test data can be ignored
- New pipe components will automatically use v2 template

**Alternatives Considered**:
- Backfill existing components: Not needed (no production data)
- Retroactive template assignment: Not needed (no production data)

## Dependencies Verified

| Dependency | Status | Notes |
|------------|--------|-------|
| `progress_templates` table | Exists | Supports versioned templates |
| `calculate_component_percent()` | Supports hybrid | Verified in migration 00113 |
| Settings UI (MilestoneTemplatesPage) | Template-driven | Will auto-display new milestones |
| Component milestone inputs | Template-driven | Will render partial/discrete based on config |

## No Unresolved Questions

All NEEDS CLARIFICATION items from initial exploration were resolved through user Q&A:
- Milestones: Confirmed (7 total)
- Weights: Confirmed (spool-like)
- Partial support: Confirmed (first 4 partial, last 3 discrete)
- Scope: Confirmed (system template, not project-level)
