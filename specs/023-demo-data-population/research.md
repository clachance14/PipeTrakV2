# Research: Demo Project Data Population

**Feature**: 023-demo-data-population
**Date**: 2025-11-02
**Status**: Complete

## Overview

This document captures research findings and technology decisions for populating demo projects with realistic industrial construction data while avoiding Edge Function timeout constraints.

## Research Questions & Findings

### 1. Commodity Code Sourcing

**Question**: Where should we source authentic commodity codes for demo components?

**Research Approach**:
- Queried existing production projects in Supabase database
- Analyzed component distribution and commodity code patterns
- Identified 20+ unique commodity codes across 5 component types

**Decision**: Query existing production projects for authentic commodity codes

**Rationale**:
- Provides realistic demo data matching actual usage patterns
- No privacy concerns (commodity codes are industry-standard part numbers)
- Validates demo represents actual PipeTrak usage

**Alternatives Considered**:
1. Generate random codes → Rejected: Unrealistic, doesn't match production patterns
2. Hardcode sample codes → Rejected: Not authentic, requires manual creation

**Implementation**:
- Database query completed (see `query_commodity_codes.mjs`)
- Documented authentic codes by type:
  - Valves: VBALP-DICBFLR01M-024, VBALU-PFCBFLF00M-001, VCHKU-SECBFEQ00Q-008, VGATU-SECBFLR02F-025
  - Supports: G4G-1412-05AA-001-1-1, G4G-1412-05AA-001-6-6, G4G-1430-05AB
  - Flanges: FBLABLDRA3399531, FBLABLDRAWF0261, FBLAG2DFA2351215
  - Instruments: FE-55403, ME-55403, PIT-55402, PIT-55406

---

### 2. Milestone Template Analysis

**Question**: What are the milestone sequences for each component type?

**Research Approach**:
- Reviewed migration 00009_foundation_tables.sql
- Extracted progress templates for 11 component types
- Identified 5 types used in demo (excluding pipe, fitting, threaded_pipe per requirements)

**Decision**: Use existing progress templates from migration 00009

**Rationale**:
- Templates already define milestone sequences for production use
- Ensures demo behavior matches production
- No need to create custom milestone logic

**Findings**:

| Component Type | Milestones | Type |
|---|---|---|
| Spool | Receive, Erect, Connect, Punch, Test, Restore | Discrete (6) |
| Valve | Receive, Install, Punch, Test, Restore | Discrete (5) |
| Support | Receive, Install, Punch, Test, Restore | Discrete (5) |
| Flange | Receive, Install, Punch, Test, Restore | Discrete (5) |
| Instrument | Receive, Install, Punch, Test, Restore | Discrete (5) |
| Field Weld | Fit-Up, Weld Made, Punch, Test, Restore | Discrete (5) |

**Alternatives Considered**:
1. Create custom demo milestones → Rejected: Doesn't match production behavior
2. Use simplified milestone set → Rejected: Doesn't showcase full product capabilities

**Implementation**:
- Milestone states defined in seed data matching template sequences
- Progression probabilities: 90-95% received, 60-70% installed/erected, 25-30% punch, 0% test/restore

---

### 3. Edge Function Async Invocation Pattern

**Question**: How should we invoke background population without blocking user signup?

**Research Approach**:
- Reviewed Supabase Edge Function documentation
- Tested Edge Function invocation from another Edge Function
- Evaluated alternative patterns (pg_cron, client polling)

**Decision**: Use Supabase Edge Function invocation from another Edge Function

**Rationale**:
- Built-in async support (fire-and-forget or await)
- No additional infrastructure required
- Reliable (Supabase manages retry/failure handling)
- Simple implementation pattern

**Pattern**:
```typescript
// In demo-signup Edge Function (synchronous)
await supabase.functions.invoke('populate-demo-data', {
  body: { projectId, organizationId }
})
// Returns immediately, populate-demo-data runs in background
```

**Alternatives Considered**:
1. pg_cron (PostgreSQL cron jobs) → Rejected: Adds complexity, requires scheduler setup
2. Client-side polling → Rejected: Unreliable (user may close browser), adds client complexity
3. Message queue (e.g., Redis) → Rejected: Overkill, requires additional infrastructure

**Implementation**:
- demo-signup calls populate-demo-data async after skeleton creation
- populate-demo-data runs without timeout constraints
- User gets immediate access, data populates in background

---

### 4. Natural Key Lookup Strategy

**Question**: How should we resolve foreign key relationships during bulk insertion?

**Research Approach**:
- Analyzed database schema for natural keys (drawing_number, component tags, weld numbers)
- Evaluated performance of Map data structure vs subqueries
- Tested insertion pattern with `.select()` to capture generated UUIDs

**Decision**: Use Map data structure for natural key → UUID lookups

**Rationale**:
- O(1) lookup performance (constant time)
- Simple to implement and understand
- Leverages PostgreSQL's `.select()` to capture generated IDs

**Pattern**:
```typescript
// 1. Insert drawings, capture IDs
const { data: drawings } = await supabase
  .from('drawings')
  .insert(drawingsData)
  .select('id, drawing_no_norm')

// 2. Build lookup map
const drawingIdMap = new Map(
  drawings.map(d => [d.drawing_no_norm, d.id])
)

// 3. Resolve references when inserting components
const components = componentsData.map(c => ({
  ...c,
  drawing_id: drawingIdMap.get(c.drawing_number)
}))
```

**Alternatives Considered**:
1. Subqueries for each insert → Rejected: Slower (O(n) per lookup), more complex SQL
2. Pre-defined UUIDs in seed file → Rejected: Not deterministic, manual UUID generation
3. Two-pass insertion (insert all, update refs) → Rejected: More complex, two database operations

**Implementation**:
- Natural keys: drawing_no_norm, component tags (from identity_key), weld_number
- Maps built after each entity type insertion
- Foreign keys resolved before dependent entity insertion

---

### 5. Idempotency Strategy

**Question**: How should we handle retry scenarios without creating duplicate data?

**Research Approach**:
- Reviewed existing database unique constraints (project_id + identity_key for components)
- Tested `ON CONFLICT DO NOTHING` vs `WHERE NOT EXISTS` patterns
- Evaluated transaction rollback vs partial success

**Decision**: Check for existing data before insertion using unique constraints

**Rationale**:
- Leverages existing database constraints (no new schema changes)
- Safe retry without duplicates
- Partial success is valuable (if 100/200 components inserted before failure, keep them)

**Pattern**:
```sql
-- For components (using unique constraint on project_id + component_type + identity_key)
INSERT INTO components (project_id, component_type, identity_key, ...)
SELECT ...
WHERE NOT EXISTS (
  SELECT 1 FROM components
  WHERE project_id = $1
  AND component_type = $2
  AND identity_key = $3
)

-- Alternative: Use ON CONFLICT
INSERT INTO components (...) VALUES (...)
ON CONFLICT (project_id, component_type, identity_key) DO NOTHING
```

**Alternatives Considered**:
1. Transaction rollback on error → Rejected: Loses all progress, must restart from zero
2. Delete all and recreate → Rejected: Loses any user changes to demo data
3. Version/generation tracking → Rejected: Adds complexity, not needed for demo data

**Implementation**:
- Idempotent checks at entity level (areas, systems, components, welds)
- Unique constraints prevent duplicates
- Function returns counts of created vs skipped entities

---

## Technology Choices

### Supabase Edge Functions (Deno Runtime)

**Choice**: TypeScript Edge Functions with Deno runtime

**Best Practices**:
- Use TypeScript strict mode for type safety
- Import types from database schema (`import type { Database } from '@/types/database.types'`)
- Use SECURITY DEFINER for SQL functions that need elevated privileges
- Use service role key for Edge Functions (bypasses RLS for admin operations)

**Justification**:
- Existing infrastructure (no new deployment needed)
- Built-in async support for background jobs
- TypeScript support with strict types
- No additional cost or complexity

**Patterns**:
```typescript
// Edge Function structure
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Handle request
  const { projectId } = await req.json()

  // Bulk insertions
  const result = await populateDemoData(supabase, projectId)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

### Declarative Seed File

**Choice**: Single TypeScript file (~2,500-3,000 lines) with typed data structures

**Best Practices**:
- Export const with strongly-typed interfaces
- Organize by entity type (areas, systems, components, drawings, welds)
- Use comments to document distribution ratios
- Keep natural keys consistent (drawing numbers, component tags)

**Justification**:
- Versionable in git (can track changes to demo data)
- Easy to inspect and validate (single file, clear structure)
- Type-safe (TypeScript interfaces prevent errors)
- Deterministic (same seed data every time)

**Pattern**:
```typescript
export const DEMO_SEED_DATA: DemoSeedData = {
  skeleton: {
    areas: ['Pipe Rack', 'ISBL', ...],
    systems: ['Air', 'Nitrogen', ...],
    packages: ['TP-01', 'TP-02', ...],
    welders: [...]
  },
  drawings: [
    { drawing_number: 'ISO-PR-001', area: 'Pipe Rack', system: 'Steam' },
    // ... 19 more
  ],
  components: [
    // 40 spools
    { tag: 'SP-001', type: 'spool', identity: { spool_id: 'SP-001' }, ... },
    // 80 supports
    { tag: 'SUP-001', type: 'support', identity: { ... }, ... },
    // ... 200 total
  ],
  // ... welds, milestones, assignments
}
```

---

### Database-Generated UUIDs

**Choice**: Let PostgreSQL generate UUIDs, resolve via natural keys

**Best Practices**:
- Use database default (`gen_random_uuid()`) for primary keys
- Capture IDs via `.select()` after insertion
- Build lookup maps for foreign key resolution
- Use natural keys (drawing_number, tag) for references in seed data

**Justification**:
- Prevents ID conflicts (database guarantees uniqueness)
- Standard database practice (follows PostgreSQL patterns)
- No manual UUID generation needed
- Deterministic relationships via natural keys

**Pattern**:
```typescript
// Insert with auto-generated UUIDs
const { data } = await supabase
  .from('components')
  .insert(componentsData)  // No 'id' field
  .select('id, identity_key')  // Capture generated IDs

// Build lookup for foreign key resolution
const componentMap = new Map(
  data.map(c => [extractTag(c.identity_key), c.id])
)
```

---

## Summary

All research questions resolved with clear decisions and implementation patterns documented. No blocking unknowns remain.

**Key Findings**:
- Authentic commodity codes sourced from production (20+ codes)
- Milestone templates defined in migration 00009 (5 component types)
- Edge Function async invocation pattern simple and reliable
- Natural key lookups via Map data structure (O(1) performance)
- Idempotency via unique constraints (safe retry)

**Next Steps**: Proceed to Phase 1 (Design & Contracts) documented in plan.md
