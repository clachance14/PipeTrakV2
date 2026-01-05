---
description: Load comprehensive PipeTrak V2 context including architecture, domain model, and git status
---

# PipeTrak V2 Context Loader

Load comprehensive context about the PipeTrak V2 codebase to assist with development tasks.

## Step 1: Gather Git Context

Run these commands to understand current work state:

```bash
echo "=== Current Branch ===" && git branch --show-current
echo ""
echo "=== Recent Commits (last 10) ===" && git log --oneline -10
echo ""
echo "=== Uncommitted Changes ===" && git status --short
echo ""
echo "=== Recent Change Summary ===" && git diff --stat HEAD~5 2>/dev/null || echo "(fewer than 5 commits)"
```

## Step 2: Present Domain Overview

After gathering git context, present this domain knowledge conversationally:

### What is PipeTrak V2?

Industrial pipe tracking system for **brownfield construction** (modifying existing industrial facilities). Tracks thousands of pipe components through lifecycle milestones from budget to final restoration.

### Core Domain Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **Components** | Individual pipe items (1000+ per project) | `component_type`, `identity_key`, `current_milestones`, `percent_complete` |
| **Field Welds** | On-site welded joints requiring QC | `weld_number`, `welder_id`, `nde_result`, `repair_count` |
| **Drawings** | Engineering drawing references | `drawing_no_raw`, `drawing_no_norm`, `title`, `rev` |
| **Test Packages** | QC testing groups | `target_date`, `readiness_percentage` |
| **Welders** | Certified welder registry | `stencil`, `stencil_norm`, `status` |
| **Areas/Systems** | Metadata for grouping | Physical locations / functional systems |
| **Progress Templates** | Milestone weight definitions | Per component type, customizable per project |

### 11 Component Types

`valve`, `pipe`, `fitting`, `flange`, `field_weld`, `support`, `threaded_pipe`, `instrument`, `tubing`, `hose`, `misc_component`

### Identity Key Patterns

**Discrete types** (spool, field_weld): `{spool_id: "SP-001"}` or `{weld_number: "W-001"}`

**Commodity types** (pipe, valve, etc.): `{drawing_norm: "P-001", commodity_code: "PIPE-CS-001", size: "6\"", seq: 1}`

### Milestone System

**Lifecycle**: Budget → Receive → Install → Test → Punch → Restore

**Values**:
- Discrete milestones: `0` (incomplete) or `1` (complete)
- Partial milestones: `0-100` (percentage)

**Earned Value Formula**: `SUM(milestone_weight × milestone_value) / SUM(milestone_weight)`

## Step 3: Present Architecture Summary

### Tech Stack

- **Frontend**: React 18, TypeScript 5 (strict), Vite, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL 15+, Auth, Realtime, Storage)
- **State**: TanStack Query (server), Zustand (client), React Context (auth)
- **Testing**: Vitest, Testing Library, jsdom

### State Management Layers

| Layer | Tool | Purpose | Persistence |
|-------|------|---------|-------------|
| Server | TanStack Query | Database data | Query cache |
| Client | Zustand | UI preferences, filters, sorting | localStorage |
| Auth | React Context | Session, user, role | Supabase session |

### Key Files

| Purpose | Location |
|---------|----------|
| Entry | `src/main.tsx`, `src/App.tsx` |
| Auth | `src/contexts/AuthContext.tsx` |
| Project | `src/contexts/ProjectContext.tsx` |
| Hooks | `src/hooks/` (136+ files) |
| Stores | `src/stores/` (9 Zustand stores) |
| Types | `src/types/database.types.ts` |
| Supabase | `src/lib/supabase.ts` |

### Path Alias

`@/*` → `./src/*` (configured in tsconfig.app.json, vite.config.ts, vitest.config.ts)

## Step 4: Critical Patterns

### Top 10 Rules (Violating = Automatic Failure)

1. **TypeScript Strict Mode** - No `any` types, handle all edge cases
2. **TDD First** - Write failing test before implementation code
3. **RLS on Everything** - All tables have RLS, data-modifying RPCs use SECURITY DEFINER
4. **Never Expose Service Keys** - Service role key never in client code
5. **Never Modify Old Migrations** - Create new migration, never edit existing
6. **SECURITY DEFINER RPCs** - All data-modifying functions must be SECURITY DEFINER with permission checks
7. **TanStack Query Only** - Never bare Supabase calls in components, always use hooks
8. **Shadcn/Radix Patterns** - Follow existing component patterns, use Radix primitives
9. **Mobile-First** - ≤1024px breakpoint, ≥44px touch targets, test on mobile
10. **Virtualize Large Lists** - Use @tanstack/react-virtual for 50+ items

### RLS Pattern (Single-Org Model)

RLS filters by `user_id` and `project_id`, not `organization_id`. Refactored from multi-tenant in Sprint 1.

## Step 5: Common Gotchas

### Migration Push
**Problem**: `supabase db push --linked` hangs on Supabase CLI v2.58.5

**Solution**: Always use `./db-push.sh` (uses session mode port 5432)

### Migration Timestamps
**Problem**: Creating multiple migrations within same second causes duplicate key error

**Solution**: Wait 2+ seconds between `supabase migration new` commands

### Milestone Values
**Problem**: Legacy code used boolean (true/false), now uses numeric (1/0 or 0-100)

**Solution**: Always use numeric values in milestone updates

### PDF Export
**Problem**: @react-pdf/renderer is 700KB-1.2MB, breaks bundle if top-level imported

**Solution**: Lazy load via dynamic imports, desktop-only (hidden on mobile ≤1024px)

### Type Generation
After schema changes, regenerate types:
```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

## Step 6: Engage User

After presenting context, ask:

> **What area would you like to work on?**
>
> I can dive deeper into:
> - Component milestone tracking
> - Field weld management (welder assignment, NDE, repairs)
> - Progress reports and PDF export
> - CSV/Excel import
> - Team management and permissions
> - Database migrations and RLS
> - Testing patterns
>
> Or tell me about the feature/bug you're working on and I'll load relevant context.

## Quick Reference Commands

```bash
# Dev server
npm run dev

# Type check
tsc -b

# Run tests
npm test

# Lint
npm run lint

# Push migrations
./db-push.sh

# Generate types
supabase gen types typescript --linked > src/types/database.types.ts
```

## Documentation Links

- **Project status**: `docs/PROJECT-STATUS.md`
- **Glossary**: `docs/GLOSSARY.md`
- **Knowledge base**: `docs/KNOWLEDGE-BASE.md`
- **Design rules**: `docs/plans/2025-11-06-design-rules.md`
- **RLS rules**: `docs/security/RLS-RULES.md`
- **Feature specs**: `specs/` directory
