# Test Package Workflow Context

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Audience**: Product planning, feature development, future enhancements

---

## Purpose

This document provides context for PipeTrak's test package workflow, adapted for **chemical plant and refinery construction** where contractors typically work from isometric drawings (ISOs) rather than P&IDs. It serves as a foundation for planning future enhancements while acknowledging current workflow constraints.

---

## Industry Context

### Standard Workflow (P&ID-Based)

In traditional industrial construction (especially pipeline and large facility projects), test packages are defined using **Piping & Instrumentation Diagrams (P&IDs)**:

- P&IDs show complete systems with process flow, equipment, instrumentation
- Test boundaries drawn directly on P&IDs
- System-based organization (e.g., "Cooling Water System", "Steam Header A")
- Test packages align with operational systems

**Major contractors using this approach**: Fluor, Bechtel, Kiewit, McDermott (via digital platforms like Fluor's MCPlus and InVision)

### PipeTrak's Context (ISO-Based)

**Chemical plant and refinery construction** often operates under different constraints:

#### Contractor Constraints
- **Limited or no P&ID access** - P&IDs remain with client/engineering firm
- **Work from construction documents**: Isometric drawings (ISOs), line lists, spool drawings
- **Weld-mapped ISOs** - Detailed fabrication/installation drawings with weld locations
- **Component tracking** - Focus on individual components and welds rather than process systems

#### Workflow Adaptation
Instead of P&ID-based system boundaries, test packages are defined by:
- Grouping **ISOs** that share common characteristics (area, pressure class, service type)
- **Component lists** derived from ISOs in the test package
- **Line lists** providing pressure/service specifications
- **Physical/logical boundaries** rather than process system boundaries

#### Advantages
- **Weld maps already available** - Critical tracking advantage over standard workflows
- **Component-level granularity** - Precise tracking of every fitting, valve, weld
- **Construction-centric** - Aligns with how contractors actually work in the field

---

## Applicable Industry Standards

### ASME B31.3 (Process Piping)

**Primary code for chemical plant and refinery piping systems.**

**Key Requirements**:
- All process piping must undergo pressure testing before initial service
- **Hydrostatic test pressure**: 1.5× design pressure (minimum)
- **Pneumatic test pressure**: 1.2-1.5× design pressure (when hydrotest impractical)
- **Hold time**: Minimum 10 minutes at test pressure
- **Acceptance criteria**: Zero visible leakage at any joint, connection, or weld

**Fluid Service Categories**:
- **Category D** (less stringent): Non-toxic, non-flammable, <150 psi, -29°C to 186°C
- **Normal Service** (standard): All services not Category D or M
- **Category M** (more stringent): Hazardous fluid service

**Testing Requirements by Category**:
- Category D: May use initial service leak test (in lieu of hydrotest)
- Normal Service: Hydrotest at 1.5× design pressure + 5% radiographic testing
- Category M: Enhanced requirements per project specifications

### ASME B31.1 (Power Piping)

**Used for steam systems, heating systems in industrial facilities.**

- Similar testing philosophy to B31.3
- Test pressure: 1.5× design pressure (minimum)
- Hoop stress during testing ≤ 90% of yield stress

### API 570 (Piping Inspection Code)

**In-service inspection and maintenance** (post-commissioning).

- Periodic inspection based on risk assessment
- Focus on degradation mechanisms (corrosion, erosion, cracking)
- Not typically part of initial construction workflow
- Relevant for long-term facility operations

### 49 CFR Part 192 (Pipeline Safety)

**Federal regulations for natural gas pipelines.**

- More relevant for cross-country pipeline construction
- Less applicable to chemical plant/refinery piping
- PipeTrak's focus is **process piping** (ASME B31.3), not transmission pipelines

---

## Three-Phase Workflow

Industry standard workflow follows three distinct phases:

### Phase 1: Mechanical Completion (MC)

**Definition**: Physical installation of all components complete, inspected, tested, and documented.

**Activities**:
- All piping, equipment, instrumentation physically installed
- All welds completed and inspected (visual, radiographic, ultrasonic as required)
- Punch list items identified and resolved
- Quality documentation collected (weld maps, NDE reports, MTCs)

**Deliverable**: Mechanical Completion Certificate (MCC) indicating system ready for pre-commissioning

**PipeTrak Current Support**: ✅ Strong support via component tracking, weld logging, milestone updates

### Phase 2: Pre-Commissioning

**Definition**: Testing and verification using **test fluids** (water, air, nitrogen) before introducing process fluids.

**Activities**:
- **Piping flushing** - Remove debris, construction contaminants
- **Chemical cleaning** - Remove mill scale, weld scale, grease (if required)
- **Hydrostatic testing** - Water pressure testing at 1.5× design pressure
- **Pneumatic testing** - Air/nitrogen testing (when hydrotest impractical)
- **Leak detection** - Visual inspection, soap solution, or tracer gas
- **Instrument loop checks** - Verify instrumentation functions correctly
- **Electrical testing** - Grounding, bonding, continuity

**Deliverable**: Pre-Commissioning dossier with test reports, certificates, as-built documentation

**PipeTrak Current Support**: ✅ Package workflow stages implemented

### Phase 3: Commissioning

**Definition**: Introduction of **actual process fluids** to verify system operates as designed.

**Activities**:
- Cold commissioning (fluids introduced without chemicals/heat)
- Hot commissioning (system brought to operating temperature/pressure)
- Integrated system testing (multiple systems working together)
- Performance testing (verify design parameters met)

**Deliverable**: System turnover to operations, as-built packages, O&M documentation

**PipeTrak Current Support**: ⚠️ Not primary focus (ends at pre-commissioning handoff)

---

## Test Package Structure

### Industry Standard (P&ID-Based)

**Test Package ID Format**: `PCWBS-AREA-SYSTEM-###`
- PCWBS = Project Construction Work Breakdown Structure
- AREA = Physical plant area (e.g., Unit 100, Tank Farm)
- SYSTEM = Process system (e.g., CW for Cooling Water)
- ### = Sequential number

**Package Contents** (P&ID-centric):
- Marked-up P&IDs showing test boundaries (highlighted in color)
- List of ISOs within test boundary
- Piping layout drawings
- Test pressure calculations
- Material test certificates (MTCs)
- Weld history and inspection reports
- Instrument calibration certificates

### PipeTrak Adaptation (ISO-Based)

**Test Package ID Format**: Project-specific (often area or system-based)

**Package Contents** (ISO-centric):
- **ISOs** grouped by test package (weld-mapped)
- **Component list** derived from ISOs
- **Line list** with pressure/service specifications
- Test pressure calculations (from line list data)
- Weld inspection reports (already tracked in PipeTrak)
- Material test certificates
- Test procedure and results

**Grouping Logic** (without P&IDs):
- **Physical area** - Group by construction area or unit
- **Pressure class** - Group lines with similar design pressure
- **Service type** - Group similar services (steam, cooling water, process)
- **Construction sequence** - Group by installation schedule
- **Test medium compatibility** - Avoid mixing incompatible test requirements

**Challenge**: Without P&IDs, determining system boundaries and isolation points requires:
- Engineering line lists
- ISO review to identify isolation valves, blinds
- Coordination with client/engineering team
- Field verification of boundaries

---

## Key Differences: Chemical Plant vs Pipeline Construction

| Aspect | Pipeline Construction | Chemical Plant / Refinery |
|--------|----------------------|---------------------------|
| **Primary Document** | P&IDs, Route maps | ISOs, Line lists |
| **Test Package Basis** | Process system boundaries | Physical groupings (area, pressure, service) |
| **Scope** | Long runs, few fittings | Complex piping, many components |
| **Testing Focus** | Strength testing (high pressure) | Leak testing (integrity) |
| **Typical Code** | 49 CFR Part 192 (gas), ASME B31.4/B31.8 (liquid/gas transmission) | ASME B31.3 (process piping) |
| **Test Pressure** | Often >1.5× (strength test) | 1.5× design (leak test) |
| **Contractor Access** | Often has full documentation | Limited to construction documents |
| **Weld Density** | Low (long straight runs) | High (fittings, branches, tie-ins) |
| **Component Tracking** | Less critical (fewer components) | Critical (thousands of components) |

**PipeTrak's Strength**: Designed for **high component density** environments (chemical plants, refineries) where precise component and weld tracking is essential.

---

## Testing Procedures Overview

### Hydrostatic Testing (Default)

**When to Use**:
- Liquid service (always)
- Gas/vapor service with design pressure ≥10 bar (1450 psi)
- Steam service (always recommended)
- Two-phase flow (always recommended)

**Advantages**:
- Safer (water incompressible = less stored energy)
- Easier to detect leaks (visible water)
- Industry preference (default unless impractical)

**Disadvantages**:
- Water weight (structural considerations)
- Freezing risk (cold climates)
- Drying required after test
- Contamination risk (some services)

### Pneumatic Testing (Alternative)

**When to Use**:
- Design pressure <10 bar for gas/vapor service
- Cannot be filled with water (system design)
- Moisture undesirable (instrument air, refrigerant)
- Internal linings that would be damaged by water
- Structural limitations (cannot support water weight)

**Advantages**:
- No drying required
- No freezing risk
- Suitable for moisture-sensitive systems

**Disadvantages**:
- **Much more dangerous** (compressed gas = stored energy)
- Harder to detect leaks (requires soap solution or tracer gas)
- More stringent safety requirements
- Industry recommendation: **Last resort only**

**ASME B31.3 Caution**: "Hazards associated with pneumatic tests must be taken into consideration" - requires graduated pressurization, restricted access, additional safety protocols.

### Test Parameters Provided by Engineering

**IMPORTANT**: Contractors receive test parameters from engineering - they do NOT determine test type or calculate test pressure.

**Provided by Engineering** (via line list and testing schedule):
- **Test Class** (Test Type): Hydrostatic, Pneumatic, Sensitive Leak, etc.
- **Test Pressure**: Pre-calculated value (ASME B31.3: typically 1.5× design pressure)
- **Test Media**: Water, air, nitrogen, or specified medium
- **Testing Schedule**: When tests should be ready/executed

**Engineering Data Sources** (used to determine test parameters):
- **Line list**: Service type, design pressure, design temperature
- **ISO header**: Line number, pressure class, service code
- **Material specifications**: Fluid compatibility, temperature limits
- **ASME B31.3 requirements**: Code-mandated test pressures and methods

**Contractor Responsibility**:
- Receive and document test parameters from line list/testing schedule
- Execute test per provided parameters (do NOT modify test pressure or test type)
- Request missing data from engineering if test parameters not provided

---

## Documentation Requirements

### Pre-Test Documentation

**Required Before Testing**:
- ✅ All ISOs in test package (with weld maps)
- ✅ Component list complete (from ISOs)
- ✅ Line list with test parameters (test pressure, test class, test media)
- ✅ Testing schedule (target dates, provided by engineering)
- ✅ All weld inspections complete (visual, NDE as required)
- ✅ Material test certificates (MTCs) collected
- ✅ Calibration certificates for test gauges
- ✅ Punch list items resolved (Category A minimum)
- ✅ Test procedure approved

**PipeTrak Current Support**: Weld tracking, component tracking, milestone updates provide foundation for documentation checklist.

### Test Execution Documentation

**Recorded During Test**:
- Test date and time
- Test medium (water, air, nitrogen)
- Test pressure (psi or bar)
- Hold time (minutes)
- Ambient temperature (affects pressure)
- Pressure gauge calibration data
- Inspector name and certification
- Visual inspection results
- Leak locations (if any)
- Corrective actions taken

**Future Enhancement**: Digital test report generation with auto-populated data from test package.

### Post-Test Documentation

**Deliverables**:
- ✅ Test report (pass/fail with details)
- ✅ Corrective action log (if repairs made)
- ✅ Re-test reports (if initial test failed)
- ✅ Inspector certification/sign-off
- ✅ Client acceptance/sign-off
- ✅ As-built ISOs (if changes made)
- ✅ Punch list closure (all items resolved)
- ✅ Mechanical Completion Certificate

**Integration**: Test package documentation becomes part of turnover package for commissioning team.

---

## Inspection and Test Plans (ITPs)

### Purpose

**ITP = Master document** describing in detail:
- **What** will be inspected/tested
- **Who** performs the inspection (contractor, third-party, client)
- **When** inspection occurs (before, during, after activity)
- **How** inspection is performed (method, acceptance criteria)
- **What record** is produced as evidence

### Hold/Witness/Review Points

**Codified Responsibility System**:
- **H = Hold Point**: Party must perform check successfully before work can proceed (mandatory stop)
- **W = Witness Point**: Party has right to witness activity but work can proceed if they decline
- **R = Review Point**: Party reviews documentation after activity (post-verification)

**Example** (Hydrostatic Test ITP):
| Activity | Contractor QC | Third-Party | Client | Record |
|----------|---------------|-------------|--------|--------|
| Pre-test punch list verification | H | W | R | Punch list printout |
| Test pressure calculation | H | R | R | Calculation sheet |
| Pressurization to test pressure | H | H | W | Test chart (if recorded) |
| Visual inspection for leaks | H | H | W | Test report |
| Final sign-off | H | H | H | MCC |

### Inspection Test Records (ITRs)

**ITR = Actual record** of inspections/tests performed per ITP.

- Records date, time, inspector, results
- Documents deviations or non-conformities
- Serves as formal evidence of compliance
- Sign-off occurs on ITR (digital or paper)
- Stored in Electronic Document Management System (EDMS)

**Future Enhancement**: Digital ITP/ITR workflow in PipeTrak with role-based sign-off.

---

## Current PipeTrak Implementation

### Strengths

✅ **Component Tracking**: Precise tracking of every pipe, fitting, valve, weld
✅ **Weld Logging**: Weld maps, welder assignments, inspection status
✅ **Package Workflow**: Test package creation, stages, assignments
✅ **Milestone Updates**: Discrete and continuous milestone tracking
✅ **Mobile-First**: Field-friendly UI for on-site updates

### Areas for Future Enhancement

⚠️ **Test Parameter Import**: Import test pressure, test class, test media from line list/testing schedule
⚠️ **Test Procedure Templates**: Pre-defined hydrotest/pneumatic procedures (based on provided test class)
⚠️ **Digital Test Reports**: In-app test execution and results recording
⚠️ **ITP/ITR Workflow**: Digital inspection and test plan management
⚠️ **Document Attachments**: Link MTCs, NDE reports, calibration certs to test packages
⚠️ **Stage-Based Permissions**: Role-based access (contractor QC, third-party, client)
⚠️ **As-Built Documentation**: Auto-generate turnover package documentation

**Note**: Test pressure and test type are PROVIDED by engineering (not calculated by contractor), so import/display functionality is needed rather than calculation logic.

---

## Integration with Commissioning

### Handoff Process

**Pre-Commissioning → Commissioning Transition**:

1. **Pre-Commissioning Safety Review (PSSR)**
   - Thorough safety inspection before commissioning begins
   - Verifies all hazards identified and mitigated
   - Checks all safety systems (relief valves, interlocks, alarms)
   - Reviews operating procedures and emergency procedures
   - Confirms personnel training complete

2. **System Turnover**
   - Transfer of custody from EPC contractor to client/operations
   - Turnover package includes:
     - As-built drawings (ISOs, layouts)
     - Test reports (hydrotest, pneumatic, flushing)
     - Mechanical Completion Certificates
     - Punch list closure documentation
     - Instrument loop check records
     - Equipment manuals and data sheets
     - Spare parts lists
     - Preventative maintenance procedures

3. **Commissioning Team Acceptance**
   - Review of turnover documentation
   - Physical walkdown of system
   - Acceptance sign-off (legal transfer of responsibility)

**PipeTrak Role**: Generates pre-commissioning documentation, tracks completion status, facilitates handoff to commissioning (outside PipeTrak scope).

---

## Lessons from Major Contractors

### Fluor's MCPlus Platform

**Key Features**:
- Centralized tracking of all testing and QA/QC certifications
- Integration with 3D model (InVision)
- Color-coded status visualization (green = installed, blue = 100% tested)
- NDE status tracking by test package or ISO
- Mechanical completion status filtering

**Lessons for PipeTrak**:
- Visual status indicators critical for field teams
- Integration with existing data (weld logs, components) reduces duplicate entry
- Mobile access essential for field verification
- Status filtering/search by test package or ISO enables efficient QC

### Bechtel, Kiewit, McDermott

**Common Themes**:
- Digital test package management (reduce paper)
- Integration with project schedule/milestones
- Third-party inspection coordination (witness points, sign-offs)
- Automated punch list tracking
- Turnover package generation

**Lessons for PipeTrak**:
- Workflow automation reduces manual documentation burden
- Multi-party sign-off requires role-based permissions
- Integration with schedule critical for project tracking
- As-built documentation generation high-value automation

---

## Constraints and Adaptations

### Working Without P&IDs

**Industry Standard Assumption**: P&IDs available to define system boundaries, isolation points, test limits.

**PipeTrak Reality**: Contractors work from ISOs and line lists.

**Adaptations Required**:

1. **Test Boundary Definition**
   - Cannot mark up P&IDs (don't have access)
   - Must define boundaries using ISO groupings
   - Isolation points identified from ISO review or line list
   - Coordination with engineering team for system boundaries

2. **Pressure/Service Data**
   - Cannot read from P&IDs directly
   - Must rely on line list or ISO header data
   - May require manual lookup for each line

3. **System Context**
   - Limited understanding of overall process flow
   - Focus on construction scope (components, welds)
   - Client/engineering team maintains system-level view

**Future Enhancement**: Import line list data to auto-populate service type, pressure class, test type recommendation.

---

## Conclusion

PipeTrak's test package workflow is optimized for **chemical plant and refinery construction** where contractors work from **ISOs and component lists** rather than P&IDs. This constraint requires adaptations to industry-standard workflows while maintaining compliance with ASME B31.3 requirements.

**Current State**: Strong foundation in component tracking, weld logging, and package workflow stages.

**Future Enhancements**: Test procedure automation, digital test reports, ITP/ITR workflows, and as-built documentation generation will further align PipeTrak with industry best practices while respecting contractor workflow constraints.

---

## Related Documentation

- [TEST-PACKAGE-CREATION.md](./TEST-PACKAGE-CREATION.md) - ISO-based test package creation guide
- [TESTING-PROCEDURES.md](./TESTING-PROCEDURES.md) - Hydrotest and pneumatic testing procedures
- [TEST-PACKAGE-STAGES.md](./TEST-PACKAGE-STAGES.md) - Workflow stages and handoffs
- [TEST-PACKAGE-DATA-MODEL.md](./TEST-PACKAGE-DATA-MODEL.md) - Data model enhancement opportunities
- [SCHEMA-COMPLIANCE-WORKFLOW.md](./SCHEMA-COMPLIANCE-WORKFLOW.md) - Database schema compliance
- [RLS-RULES.md](../security/RLS-RULES.md) - Row Level Security patterns
