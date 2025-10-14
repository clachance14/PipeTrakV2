7.6 Sprint 5: Bulk Updates & Test Packages (Week 6)

Duration: 5 days
Team: 2 Full-stack Developers

GOALS:
- Implement multi-type bulk update (intersection logic)
- Implement Test Package CRUD
- Implement Package Readiness Dashboard
- Implement global search

TASKS (TDD ORDER - Tests First):

**Phase 1: Write Integration Tests (MUST FAIL initially)**
□ Write tests for multi-type bulk update:
  - Test: Spools + Valves shows intersection (Punch/Test/Restore only)
  - Test: No shared milestones shows error message
  - Test: Confirmation modal shows for >10 items
  - Test: Returns accurate summary {updated: 50, skipped: 0, flagged: 2}
□ Write tests for bulk-update-milestones Edge Function:
  - Test: Validates all components share milestone
  - Test: Updates components.current_milestones in single transaction
  - Test: Creates milestone_events for each component (batch insert)
  - Test: Creates audit_log entries
  - Test: Checks dependencies, creates OUT_OF_SEQUENCE reviews
  - Test: Atomic rollback on any failure
□ Write performance tests:
  - Test: Bulk update 50 components completes in <10s
  - Test: Edge function handles 100 components without timeout

**Phase 2: Write Component Tests (MUST FAIL initially)**
□ Write tests for TestPackageCRUD:
  - Test: Create package modal saves with name, description, target_date
  - Test: Assign components multi-select updates test_package_id
  - Test: Edit package updates without data loss
  - Test: Reassigning components creates audit_log entry
□ Write tests for PackageReadinessPage:
  - Test: Calculates % correctly (matches mv_package_readiness)
  - Test: Shows blocker count (pending needs_review count)
  - Test: Filter "Near Ready" shows only ≥80%
  - Test: Filter "Blocked" shows packages with >0 pending reviews
  - Test: Clicking card navigates to components view
□ Write tests for global search:
  - Test: Typeahead shows after 2+ characters typed
  - Test: Searches component ID, drawing, area, system, package
  - Test: Returns first 50 results
  - Test: Clicking result expands drawing and scrolls to row
  - Test: Returns results in <500ms (performance test)

**Phase 3: Implement Features (Tests Should Now Pass)**
□ Enhance bulk update to support mixed component types:
  - Calculate shared milestones (intersection logic)
  - Show message if no shared milestones
  - Confirmation modal for >10 items
  - Summary after apply
□ Implement Edge Function: bulk-update-milestones
  - Validate all components share the milestone
  - Update components.current_milestones in transaction
  - Create milestone_events for each component
  - Create audit_log entries
  - Check dependencies (create OUT_OF_SEQUENCE reviews)
  - Return summary: {updated, skipped, flagged}
□ Build TestPackageCRUD:
  - Create package (modal: name, description, target_date)
  - Assign components to package (multi-select from components table)
  - Edit package (update name/description/target_date)
  - Reassign components (audit trail)
□ Build PackageReadinessPage:
  - Card-based layout (one card per package)
  - Show: package name, %, component count, blockers (pending Needs Review)
  - Filter: "Near Ready" (≥80%), "Blocked" (>0 pending reviews)
  - Click card → drill down to components
□ Implement global search:
  - Typeahead (2+ characters)
  - Search: component ID, drawing number, area, system, package
  - Show first 50 results
  - Click result → expand drawing, scroll to component row

DELIVERABLES:
✅ Multi-type bulk update functional
✅ Test Package CRUD working
✅ Package Readiness Dashboard showing real-time %
✅ Global search functional
✅ Bulk update edge function ≥80% coverage
✅ Package readiness calculations match materialized view (verified in tests)

ACCEPTANCE CRITERIA:
- Bulk update 50 Spools + Valves shows only Punch/Test/Restore (verified in tests)
- Package card shows accurate % within 1% of manual calculation (verified in tests)
- Global search returns results in <500ms (verified in performance tests)
- Bulk update 50 components completes in <10s (verified in performance tests)

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: Package types match database schema, intersection logic type-safe
- ✅ II. Component-Driven: TestPackageCRUD, PackageReadinessPage follow shadcn/ui patterns
- ✅ III. Testing Discipline: Integration tests for bulk update, performance tests for search
- ✅ IV. Supabase Integration: Package queries use materialized view (mv_package_readiness)
- ✅ V. Specify Workflow: Tests verify acceptance criteria before implementation

──────────────────────────────────────────────────────────────────────────────
