# Test Package Workflow Stages and Handoffs

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Audience**: Project managers, QC coordinators, commissioning engineers

---

## Purpose

This document defines the workflow stages for test packages in chemical plant and refinery construction, from initial planning through final turnover to commissioning. It details stage requirements, responsibilities, deliverables, and handoff procedures for each phase.

---

## Workflow Overview

### Three-Phase Construction Workflow

```
┌─────────────────────┐
│                     │
│  MECHANICAL         │  Physical installation complete
│  COMPLETION (MC)    │  All welds inspected
│                     │  Punch lists resolved
└──────────┬──────────┘
           │
           │ MC Certificate
           │
           ▼
┌─────────────────────┐
│                     │
│  PRE-COMMISSIONING  │  Testing with test fluids (water, air)
│                     │  Hydrotest, pneumatic, flushing
│                     │  Test packages executed
└──────────┬──────────┘
           │
           │ Turnover Package
           │
           ▼
┌─────────────────────┐
│                     │
│  COMMISSIONING      │  Testing with process fluids
│                     │  System integration testing
│                     │  Performance verification
└─────────────────────┘
           │
           │ Handover to Operations
           │
           ▼
      OPERATIONS
```

**PipeTrak Scope**: Primarily supports **Mechanical Completion** and **Pre-Commissioning** phases. Commissioning typically uses separate systems (DCS, PI System, etc.).

---

## Stage Definitions

### Stage 0: Planning

**Status**: `planning`

**Purpose**: Define test package scope, boundaries, and requirements before construction begins or during early construction.

**Activities**:
- Identify test package groupings (area, pressure class, service type)
- Assign ISOs to test packages
- Identify isolation points (flanges, valves, dead ends)
- Determine test type (hydrotest vs pneumatic)
- Calculate test pressure (1.5× design per ASME B31.3)
- Prepare test procedures
- Coordinate with engineering (verify test boundaries acceptable)

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
- [ ] Test procedures prepared (draft or template)
- [ ] Test package plan approved by project management

**Deliverables**:
- Test package list (ID, description, ISO count, test type)
- Test boundary drawings or descriptions (isolation points)
- Test procedures (hydrostatic or pneumatic per ASME B31.3)

**PipeTrak Support**: ✅ Test package creation, ISO assignment, metadata tracking

---

### Stage 1: Construction

**Status**: `construction`

**Purpose**: Install all piping, components, and welds per approved ISOs. Track construction progress and quality.

**Activities**:
- Fabricate and install pipe spools (per ISOs)
- Weld pipe joints (butt welds, socket welds, fillet welds)
- Inspect welds (visual, NDE per code requirements)
- Install valves, fittings, instruments
- Pressure-test individual spools (shop hydrotest, if required)
- Track component installation progress
- Identify and track punch list items

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
- [ ] All components installed (per ISO)
- [ ] All welds completed (no open joints)
- [ ] All NDE completed (radiography, ultrasonic per code)
- [ ] All NDE reports accepted (no rejectable indications)
- [ ] All punch list items identified (may not be resolved yet)

**Deliverables**:
- Installed piping (per ISOs)
- Weld maps (weld locations, numbers, welders)
- NDE reports (RT, UT, PT, MT results)
- Material test certificates (MTCs for all materials)
- Punch list (open items requiring resolution)

**PipeTrak Support**: ✅ Component tracking, weld logging, welder assignments, NDE status, punch list management

---

### Stage 2: Mechanical Completion (MC)

**Status**: `mechanical_completion`

**Purpose**: Verify all construction and inspection activities are complete and documented. Close all punch list items. Prepare system for pre-commissioning testing.

**Activities**:
- **Internal MC walkdown** (contractor QC team):
  - Verify all components installed
  - Verify all welds complete and inspected
  - Verify all NDE reports accepted
  - Identify remaining punch list items

- **Punch list resolution**:
  - Category A items (must resolve before MC) → Repair and re-inspect
  - Category B items (can defer if approved) → Document and track
  - Category C items (cosmetic, defer to operations) → Document and track

- **Documentation review**:
  - Weld maps complete (all welds documented)
  - NDE reports complete (all required NDE performed)
  - MTCs collected (material traceability verified)
  - Calibration certificates (instruments, test gauges)

- **MC Certificate preparation**:
  - MC Status Index (list of all systems/subsystems in package)
  - Punch List Register (all open items documented)
  - MC Certificate (cover sheet, signed by contractor QC manager)

**Responsibilities**:
- **Contractor QC Manager**: Lead MC walkdown, approve MC Certificate
- **QC Inspectors**: Verify completeness, document punch list
- **Craft Labor**: Resolve punch list items
- **Client (optional)**: Witness MC walkdown, accept punch list plan

**Entry Criteria**:
- [ ] All construction complete (per Stage 1 exit criteria)
- [ ] All NDE reports accepted
- [ ] All punch list items identified

**Exit Criteria**:
- [ ] All Category A punch list items resolved
- [ ] Category B/C items documented and approved for deferral (if applicable)
- [ ] All documentation complete (weld maps, NDE reports, MTCs)
- [ ] MC Certificate signed (contractor QC manager)
- [ ] Client MC acceptance (if required by contract)

**Deliverables**:
- Mechanical Completion Certificate (MCC)
- MC Status Index (system/subsystem list with completion status)
- Punch List Register (all items categorized, resolved or deferred)
- Weld inspection package (weld maps + NDE reports)
- Material traceability package (MTCs for all components)

**PipeTrak Support**: ✅ Strong support via milestone tracking, weld inspection status, punch list management, document links

---

### Stage 3: Pre-Test Preparation

**Status**: `pre_test_prep`

**Purpose**: Prepare test package for pressure testing (hydrotest or pneumatic). Install test boundaries, test equipment, and verify system ready.

**Activities**:
- **Install test boundaries**:
  - Blind flanges at isolation points
  - Spectacle blinds (if permanent)
  - Verify isolation valves close fully
  - Install pipe caps/plugs at dead ends

- **Install test equipment**:
  - Pressure gauges (calibrated, 2× for redundancy)
  - Test pump connection (for hydrotest) or compressor connection (for pneumatic)
  - Vent valves (high points for air removal)
  - Drain valves (low points for filling/draining)

- **Verify supports**:
  - Permanent supports installed and verified
  - Temporary supports (if needed for water weight in hydrotest)
  - Spring hangers locked (if required during test)

- **Safety review**:
  - Test procedure reviewed and approved
  - Hazards identified (falling water, pressurized system energy)
  - Barricades installed (restrict access during test)
  - PPE requirements defined
  - Emergency procedures communicated

**Responsibilities**:
- **Piping Lead / Test Coordinator**: Install test boundaries and equipment
- **Safety Officer**: Review test procedure, approve safety plan
- **QC Inspector**: Verify test equipment calibration
- **Client / Third-Party (optional)**: Witness pre-test inspection

**Entry Criteria**:
- [ ] MC Certificate issued (system mechanically complete)
- [ ] Test procedure approved (hydrotest or pneumatic)
- [ ] Test equipment available (gauges calibrated, pump/compressor ready)
- [ ] Test boundaries identified (isolation points known)

**Exit Criteria**:
- [ ] Test boundaries installed (blinds, valves, caps)
- [ ] Test equipment installed (gauges, vents, drains)
- [ ] Supports verified adequate (for water weight if hydrotest)
- [ ] Safety review complete (hazards identified, mitigated)
- [ ] Pre-test inspection passed (contractor QC + third-party if required)

**Deliverables**:
- Test equipment installation checklist (gauges, vents, drains verified)
- Calibration certificates (pressure gauges within calibration period)
- Pre-test inspection report (ready for testing)
- Safety plan (hazards, mitigation, emergency procedures)

**PipeTrak Support**: ⚠️ Limited (pre-test checklist could be added as future enhancement)

---

### Stage 4: Testing

**Status**: `testing`

**Purpose**: Execute pressure test per approved procedure. Verify system integrity (no leaks, no structural failures).

**Activities**:

#### For Hydrostatic Testing:
1. **Fill system** with water (from low point)
2. **Vent all high points** (remove all air)
3. **Pressurize to intermediate hold** (½ test pressure or 25 psig)
4. **Preliminary inspection** (check for leaks at lower pressure)
5. **Pressurize to test pressure** (gradually)
6. **Hold at test pressure** (minimum 10 minutes, typically 30-60 min)
7. **Visual inspection** (all welds, flanges, fittings)
8. **Record results** (pressure, time, temperature, leaks if any)
9. **Depressurize and drain**
10. **Document test** (test report, photos, inspector sign-off)

#### For Pneumatic Testing:
1. **Initial leak check** at low pressure (25 psig, soap solution)
2. **Pressurize to ½ test pressure** (graduated pressurization)
3. **Hold at ½ test pressure** (10 minutes)
4. **Increase in 1/10 increments** (per ASME B31.1 procedure)
5. **Hold at test pressure** (minimum 10 minutes, typically 30-60 min)
6. **Reduce to design pressure or 100 psig** (for leak detection)
7. **Leak detection** (soap solution, ultrasonic, or pressure decay)
8. **Record results** (pressure, time, leaks if any)
9. **Depressurize slowly** (avoid rapid decompression hazards)
10. **Document test** (test report, photos, inspector sign-off)

**Responsibilities**:
- **Test Coordinator**: Lead test execution, pressurization control
- **QC Inspector**: Perform inspections, record results, sign test report
- **Third-Party Inspector (if required)**: Witness test, co-sign test report
- **Client (if required)**: Witness test, accept results

**Entry Criteria**:
- [ ] Pre-test preparation complete (Stage 3 exit criteria met)
- [ ] Test procedure approved (specific to this test package)
- [ ] Test team briefed (roles, responsibilities, safety)
- [ ] Test area barricaded (personnel cleared during pressurization)

**Exit Criteria** (for PASS):
- [ ] Test pressure achieved and maintained (minimum 10 minutes)
- [ ] No visible leakage (hydrotest) or detected leakage (pneumatic)
- [ ] No structural deformation observed
- [ ] Test report completed and signed (contractor QC inspector)
- [ ] Third-party witness sign-off (if required)
- [ ] Client acceptance (if required)

**Exit Criteria** (for FAIL):
- [ ] Leak location(s) identified and documented
- [ ] Test report completed (failure mode documented)
- [ ] Repair plan prepared (weld repair, flange re-torque, component replacement)
- [ ] System depressurized and drained
- [ ] Package returned to Construction or MC stage for repairs

**Deliverables**:
- Test report (pressure, time, temperature, results, photos)
- Inspector sign-off (contractor QC inspector certification)
- Third-party sign-off (if required by contract)
- Client acceptance (if required by contract)
- Test photos (gauge readings, leaks if any, general setup)

**PipeTrak Support**: ⚠️ Future enhancement opportunity (digital test execution, photo uploads, signature capture)

---

### Stage 5: Post-Test / Re-Test (If Initial Test Failed)

**Status**: `repair_retest`

**Purpose**: Repair defects found during testing. Re-inspect repairs. Re-test system.

**Activities**:
- **Identify root cause** of failure:
  - Weld defect (porosity, lack of fusion, crack)
  - Flange leak (gasket damage, insufficient torque, flange warp)
  - Component defect (valve leak, fitting crack)
  - System design issue (inadequate support, thermal expansion)

- **Prepare repair plan**:
  - Weld repair (grind out defect, re-weld per approved WPS)
  - Flange repair (replace gasket, re-torque per sequence, check flange faces)
  - Component replacement (replace defective valve, fitting)

- **Execute repairs**:
  - Perform repair per approved procedure
  - Document repair (weld repair log, replaced components)

- **Re-inspect repairs**:
  - Visual inspection (100%)
  - NDE (if weld repair, same method as original inspection)
  - Accept or reject repair (same criteria as original inspection)

- **Re-test**:
  - Full test procedure (same as Stage 4)
  - No abbreviated re-test (entire system must pass)

**Responsibilities**:
- **QC Inspector**: Identify defect, approve repair plan
- **Craft Labor / Welders**: Execute repairs
- **NDE Technicians**: Re-inspect repairs (RT, UT, etc.)
- **Test Coordinator**: Execute re-test

**Entry Criteria**:
- [ ] Initial test failed (leaks detected)
- [ ] Leak locations identified and documented
- [ ] Root cause determined
- [ ] Repair plan approved (QC manager, client if required)

**Exit Criteria**:
- [ ] Repairs completed per approved plan
- [ ] Repairs inspected and accepted (visual + NDE if weld repair)
- [ ] Re-test passed (no leaks, pressure maintained)
- [ ] Test report updated (repair details, re-test results)

**Deliverables**:
- Repair log (defect description, repair method, inspector sign-off)
- Re-inspection reports (NDE if weld repair)
- Re-test report (same format as initial test report)

**PipeTrak Support**: ⚠️ Future enhancement (link test failures to repairs, track re-test cycles)

---

### Stage 6: Accepted / Turnover Ready

**Status**: `accepted`

**Purpose**: Test package passed all testing, accepted by client (if required), ready for turnover to commissioning.

**Activities**:
- **Final documentation review**:
  - Test reports (all tests passed)
  - Inspector sign-offs (contractor QC + third-party + client)
  - Weld inspection package (complete, all accepted)
  - Punch list (all Category A resolved, B/C deferred with approval)

- **Compile turnover package**:
  - As-built ISOs (if changes made during construction)
  - Test package documentation (test reports, MC certificate)
  - Weld maps and NDE reports
  - Material traceability (MTCs)
  - Calibration certificates (instruments in system)
  - Punch list (deferred items documented)

- **Client acceptance** (if required):
  - Client review of turnover package
  - Client acceptance sign-off
  - Transfer of custody (contractor → client)

**Responsibilities**:
- **Document Control / Turnover Coordinator**: Compile turnover package
- **QC Manager**: Review and certify completeness
- **Client**: Review, accept, sign

**Entry Criteria**:
- [ ] Testing complete and passed (Stage 4 exit criteria met)
- [ ] All documentation complete (test reports, MC certificate, weld package)
- [ ] All punch list items resolved or approved for deferral

**Exit Criteria**:
- [ ] Turnover package compiled (all required documents)
- [ ] Turnover package reviewed and accepted (internal QA)
- [ ] Client acceptance received (if required by contract)
- [ ] System ready for commissioning

**Deliverables**:
- **Turnover Package** (comprehensive documentation set):
  - As-built drawings (ISOs, layouts)
  - Test reports (hydrotest or pneumatic)
  - Mechanical Completion Certificate
  - Weld inspection package (maps + NDE reports)
  - Material traceability package (MTCs)
  - Instrument calibration certificates
  - Punch list register (deferred items)
  - Equipment data sheets (valves, instruments)
  - Spare parts lists
  - Operating procedures (if prepared)

- **Client Acceptance Certificate** (if required)

**PipeTrak Support**: ⚠️ Future enhancement (auto-generate turnover package, digital handoff)

---

### Stage 7: Commissioned (Optional - Outside PipeTrak Scope)

**Status**: `commissioned`

**Purpose**: Introduce process fluids, verify system operates as designed, integrate with overall plant systems.

**Activities**:
- Pre-Commissioning Safety Review (PSSR)
- Cold commissioning (process fluids, no heat/chemicals)
- Hot commissioning (operating temperature/pressure)
- Performance testing (verify design parameters)
- Integration with DCS (Distributed Control System)
- Operator training
- Handover to operations

**Responsibilities**:
- **Commissioning Team**: Lead commissioning activities
- **Operations Team**: Participate in commissioning, prepare for handover
- **Engineering Team**: Support troubleshooting, design verification

**PipeTrak Scope**: ❌ Not primary focus (commissioning uses specialized systems: DCS, PI System, CMMS)

**Note**: Some projects track basic commissioning status in construction database (PipeTrak), but detailed commissioning activities managed elsewhere.

---

## Stage Transitions

### Transition Rules

**Forward Transition** (to next stage):
- Only when current stage exit criteria met
- Requires QC approval (minimum)
- May require client approval (per contract)

**Backward Transition** (to previous stage):
- When testing fails → Return to Construction or MC for repairs
- When punch list items found during later stage → Return to MC
- When documentation incomplete → Return to appropriate stage

**Skip Stages** (not allowed):
- Cannot skip MC (required for safety and quality)
- Cannot skip testing (required by code)
- Sequential progression enforced

### Approval Matrix

| Stage Transition | Contractor QC | Third-Party | Client | Notes |
|------------------|---------------|-------------|--------|-------|
| Planning → Construction | Approve | - | Review (optional) | Internal contractor decision |
| Construction → MC | Approve | - | - | QC verifies construction complete |
| MC → Pre-Test Prep | Approve | - | Accept (optional) | MC Certificate issued |
| Pre-Test Prep → Testing | Approve | Witness (optional) | Witness (optional) | Safety review required |
| Testing → Accepted | Approve | Witness & Sign | Accept & Sign | Test report signed |
| Accepted → Commissioned | - | - | Accept | Turnover package accepted |

**Note**: Approval requirements vary by contract. Table shows typical requirements.

---

## Handoff Procedures

### Handoff 1: Construction → Mechanical Completion

**Trigger**: All construction and NDE complete.

**Handoff Meeting**:
- **Attendees**: Construction lead, QC manager, MC coordinator
- **Agenda**:
  - Review construction status (all ISOs installed)
  - Review NDE status (all reports accepted)
  - Review punch list (items identified, categorized)
  - Assign MC walkdown date
  - Assign punch list resolution responsibilities

**Documents Transferred**:
- Weld maps (final)
- NDE reports (all)
- Punch list (preliminary)
- Material traceability (MTCs collected)

**PipeTrak Workflow**: Update package status to `mechanical_completion`, assign MC coordinator.

---

### Handoff 2: Mechanical Completion → Pre-Commissioning

**Trigger**: MC Certificate issued, all Category A punch list items resolved.

**Handoff Meeting**:
- **Attendees**: QC manager, test coordinator, pre-commissioning lead, client (optional)
- **Agenda**:
  - Review MC Certificate (signed, accepted)
  - Review test package plan (test type, boundaries, pressure)
  - Review test schedule (dates, resources)
  - Confirm test equipment availability (gauges, pump, compressor)
  - Assign test execution responsibilities

**Documents Transferred**:
- Mechanical Completion Certificate
- MC Status Index
- Punch List Register (resolved items, deferred items)
- Weld inspection package
- Material traceability package

**PipeTrak Workflow**: Update package status to `pre_test_prep`, assign test coordinator.

---

### Handoff 3: Pre-Commissioning → Commissioning

**Trigger**: All test packages passed and accepted, turnover packages compiled.

**Handoff Meeting**:
- **Attendees**: Pre-commissioning lead, commissioning lead, QC manager, operations manager, client
- **Agenda**:
  - Review test package status (all passed, accepted)
  - Review turnover packages (complete, accepted by client)
  - Review deferred punch list items (Category B/C, plan for resolution)
  - Review commissioning schedule (PSSR, cold comm, hot comm)
  - Transfer custody (contractor → client/operations)

**Documents Transferred**:
- **Turnover Packages** (per system/subsystem):
  - As-built drawings
  - Test reports
  - MC Certificates
  - Weld inspection packages
  - Material traceability
  - Calibration certificates
  - Punch list (deferred items)
  - Equipment data sheets
  - Operating procedures

- **Client Acceptance Certificate** (signed)

**PipeTrak Workflow**: Update package status to `commissioned` (or archive if commissioning tracked elsewhere).

---

## Metrics and KPIs

### Test Package Progress Metrics

**Package Count by Stage**:
- Planning: X packages
- Construction: X packages
- MC: X packages
- Pre-Test Prep: X packages
- Testing: X packages
- Accepted: X packages
- Total: X packages (100%)

**Visual**: Stacked bar chart or pie chart showing distribution across stages.

### First-Time Pass Rate

**Formula**:
```
First-Time Pass Rate = (Packages passed on first test) / (Total packages tested) × 100%
```

**Target**: ≥85% (industry benchmark)

**Tracking**: Count packages in `accepted` status without ever being in `repair_retest` status.

**Use**: Quality metric (high pass rate = good construction quality, low pass rate = quality issues).

### Average Cycle Time by Stage

**Formula**:
```
Average Cycle Time = Σ(Stage Exit Date - Stage Entry Date) / Package Count
```

**Track per Stage**:
- Construction cycle time (days in construction)
- MC cycle time (days in MC)
- Pre-Test cycle time (days in pre-test prep)
- Testing cycle time (days in testing, including re-tests)

**Use**: Identify bottlenecks (which stage takes longest, why).

### Punch List Metrics

**Open Punch List Items**:
- Category A (must resolve before MC): X items
- Category B (can defer with approval): X items
- Category C (cosmetic, defer to operations): X items

**Punch List Age**:
- Average days open (from identification to resolution)
- Items open >30 days (aging report)

**Use**: Ensure punch list items resolved timely (prevent backlog).

### Test Failure Root Causes

**Track by Failure Mode**:
- Weld defect: X failures
- Flange leak: X failures
- Valve leak: X failures
- Component defect: X failures
- Other: X failures

**Use**: Identify systemic quality issues (e.g., repeated weld defects → welder training, WPS issues).

---

## Future Enhancement Opportunities

### Stage-Based Permissions and Workflows

**Concept**: Role-based access control per stage.

**Implementation**:
- Define roles (Construction Lead, QC Inspector, Test Coordinator, Client, etc.)
- Define permissions per role per stage:
  - Construction Lead: Edit package in `construction` stage
  - QC Inspector: Approve MC in `mechanical_completion` stage
  - Test Coordinator: Record results in `testing` stage
  - Client: Accept package in `accepted` stage
- Enforce stage transitions (only authorized roles can advance stage)

**Benefits**: Workflow control, audit trail, prevent unauthorized changes.

### Automated Stage Transition Checklists

**Concept**: Digital checklist for each stage transition.

**Implementation**:
- Define checklist items per stage (e.g., MC → Pre-Test: all welds inspected, punch list resolved, MC cert signed)
- User checks off items as complete
- System validates all items checked before allowing stage transition
- Checklist stored as audit record

**Benefits**: Ensure completeness, reduce errors, compliance evidence.

### Dashboard with Stage Visualization

**Concept**: Visual dashboard showing test package status across stages.

**Implementation**:
- Kanban-style board (columns = stages, cards = test packages)
- Drag-and-drop to move packages between stages
- Color-coded cards (red = late, yellow = at risk, green = on track)
- Metrics widgets (pass rate, cycle time, punch list count)

**Benefits**: Real-time visibility, intuitive interface, project tracking.

### Integration with Commissioning Systems

**Concept**: Handoff data to commissioning system (CMMS, DCS, PI System).

**Implementation**:
- Export turnover package data (test reports, weld maps, MTCs)
- API integration with commissioning system
- Auto-populate commissioning checklists (based on turnover data)
- Bi-directional sync (commissioning status visible in PipeTrak)

**Benefits**: Eliminate duplicate data entry, seamless handoff, end-to-end visibility.

---

## Related Documentation

- [TEST-PACKAGE-WORKFLOW-CONTEXT.md](./TEST-PACKAGE-WORKFLOW-CONTEXT.md) - Industry standards and workflow overview
- [TEST-PACKAGE-CREATION.md](./TEST-PACKAGE-CREATION.md) - ISO-based test package creation guide
- [TESTING-PROCEDURES.md](./TESTING-PROCEDURES.md) - Hydrotest and pneumatic testing procedures
- [TEST-PACKAGE-DATA-MODEL.md](./TEST-PACKAGE-DATA-MODEL.md) - Data model and schema enhancements
