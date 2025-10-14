7.3 Sprint 2: Component Types & Milestones (Week 3)

Duration: 5 days
Team: 2 Full-stack Developers

GOALS:
- Implement milestone toggle UI for discrete components
- Implement welder capture for Field Welds
- Implement bulk update (single component type only)

TASKS (TDD ORDER - Tests First):

**Phase 1: Write Component Tests (MUST FAIL initially)**
□ Write tests for MilestoneButton component:
  - Test: Shows unchecked state when milestone not complete
  - Test: Shows checked state (green checkmark) when milestone complete
  - Test: Optimistic update shows checked immediately on click
  - Test: 2-second undo window displays after toggle
  - Test: Calls mutation with correct component_id and milestone name
  - Test: Reverts optimistic update if mutation fails
□ Write tests for WeldMadeModal component:
  - Test: Welder typeahead filters welders by name as user types
  - Test: Welder typeahead shows "Add new welder" option when no match
  - Test: Can add new welder inline (status=unverified)
  - Test: Saves welder + milestone + event atomically (single mutation)
  - Test: Shows validation error if welder name empty
□ Write tests for NeedsReviewBadge component:
  - Test: Shows amber badge if created <24h ago
  - Test: Shows red badge if created ≥24h ago
  - Test: Displays reason text on hover
□ Write tests for ComponentRow component:
  - Test: Renders all fields (type, drawing, milestones, %, last_updated)
  - Test: Shows NeedsReviewBadge when component has pending review
  - Test: Milestone buttons disabled when user lacks can_update_milestones

**Phase 2: Write Integration Tests (MUST FAIL initially)**
□ Write integration tests for milestone update workflow:
  - Test: Update creates milestone_events entry with correct timestamp
  - Test: Update creates audit_log entry with user_id and action
  - Test: Update recalculates percent_complete (verify calculation)
  - Test: Out-of-sequence milestone creates needs_review entry (type: OUT_OF_SEQUENCE)
  - Test: Prerequisite check: Cannot mark "Connect" complete before "Erect"
□ Write integration tests for bulk update (single type):
  - Test: Bulk update 25 Spools marks all Receive complete
  - Test: Confirmation modal shows for >10 items
  - Test: Returns summary {updated: 25, skipped: 0, flagged: 0}
  - Test: Skips components that don't have the milestone in their template
  - Test: Flags components with out-of-sequence dependencies
□ Write performance tests for virtualized table:
  - Test: 10k row table renders in <500ms
  - Test: Scrolling maintains 60fps (no dropped frames)
  - Test: Filtering 10k rows updates UI in <300ms

**Phase 3: Implement Features (Tests Should Now Pass)**
□ Implement ComponentsTable with TanStack Virtual
  - Test with 10k dummy rows
  - Target: 60fps scrolling
□ Build MilestoneButton component (toggle discrete milestones)
  - Show green checkmark when complete
  - 2-second undo window
  - Optimistic updates
□ Build ComponentRow (show all fields: type, drawing, milestones, %, last_updated)
□ Implement milestone update mutation:
  - Update components.current_milestones
  - Create milestone_events entry
  - Create audit_log entry
  - Trigger recalculates percent_complete
□ Build WeldMadeModal (for Field Welds):
  - Welder typeahead (search welders table)
  - Add new welder inline (status=unverified)
  - Atomic save: welder + milestone + event
□ Implement dependency detection (warn & log):
  - Check prerequisite milestones
  - Create needs_review entry if out-of-sequence
□ Build NeedsReviewBadge component (show on component rows)
  - Amber if <24h, red if >24h
□ Implement single-type bulk update:
  - Select multiple Spools → mark Receive complete
  - Confirmation modal if >10 items
  - Summary: "Updated X, skipped Y, flagged Z"

DELIVERABLES:
✅ Virtualized table with 10k rows (smooth scrolling)
✅ Milestone toggles functional for Spools, Field Welds, Supports
✅ Welder capture for Weld Made
✅ Bulk update for single component type
✅ Test coverage ≥60% for components, ≥70% for utilities
✅ All integration tests passing

ACCEPTANCE CRITERIA:
- Foreman can update 25 Spools in <10s (bulk Receive)
- Welder typeahead shows existing welders
- Out-of-sequence milestone creates Needs Review entry (verified in tests)
- p90 milestone update <1s (measured in performance tests)
- All milestone and bulk update tests pass before feature merge

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: TypeScript strict mode passing, no unchecked array access
- ✅ II. Component-Driven: MilestoneButton, WeldMadeModal follow shadcn/ui patterns (Radix primitives)
- ✅ III. Testing Discipline: Component tests written before components, integration tests before workflows
- ✅ IV. Supabase Integration: TanStack Query used for milestone mutations, optimistic updates
- ✅ V. Specify Workflow: Features follow TDD workflow (Red-Green-Refactor)

──────────────────────────────────────────────────────────────────────────────
