7.2 Sprint 1: Core Foundation (Week 2)

Duration: 5 days
Team: 2 Full-stack Developers

GOALS:
- Complete database schema (all 13 tables)
- Seed progress templates
- Implement RLS policies
- Basic project/drawing/component CRUD

TASKS (TDD ORDER - Tests First):

**Phase 1: Write Database Tests (MUST FAIL initially)**
□ Write RLS policy integration tests:
  - Test: User in org A cannot read org B projects (must fail until RLS created)
  - Test: User in org A cannot read org B components
  - Test: User without can_update_milestones cannot update components
  - Test: User with can_update_milestones CAN update their org's components
□ Write stored procedure tests:
  - Test: calculate_component_percent() returns 0% when no milestones complete
  - Test: calculate_component_percent() returns 50% when half complete (Spool: Receive+Erect)
  - Test: calculate_component_percent() returns 100% when all complete
  - Test: detect_similar_drawings('P-001') finds 'P-0001' with >85% similarity
  - Test: detect_similar_drawings() excludes retired drawings
□ Write component tests for data layer hooks:
  - Test: useProjects() returns only current org's projects
  - Test: useComponents() fetches components for given project
  - Test: useDrawings() returns drawings filtered by project_id

**Phase 2: Implement Database (Tests Should Now Pass)**
□ Create all database tables (see §4.1)
  - organizations, projects, users, user_organizations, user_capabilities
  - drawings, areas, systems, test_packages
  - progress_templates, components, milestone_events
  - welders, needs_review, audit_log
□ Create indexes for performance (see §4.1)
□ Create RLS policies for all tables (run tests to verify)
□ Seed progress_templates table with 6 templates:
  - Spool, Field Weld, Support/Valve/Fitting/Flange, Threaded Pipe, Insulation, Paint
□ Implement stored procedures:
  - calculate_component_percent()
  - detect_similar_drawings()
□ Create materialized views:
  - mv_package_readiness
  - mv_drawing_progress
□ Set up materialized view refresh job (every 60s)

**Phase 3: Write Frontend Component Tests (MUST FAIL initially)**
□ Write component tests for ProjectListPage:
  - Test: Renders project list for authenticated user
  - Test: Shows empty state when no projects
  - Test: Filters projects by organization
□ Write component tests for ComponentsTable:
  - Test: Renders component rows
  - Test: Shows component fields (type, drawing, %, last_updated)
  - Test: Handles empty state

**Phase 4: Implement Frontend (Tests Should Now Pass)**
□ Build frontend data layer:
  - Generate TypeScript types from schema
  - Create TanStack Query hooks (useComponents, useDrawings, usePackages)
  - Create Zustand stores (authStore, uiStore)
□ Build ProjectListPage (list all projects for logged-in user)
□ Build ProjectDetailPage skeleton (tree navigation placeholder)
□ Build basic ComponentsTable (non-virtualized, <100 rows for testing)

DELIVERABLES:
✅ All database tables created with RLS
✅ RLS test suite passing (multi-tenant isolation verified)
✅ Stored procedure tests passing
✅ Progress templates seeded
✅ ProjectListPage functional with test coverage
✅ Can create test project + drawing + component via Supabase Studio
✅ Test coverage ≥70% for new code

ACCEPTANCE CRITERIA:
- User can view projects (filtered by org)
- User cannot view other orgs' projects (RLS enforced AND tested)
- Component percent_complete auto-calculates when milestones change (tested)
- All RLS integration tests pass in CI
- Database has ≥80% test coverage for business logic

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: Database types auto-generated, path aliases used (`@/*`)
- ✅ II. Component-Driven: React hooks (TanStack Query) used for server state
- ✅ III. Testing Discipline: RLS tests written before policies, stored procedure tests before implementation
- ✅ IV. Supabase Integration: RLS enabled on all tables, TanStack Query wraps all Supabase calls
- ✅ V. Specify Workflow: Sprint follows TDD phases (write tests → implement)

──────────────────────────────────────────────────────────────────────────────
