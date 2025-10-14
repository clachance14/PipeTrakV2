7.5 Sprint 4: Welder Management & Needs Review (Week 5)

Duration: 5 days
Team: 2 Full-stack Developers

GOALS:
- Implement welder directory (CRUD)
- Implement welder verification workflow
- Implement Needs Review queue (all 6 types)
- Implement resolution workflows

TASKS (TDD ORDER - Tests First):

**Phase 1: Write Component Tests (MUST FAIL initially)**
□ Write tests for WelderDirectoryPage:
  - Test: Lists all welders for current org
  - Test: Filters by status (unverified/verified)
  - Test: Search by name/stencil filters results
  - Test: Shows usage count (# of milestone_events)
□ Write tests for NeedsReviewPage:
  - Test: Groups reviews by type (6 groups)
  - Test: Age badges show amber if <24h, red if ≥24h
  - Test: Filters work (type, age, component)
  - Test: Clicking review expands details

**Phase 2: Write Integration Tests (MUST FAIL initially)**
□ Write tests for welder verification workflow:
  - Test: Verify button changes status to verified, records verified_by + verified_at
  - Test: Unverified welder used 6 times creates VERIFY_WELDER needs_review
  - Test: Auto-flag triggers only once per welder
□ Write tests for welder merge:
  - Test: Reassigns all milestone_events to primary welder
  - Test: Soft-deletes duplicate welder (is_deleted=true)
  - Test: Creates audit_log entry with action=MERGE_WELDER
□ Write tests for resolution workflows (all 6 types):
  - Test: OUT_OF_SEQUENCE approval marks resolved
  - Test: ROLLBACK approval marks resolved
  - Test: DELTA_QUANTITY approval adds 3 support instances
  - Test: DRAWING_CHANGE approval updates component.drawing_id
  - Test: SIMILAR_DRAWING rejection merges components into existing drawing
  - Test: VERIFY_WELDER verification updates welder status
□ Write tests for resolve-needs-review Edge Function:
  - Test: Applies resolution logic correctly
  - Test: Updates needs_review.status = 'resolved'
  - Test: Creates audit_log entry for each resolution
  - Test: RLS: User without can_resolve_reviews cannot resolve
□ Write tests for coalescing logic:
  - Test: Daily DELTA_QUANTITY reviews coalesce by group_key
  - Test: Multiple deltas (+2, -1, +3) combine into single review

**Phase 3: Implement Features (Tests Should Now Pass)**
□ Build WelderDirectoryPage:
  - List all welders (table: name, stencil, status, usage count)
  - Filter by status (unverified, verified)
  - Search by name/stencil
□ Implement welder verification:
  - Button: "Verify" (changes status to verified, records verified_by + verified_at)
  - Auto-flag: If unverified welder used >5 times → create Needs Review: VERIFY_WELDER
□ Implement welder merge:
  - Modal: "Merge welder A into welder B?"
  - Reassign all milestone_events to primary welder
  - Soft-delete duplicate welder
  - Log to audit_log
□ Build NeedsReviewPage (desktop only):
  - List all pending reviews (grouped by type)
  - Age badges (24h amber, 48h red)
  - Filters: type, age, component
□ Implement resolution workflows:
  - OUT_OF_SEQUENCE: Approve (mark resolved) or Ignore
  - ROLLBACK: Approve (mark resolved) or Investigate
  - DELTA_QUANTITY: Approve (add/remove instances) or Reject
  - DRAWING_CHANGE: Approve (update component.drawing_id) or Reject
  - SIMILAR_DRAWING: Approve (confirm new) or Reject (merge)
  - VERIFY_WELDER: Verify or Merge
□ Implement resolution logic (Edge Function: resolve-needs-review):
  - Apply resolution (e.g., add instances, merge drawings)
  - Update needs_review.status = 'resolved'
  - Log to audit_log
□ Implement coalescing: Daily DELTA_QUANTITY reviews per group_key

DELIVERABLES:
✅ Welder directory functional
✅ Welder verification working
✅ Needs Review queue showing all 6 types
✅ Resolution workflows functional
✅ Test coverage ≥70% for welder workflow
✅ All needs_review resolution tests passing

ACCEPTANCE CRITERIA:
- QC can verify welder from directory (verified in tests)
- Unverified welder used 6 times creates Needs Review (verified in tests)
- Resolving DELTA_QUANTITY adds 3 new support instances (verified in tests)
- Resolving SIMILAR_DRAWING merges components into existing drawing (verified in tests)
- All 6 resolution workflow tests pass

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: Welder types defined, strict typing for resolution workflows
- ✅ II. Component-Driven: WelderDirectoryPage, NeedsReviewPage components follow patterns
- ✅ III. Testing Discipline: Integration tests for all 6 resolution types written first
- ✅ IV. Supabase Integration: resolve-needs-review Edge Function enforces RLS
- ✅ V. Specify Workflow: TDD phases followed (tests → implementation)

──────────────────────────────────────────────────────────────────────────────
