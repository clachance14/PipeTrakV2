# PipeTrak V2 Documentation Index

Welcome to the PipeTrak V2 documentation! This index provides a comprehensive overview of all documentation resources available for the project.

---

## Quick Start Resources

**New to PipeTrak V2?** Start here:

### 📚 [GLOSSARY.md](./GLOSSARY.md)
**Complete glossary of domain-specific and technical terminology**

Essential reference for understanding the specialized language used throughout the project:
- Industrial construction terms (brownfield, material takeoff, commodity code, component identity key)
- Welding & quality control (field weld, NDE methods, repair weld, welder assignment)
- Progress tracking concepts (discrete/partial milestones, earned value, progress templates)
- Component types (pipe, valve, instrument, field weld, threaded pipe)
- User roles & permissions (owner, admin, foreman, QC inspector, welder, viewer)
- Technical terms (RLS, SECURITY DEFINER, optimistic update, cache invalidation)

**Use When**: You encounter an unfamiliar term, acronym, or domain concept.

---

### 🏗️ [KNOWLEDGE-BASE.md](./KNOWLEDGE-BASE.md)
**Architecture patterns, critical migrations, and development workflows**

Comprehensive guide to the project's technical architecture and development practices:
- **Architecture Overview**: Single-org model, RLS security, TanStack Query, mobile-first design
- **Database Patterns**: SECURITY DEFINER functions, RLS policy templates, JSONB milestone storage
- **Frontend Patterns**: TanStack Query conventions, permission-gated UI, mobile responsiveness
- **Critical Migrations**: Context and lessons learned from migrations 00008, 00037-00049, 00057, 00067, 00084
- **Feature Dependencies**: Dependency graph, integration points, cross-cutting concerns
- **Development Workflows**: TDD cycle, database changes, mobile-first development, permission integration

**Use When**: You need to understand architectural decisions, implement a new feature, or debug complex issues.

---

## Documentation by Category

### 🔒 Security & Access Control

#### [security/RLS-RULES.md](./security/RLS-RULES.md)
**Comprehensive Row Level Security (RLS) patterns and guidelines**

Detailed documentation of RLS policy patterns, SECURITY DEFINER functions, and access control implementation:
- Organization-scoped isolation patterns
- Project-scoped access control
- Role-based modification policies
- Last-owner protection patterns
- SECURITY DEFINER function templates
- Testing RLS policies

**Use When**: Creating new database tables, implementing RLS policies, or debugging permission issues.

#### [security/RLS-AUDIT-CHECKLIST.md](./security/RLS-AUDIT-CHECKLIST.md)
**Quick reference checklist for RLS policy implementation**

Condensed checklist for ensuring RLS policies are correctly implemented:
- Pre-migration checklist (planning)
- During migration checklist (implementation)
- Post-migration checklist (validation)
- Common pitfalls and solutions

**Use When**: Creating a new migration with RLS policies or auditing existing policies.

---

### 📐 Design & Development Patterns

#### [plans/2025-11-06-design-rules.md](./plans/2025-11-06-design-rules.md)
**Comprehensive development patterns and recipes**

Recipe-based guides for common development tasks:
- Creating pages, forms, tables, and modals
- Mobile-responsive layout patterns (≤1024px breakpoint, ≥44px touch targets)
- Permission-gated features and RLS integration
- Type safety patterns and database type usage
- Accessibility checklist (WCAG 2.1 AA compliance)
- Testing patterns and coverage requirements

**Use When**: Implementing a new UI component, form, or page that needs to follow project conventions.

---

### 🐛 Bug Fixes & Debugging

#### [BUG-FIXES.md](./BUG-FIXES.md)
**Complete history of bug fixes and resolved issues**

Chronological record of bugs encountered and resolved:
- Bug description and root cause analysis
- Solution implementation details
- Affected files and migrations
- Lessons learned and prevention strategies

**Use When**: Debugging similar issues or understanding why certain patterns exist.

---

### 📋 Planning & Design Documents

The `plans/` directory contains 29 design documents for various features and architectural decisions:

#### Key Planning Documents:
- **2025-11-08-earned-value-manhour-tracking-design.md** - Earned value and labor hour tracking
- **2025-11-06-design-rules.md** - Development patterns and recipes (see above)
- **2025-10-29-weekly-field-weld-reports.md** - Field weld reporting requirements
- **2025-10-28-weekly-progress-reports.md** - Progress report generation design
- **2025-10-27-team-management.md** - Team invitation and role management
- **2025-10-26-mobile-milestone-updates.md** - Mobile UI patterns for milestone updates

**Full List**: See `plans/` directory for all planning documents

**Use When**: Understanding the rationale behind feature design decisions or planning similar features.

---

### 📊 Business & Growth

The `business/` directory contains business planning and growth strategy documents:

- **affiliate-program.md** - Affiliate marketing program design
- **growth-plan-feb-2026.md** - Growth strategy and milestones
- **growth-plan-jan-2026.md** - Previous growth plan iteration
- **lead-magnet-ideas.md** - Marketing lead generation strategies

**Use When**: Understanding business context or planning marketing initiatives.

---

### ✨ Feature Documentation

The `features/` directory contains feature-specific documentation:

- **weekly-field-weld-reports.md** - Field weld reporting feature documentation

**Note**: Most feature documentation lives in the `../specs/` directory (see Feature Specifications section below).

---

### 🧪 Testing Documentation

The `testing/` directory contains testing-specific guides:

- **csv-template-download-testing.md** - Manual testing guide for CSV template downloads
- **test-csv-import-flow.md** - CSV import workflow testing procedures
- **test-metadata-assignment.md** - Metadata assignment feature testing

**Use When**: Performing manual testing or understanding test workflows.

---

## Feature Specifications

**Location**: `../specs/` directory (one level up from docs/)

Each feature has its own directory with detailed implementation notes, specifications, and status:

### Recent Features:
- **025-threaded-pipe-inline-input/** - Inline numeric inputs for partial milestones (2025-11-07)
- **022-weld-log-mobile/** - Mobile-optimized weld log table (2025-11-02)
- **021-public-homepage/** - Public marketing homepage with demo signup (2025-10-29)
- **019-weekly-progress-reports/** - Progress reporting with PDF/Excel/CSV export (2025-10-28)
- **016-team-management-ui/** - Team member management and invitations (2025-10-27)
- **015-mobile-milestone-updates/** - Mobile UI patterns and field weld management (2025-10-26)
- **011-drawing-component-metadata/** - Metadata assignment UI (2025-10-21)
- **010-drawing-centered-component-table/** - Component progress table (2025-10-19)
- **009-sprint-3-material/** - CSV material takeoff import (2025-10-19)

**Full List**: See `../specs/` directory for all feature specifications

**Use When**: Understanding how a specific feature works, its design decisions, or implementation details.

---

## Database Documentation

### Migrations
**Location**: `../supabase/migrations/` (one level up from docs/)

82+ migrations documenting the complete database schema evolution:

**Critical Migrations** (see [KNOWLEDGE-BASE.md - Critical Migrations](./KNOWLEDGE-BASE.md#critical-migrations) for details):
- **00084**: Convert boolean milestones to numeric (2025-11-08) - Fixed welder assignment 400 error
- **00067**: Demo RLS policies (2025-10-29) - Demo user isolation
- **00057**: Earned milestone value function (2025-10-28) - Weighted progress calculation
- **00037-00049**: Invitation flow fixes (2025-10-26 to 2025-10-27) - 13 migrations to fix email confirmation
- **00008**: Single-org refactor (Sprint 0) - Removed multi-tenant, simplified RLS

### Database Types
**Location**: `../src/types/database.types.ts`

Auto-generated TypeScript types from Supabase schema. Regenerate after migrations with:
```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

---

## Project Configuration Files

### Root Documentation
- **../CLAUDE.md** - Main project guide for Claude Code (AI assistant instructions)
- **../README.md** - Project overview and setup instructions
- **../package.json** - Dependencies and scripts
- **../.env.example** - Environment variable template

### Specify Workflow
**Location**: `../.specify/` directory

- **memory/constitution.md** - Project constitution (development principles and standards)
- **templates/** - Templates for specification, planning, and task generation

---

## How to Navigate This Documentation

### I want to...

**Understand a term or acronym**
→ Check [GLOSSARY.md](./GLOSSARY.md)

**Understand why the architecture works this way**
→ Read [KNOWLEDGE-BASE.md](./KNOWLEDGE-BASE.md)

**Implement a new feature with RLS policies**
→ Read [security/RLS-RULES.md](./security/RLS-RULES.md) + [KNOWLEDGE-BASE.md - Database Patterns](./KNOWLEDGE-BASE.md#database-patterns)

**Create a new UI component following project patterns**
→ Read [plans/2025-11-06-design-rules.md](./plans/2025-11-06-design-rules.md)

**Debug a permission or RLS issue**
→ Check [security/RLS-AUDIT-CHECKLIST.md](./security/RLS-AUDIT-CHECKLIST.md) + [BUG-FIXES.md](./BUG-FIXES.md)

**Understand how a specific feature works**
→ Check `../specs/{feature-number}-{feature-name}/` directory

**See what migrations are critical and why**
→ Read [KNOWLEDGE-BASE.md - Critical Migrations](./KNOWLEDGE-BASE.md#critical-migrations)

**Understand feature dependencies**
→ See [KNOWLEDGE-BASE.md - Feature Dependencies](./KNOWLEDGE-BASE.md#feature-dependencies)

**Follow TDD workflow**
→ See [KNOWLEDGE-BASE.md - Development Workflows](./KNOWLEDGE-BASE.md#development-workflows)

---

## Contributing to Documentation

When adding new documentation:

1. **Update this index** - Add your new document to the appropriate category
2. **Cross-reference** - Link to related documentation (especially GLOSSARY.md and KNOWLEDGE-BASE.md)
3. **Keep definitions in GLOSSARY.md** - Don't duplicate term definitions; link to the glossary
4. **Document patterns in KNOWLEDGE-BASE.md** - Add new architectural patterns or critical migrations
5. **Update CLAUDE.md** - If your changes affect how Claude Code should work with the codebase

---

**Last Updated**: 2025-11-10
**Maintained By**: Development team
