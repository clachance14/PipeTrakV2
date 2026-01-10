# Test Package Workflow Stages and Handoffs

**Document Version**: 2.0
**Last Updated**: 2026-01-08
**Audience**: Project managers, QC coordinators, field engineers

---

## Purpose

This document defines the workflow stages for test packages at ICS, from initial planning through client handoff. It details stage requirements, responsibilities, deliverables, and handoff procedures for each phase.

**Scope**: Contractor workflow through first client handoff. MC (Mechanical Complete) and subsequent activities are out of scope for this document.

---

## Workflow Overview

### ICS Test Package Lifecycle (Contractor Scope)

```
┌─────────────────────┐
│                     │
│      PLANNING       │  Define test packages, assign ISOs
│                     │  Determine test type and pressure
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│                     │
│    CONSTRUCTION     │  Install welds, NDE inspection
│                     │  Install TESTABLE components only
└──────────┬──────────┘
           │ All welds + NDE + testable components complete
           ▼
┌─────────────────────┐
│                     │
│   PRE-TEST PUNCH    │  QC walkdown
│                     │  Verify test readiness
└──────────┬──────────┘
           │ QC approval
           ▼
┌─────────────────────┐
│                     │
│        TEST         │  Hydro or Pneumatic test
│                     │  Repair in place if fails, retest
└──────────┬──────────┘
           │ Test passes
           ▼
┌─────────────────────┐
│                     │
│       RESTORE       │  Install spec gaskets
│                     │  Install excluded components
│                     │  Install instruments, relief valves
└──────────┬──────────┘
           │ All restoration items installed
           ▼
┌─────────────────────┐
│                     │
│   POST-TEST PUNCH   │  Verify restoration complete
│                     │  Check for test damage
│                     │  Confirm documentation complete
└──────────┬──────────┘
           │ QC approval
           ▼
┌─────────────────────┐
│                     │
│   CLIENT HANDOFF    │  Joint walkdown with client
│                     │  Deliver Package Completion Report
│                     │
└─────────────────────┘
           │
           ▼
    ┌─────────────────────────────────────────┐
    │  OUT OF SCOPE:                          │
    │  - Client punch review                  │
    │  - MC (Mechanical Complete)             │
    │  - Turnover to commissioning            │
    └─────────────────────────────────────────┘
```

**Key Insight**: Mechanical Complete (MC) is a contractual milestone that occurs AFTER client handoff, with multiple signatures required. It is NOT a pre-testing gate.

---

## Stage Definitions

### Stage 1: Planning

**Purpose**: Define test package scope, boundaries, and requirements before or during early construction.

**Activities**:
- Identify test package groupings (area, pressure class, service type)
- Assign ISOs to test packages
- Identify isolation points (flanges, valves, dead ends)
- Determine test type (hydrotest vs pneumatic)
- Receive test pressure from engineering (provided, NOT calculated by contractor)
- Prepare test procedures
- Identify components to exclude from test (will be installed during Restore)

**Responsibilities**:
- **Piping Engineer / QC Lead**: Define test packages
- **Project Engineer**: Review and approve test package plan
- **Client**: Accept test package boundaries (if required)

**Entry Criteria**:
- [ ] ISOs available (preliminary or final)
- [ ] Line list available (design pressure, service type)
- [ ] Construction schedule defined (sequence, milestones)

**Exit Criteria**:
- [ ] Test packages defined (ISOs assigned)
- [ ] Test boundaries identified (isolation points documented)
- [ ] Test type determined (hydrotest or pneumatic)
- [ ] Test pressure received from engineering
- [ ] Test procedures prepared (draft or template)
- [ ] Components excluded from test identified
- [ ] Test package plan approved by project management

**Deliverables**:
- Test package list (ID, description, ISO count, test type)
- Test boundary drawings or descriptions (isolation points)
- Test procedures (hydrostatic or pneumatic per ASME B31.3)
- List of components excluded from test

**PipeTrak Support**: Test package creation, ISO assignment, metadata tracking

---

### Stage 2: Construction

**Purpose**: Install all piping, components, and welds per approved ISOs. Install only components that will be tested.

**Activities**:
- Fabricate and install pipe spools (per ISOs)
- Weld pipe joints (butt welds, socket welds, fillet welds)
- Inspect welds (visual, NDE per code requirements)
- Install valves, fittings that are part of test
- Pressure-test individual spools (shop hydrotest, if required)
- Track component installation progress
- Do NOT install components excluded from test (instruments, some relief valves, etc.)

**Responsibilities**:
- **Craft Labor**: Install piping and components
- **Welders**: Execute welds per WPS (Welding Procedure Specification)
- **QC Inspectors**: Inspect welds, verify material traceability
- **NDE Technicians**: Radiography, ultrasonic, PT, MT testing

**Entry Criteria**:
- [ ] ISOs released for construction (approved for construction)
- [ ] Materials available (pipe, fittings, valves delivered)
- [ ] Welders qualified (welder performance qualified per ASME IX)
- [ ] WPS approved (welding procedures qualified)

**Exit Criteria**:
- [ ] All TESTABLE components installed (per ISO, excluding items marked for post-test install)
- [ ] All welds completed (no open joints)
- [ ] All NDE completed (radiography, ultrasonic per code)
- [ ] All NDE reports accepted (no rejectable indications)

**Deliverables**:
- Installed piping (per ISOs, testable scope)
- Weld maps (weld locations, numbers, welders)
- NDE reports (RT, UT, PT, MT results)
- Material test certificates (MTCs for all materials)

**PipeTrak Support**: Component tracking, weld logging, welder assignments, NDE status

---

### Stage 3: Pre-Test Punch

**Purpose**: QC walkdown to verify system is ready for pressure testing. Identify and resolve any issues before test.

**Activities**:
- **QC walkdown**:
  - Verify all testable components installed
  - Verify all welds complete and inspected
  - Verify all NDE reports accepted
  - Check physical installation (supports, hangers, alignment)

- **Test boundary verification**:
  - Blind flanges at isolation points
  - Isolation valves verified closed
  - Pipe caps/plugs at dead ends
  - Test equipment ready (gauges calibrated, pump/compressor available)

- **Safety review**:
  - Hazards identified
  - Barricades planned
  - PPE requirements defined

**Responsibilities**:
- **QC Inspector**: Perform walkdown, approve test readiness
- **Piping Lead / Test Coordinator**: Verify test boundaries and equipment
- **Safety Officer**: Review safety plan

**Entry Criteria**:
- [ ] Construction complete (Stage 2 exit criteria met)
- [ ] Test procedure approved
- [ ] Test equipment available

**Exit Criteria**:
- [ ] QC approval to proceed with test

**Note**: No formal checklist required. QC inspector approval is the gate.

**Deliverables**:
- QC approval (verbal or sign-off)
- Pre-test inspection notes (if issues found and resolved)

**PipeTrak Support**: Workflow stage tracking, sign-off capture

---

### Stage 4: Testing

**Purpose**: Execute pressure test per approved procedure. Verify system integrity (no leaks, no structural failures).

**Test Parameters** (provided by engineering, NOT calculated by contractor):
- **Test Type**: Hydrostatic, Pneumatic, Sensitive Leak, Alternative Leak, In-Service
- **Test Pressure**: Per line list / engineering spec (typically 1.5× design pressure per ASME B31.3)
- **Test Media**: Water, air, nitrogen, or specified medium

#### Hydrostatic Testing Procedure:
1. Fill system with water (from low point)
2. Vent all high points (remove all air)
3. Pressurize to ½ test pressure (preliminary check)
4. Preliminary inspection (check for leaks at lower pressure)
5. Pressurize to test pressure (gradually)
6. Hold at test pressure (minimum 10 minutes, typically 30-60 min)
7. Visual inspection (all welds, flanges, fittings)
8. Record results (pressure, time, temperature, leaks if any)
9. Depressurize and drain
10. Document test (test report, photos, inspector sign-off)

#### Pneumatic Testing Procedure:
1. Initial leak check at low pressure (25 psig, soap solution)
2. Pressurize to ½ test pressure (graduated pressurization)
3. Hold at ½ test pressure (10 minutes)
4. Increase in 1/10 increments (per ASME B31.1 procedure)
5. Hold at test pressure (minimum 10 minutes, typically 30-60 min)
6. Reduce to design pressure or 100 psig (for leak detection)
7. Leak detection (soap solution, ultrasonic, or pressure decay)
8. Record results (pressure, time, leaks if any)
9. Depressurize slowly (avoid rapid decompression hazards)
10. Document test (test report, photos, inspector sign-off)

**If Test Fails**:
- Identify leak location(s)
- Repair immediately in place (weld repair, flange re-torque, component replacement)
- Re-inspect repairs (visual + NDE if weld repair)
- Retest (full test procedure, same acceptance criteria)
- No separate stage transition - repair and retest until pass

**Responsibilities**:
- **Test Coordinator**: Lead test execution, pressurization control
- **QC Inspector**: Perform inspections, record results, sign test report
- **Third-Party Inspector (if required)**: Witness test, co-sign test report
- **Client (if required)**: Witness test, accept results

**Entry Criteria**:
- [ ] Pre-Test Punch complete (QC approval)
- [ ] Test procedure approved
- [ ] Test team briefed (roles, responsibilities, safety)
- [ ] Test area barricaded

**Exit Criteria** (PASS):
- [ ] Test pressure achieved and maintained (minimum 10 minutes)
- [ ] No visible leakage (hydrotest) or detected leakage (pneumatic)
- [ ] No structural deformation observed
- [ ] Test report completed and signed

**Deliverables**:
- Test report (pressure, time, temperature, results, photos)
- Inspector sign-off (contractor QC inspector certification)
- Third-party sign-off (if required by contract)

**PipeTrak Support**: Workflow stage tracking, test certificate storage

---

### Stage 5: Restore

**Purpose**: Install all components that were excluded from pressure testing. Replace test materials with permanent materials.

**Activities**:
- **Replace test materials**:
  - Remove test gaskets, install spec gaskets (permanent)
  - Remove test blinds (if temporary)

- **Install excluded components**:
  - Instruments and transmitters
  - Relief valves and safety devices
  - Components that couldn't handle test pressure
  - Any other items flagged as "exclude from test"

- **Final connections**:
  - Torque flanges to spec (with permanent gaskets)
  - Connect instrument tubing
  - Install protective covers

**Responsibilities**:
- **Craft Labor**: Install restoration items
- **Instrument Technicians**: Install instruments, transmitters
- **QC Inspector**: Verify correct installation

**Entry Criteria**:
- [ ] Test passed (Stage 4 exit criteria met)
- [ ] Restoration materials available (spec gaskets, instruments, relief valves)

**Exit Criteria**:
- [ ] All spec gaskets installed (test gaskets removed)
- [ ] All excluded components installed
- [ ] All instruments installed
- [ ] All relief valves/safety devices installed

**Deliverables**:
- Restoration completion checklist (informal)
- Updated component status in PipeTrak

**PipeTrak Support**: Component tracking, status updates

---

### Stage 6: Post-Test Punch

**Purpose**: Final QC verification that restoration is complete, no test damage occurred, and documentation is ready for client handoff.

**Activities**:
- **Restoration verification**:
  - All restoration items installed correctly
  - Spec gaskets in place (no test gaskets remaining)
  - Instruments properly connected
  - Relief valves installed and tagged

- **Test damage inspection**:
  - Check for leaks at flanges (from gasket replacement)
  - Check for support issues (from water weight during test)
  - Check for any deformation or damage

- **Documentation verification**:
  - Test reports complete and signed
  - Weld inspection package complete
  - Material test certificates collected
  - As-built updates (if changes made)

**Responsibilities**:
- **QC Inspector**: Final walkdown, documentation review
- **Document Control**: Compile package documentation

**Entry Criteria**:
- [ ] Restore complete (Stage 5 exit criteria met)
- [ ] All documentation ready for review

**Exit Criteria**:
- [ ] QC approval of restoration
- [ ] No test damage found (or repaired if found)
- [ ] Documentation package complete

**Deliverables**:
- QC sign-off
- Complete documentation package (ready for client)

**PipeTrak Support**: Workflow stage tracking, document links

---

### Stage 7: Client Handoff

**Purpose**: Joint walkdown with client construction team. Deliver documentation package. Transfer responsibility for package to client.

**Activities**:
- **Joint walkdown**:
  - Contractor + client construction team walk package together
  - Review installed scope
  - Identify any client concerns
  - Create joint punch list (if items found)

- **Documentation delivery**:
  - Present Package Completion Report
  - Hand over documentation package (test reports, weld package, MTCs)

**Responsibilities**:
- **Contractor QC Manager / Project Manager**: Lead handoff
- **Client Construction Team**: Receive package, conduct walkdown
- **Document Control**: Provide documentation package

**Entry Criteria**:
- [ ] Post-Test Punch complete (QC approval)
- [ ] Documentation package complete
- [ ] Client available for joint walkdown

**Exit Criteria**:
- [ ] Joint walkdown complete
- [ ] Package Completion Report delivered
- [ ] Client acknowledges receipt

**Deliverables**:
- Package Completion Report (existing PipeTrak report)
- Documentation package:
  - Test reports (hydrotest or pneumatic)
  - Weld inspection package (maps + NDE reports)
  - Material traceability package (MTCs)
  - As-built ISOs (if changes made)

**PipeTrak Support**: Package Completion Report generation

**Note**: This is the END of contractor scope for this document. Client punch review, MC, and turnover to commissioning are handled separately.

---

## Out of Scope: Post-Handoff Activities

The following activities occur AFTER client handoff and are NOT covered in this document:

### Client Punch Review
- Client construction team reviews package independently
- Client may create additional punch list items
- Contractor resolves client punch items

### Mechanical Complete (MC)
- **Contractual milestone** with multiple signatures required
- Requires:
  - All contractor punch items resolved
  - All client punch items resolved (or approved deferrals)
  - Complete documentation package accepted
  - MC Certificate signed by:
    - Contractor QC Manager
    - Project Manager
    - Client Representative
    - Third-Party (if required)

### Turnover to Commissioning
- Formal transfer of custody
- Commissioning team takes ownership
- Pre-commissioning activities begin (PSSR, cold comm, hot comm)

---

## Stage Transitions

### Transition Rules

**Forward Transition** (to next stage):
- Only when current stage exit criteria met
- Requires QC approval (minimum)
- Some stages may require client witness (per contract)

**Backward Transition**:
- Test fails → Repair in place and retest (no stage change)
- Issues found during Post-Test Punch → Return to Restore to fix
- Major issues → Return to appropriate earlier stage

### Approval Matrix

| Stage Transition | Contractor QC | Client | Notes |
|------------------|---------------|--------|-------|
| Planning → Construction | Approve | Review (optional) | Internal decision |
| Construction → Pre-Test Punch | Approve | - | QC verifies construction complete |
| Pre-Test Punch → Test | Approve | Witness (optional) | QC approves test readiness |
| Test → Restore | Approve | Witness (optional) | Test must pass |
| Restore → Post-Test Punch | Approve | - | All items installed |
| Post-Test Punch → Client Handoff | Approve | - | Ready for handoff |
| Client Handoff | Approve | Acknowledge | Joint walkdown |

---

## 7-Stage Workflow Sign-Offs (App Model)

The PipeTrak app uses a 7-stage sign-off model for acceptance tracking within test packages:

1. **Pre-Hydro Acceptance** - Maps to Pre-Test Punch QC approval
2. **Test Acceptance** - Maps to Test completion sign-off
3. **Drain/Flush Acceptance** - Post-test draining and cleaning
4. **Post-Hydro Acceptance** - Maps to Restore verification
5. **Protective Coatings Acceptance** - Coating application acceptance (if required)
6. **Insulation Acceptance** - Insulation installation acceptance (if required)
7. **Final Package Acceptance** - Maps to Client Handoff readiness

These sign-off stages are tracked in `package_workflow_stages` table. Not all stages are required for every package - stages can be skipped with reason (e.g., no coating required).

---

## Component Exclusion from Test

### Concept
Some components cannot or should not be pressure tested:
- Instruments/transmitters (can't handle test pressure)
- Relief valves (may lift at test pressure, or need to be installed post-test)
- Components with pressure ratings below test pressure
- Items that would be damaged by test media (water)

### Workflow
1. **During Planning**: Identify components to exclude from test
2. **During Construction**: Do NOT install excluded components
3. **During Restore**: Install excluded components after test passes

### PipeTrak Implementation (Future Enhancement)
- "Exclude from test" flag on component-package assignment
- Flag only - does not affect progress calculations
- Excluded components shown in Restore checklist

---

## Metrics and KPIs

### Test Package Progress Metrics

**Package Count by Stage**:
- Planning: X packages
- Construction: X packages
- Pre-Test Punch: X packages
- Testing: X packages
- Restore: X packages
- Post-Test Punch: X packages
- Client Handoff: X packages
- Total: X packages (100%)

### First-Time Pass Rate

**Formula**:
```
First-Time Pass Rate = (Packages passed on first test) / (Total packages tested) × 100%
```

**Target**: ≥85% (industry benchmark)

**Use**: Quality metric (high pass rate = good construction quality)

### Average Cycle Time by Stage

**Formula**:
```
Average Cycle Time = Σ(Stage Exit Date - Stage Entry Date) / Package Count
```

**Track per Stage**:
- Construction cycle time (days)
- Pre-Test to Test cycle time (days)
- Test to Restore cycle time (days)
- Total cycle time (Planning to Client Handoff)

**Use**: Identify bottlenecks

### Test Failure Root Causes

**Track by Failure Mode**:
- Weld defect: X failures
- Flange leak: X failures
- Valve leak: X failures
- Component defect: X failures
- Other: X failures

**Use**: Identify systemic quality issues

---

## Future Enhancement Opportunities

### Component Exclusion Tracking
- Add "exclude from test" flag to component-package assignment
- Show excluded components in separate section during Construction
- Generate Restore checklist automatically from excluded components

### Digital Test Execution
- Mobile-friendly test execution form
- Photo upload during test
- Digital signature capture
- Automatic test report generation

### Stage-Based Permissions
- Define roles per stage (who can approve transitions)
- Enforce stage transitions (prevent skipping required stages)
- Audit trail of all approvals

### Dashboard Visualization
- Kanban-style board (columns = stages, cards = packages)
- Drag-and-drop stage transitions
- Color-coded status (red = late, yellow = at risk, green = on track)

---

## Related Documentation

- [TEST-PACKAGE-WORKFLOW-CONTEXT.md](./TEST-PACKAGE-WORKFLOW-CONTEXT.md) - Industry standards and workflow overview
- [TEST-PACKAGE-CREATION.md](./TEST-PACKAGE-CREATION.md) - ISO-based test package creation guide
- [TESTING-PROCEDURES.md](./TESTING-PROCEDURES.md) - Detailed hydrotest and pneumatic testing procedures
