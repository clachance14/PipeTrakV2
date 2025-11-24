# Test Package Creation Without P&IDs

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Audience**: Field engineers, project coordinators, QC inspectors

---

## Purpose

This guide explains how to create and define test packages for chemical plant and refinery construction when contractors **do not have access to P&IDs**. It provides practical methods for grouping ISOs, defining test boundaries, and organizing test packages using available construction documents.

---

## Overview

### Industry Standard vs PipeTrak Approach

| Aspect | Industry Standard (P&ID-Based) | PipeTrak Approach (ISO-Based) |
|--------|-------------------------------|-------------------------------|
| **Primary Document** | P&ID (Piping & Instrumentation Diagram) | ISO (Isometric Drawing) |
| **Boundary Definition** | Draw on P&ID, mark isolation valves | Group ISOs by area/system/pressure |
| **System Context** | Full process flow visible | Limited to construction scope |
| **Isolation Points** | Clearly shown on P&ID | Identified from ISO review or line list |
| **Component List** | Generated from P&ID takeoff | Generated from grouped ISOs |
| **Data Source** | P&ID, equipment list, line list | ISO, line list, component data |

---

## Available Documents

### What Contractors Typically Have

#### 1. **Isometric Drawings (ISOs)**

**Content**:
- 3D representation of pipe spool in 2D format
- All components: pipes, fittings, valves, flanges, welds
- Weld locations and numbers
- Dimensions and elevations
- Line number and specifications
- Material specifications

**PipeTrak Advantage**: Weld-mapped ISOs with every weld location tracked.

**ISO Header Information**:
- Line number (e.g., `2"-CW-101-A4`)
- Pressure class (e.g., `150#`, `300#`)
- Service code (e.g., `CW` = Cooling Water, `ST` = Steam)
- Material specification (e.g., `A106 GrB`)
- Insulation requirements
- Heat treatment requirements

#### 2. **Line Lists**

**Content**:
- Tabular list of all pipe lines in project
- Line number, size, service, pressure class
- Design pressure and temperature
- Material specification
- Fluid service (liquid, gas, steam)
- Insulation and heat treatment codes

**Purpose for Test Packages**:
- Determine test type (hydrotest vs pneumatic)
- Calculate test pressure (1.5× design pressure)
- Group lines by similar characteristics
- Identify special requirements

**Example Line List**:
```
Line Number | Size | Service | Design P | Design T | Fluid | Pressure Class | Material
------------|------|---------|----------|----------|-------|----------------|----------
2-CW-101-A4 | 2"   | CW      | 150 psi  | 120°F    | Water | 150#           | A106 GrB
6-ST-202-B1 | 6"   | Steam   | 600 psi  | 750°F    | Steam | 600#           | A335 P11
4-IA-305-C2 | 4"   | IA      | 125 psi  | 100°F    | Air   | 150#           | A53 GrB
```

#### 3. **Component Lists** (Generated)

**Content**:
- Every component in test package
- Derived from ISOs within package
- Pipes, fittings, valves, flanges, gaskets, bolts
- Material test certificate (MTC) traceability
- Heat treatment requirements

**PipeTrak Capability**: Auto-generate component list from ISOs in test package.

#### 4. **Weld Maps**

**Content**:
- Weld location on ISO
- Weld number (unique identifier)
- Weld type (butt weld, socket weld, fillet)
- Welder ID/stamp
- NDE requirements (RT, UT, PT, MT, VT)
- Inspection status (accepted, repair, re-inspect)

**PipeTrak Strength**: Comprehensive weld tracking with welder assignments, inspection results, milestone status.

---

## Test Package Definition

### What is a Test Package?

**Definition**: A group of pipe lines (represented by ISOs) that will be **tested together** as a single unit.

**Purpose**:
- Organize testing into manageable units
- Ensure complete pressure coverage (every line tested)
- Track testing progress and completion
- Generate documentation for client acceptance
- Facilitate handoff to commissioning

**Test Package Contents**:
- Collection of ISOs (weld-mapped)
- Component list (all components in those ISOs)
- Test procedure (hydrotest or pneumatic)
- Test pressure calculation
- Test boundary description (isolation points)
- Weld inspection records (from PipeTrak)
- Material test certificates (MTCs)
- Test results and acceptance documentation

---

## Grouping Logic (Without P&IDs)

### Primary Grouping Methods

Since P&IDs are not available to show system boundaries, test packages must be defined using **physical and logical groupings** based on construction documents.

#### Method 1: Physical Area Grouping

**Concept**: Group all lines within a defined physical area of the plant.

**Advantages**:
- Simple to understand and implement
- Aligns with construction areas/zones
- Easy to coordinate field work
- Clear physical boundaries

**Disadvantages**:
- May mix different pressure classes
- May mix different services (requires compatible test media)
- Boundaries may not align with isolation points

**Example**:
- Test Package 001: Unit 100, Area A (all lines)
- Test Package 002: Unit 100, Area B (all lines)
- Test Package 003: Tank Farm, North Section

**When to Use**: Brownfield construction with well-defined areas, single-discipline scope.

#### Method 2: Pressure Class Grouping

**Concept**: Group lines with similar design pressure.

**Advantages**:
- Consistent test pressure calculation
- Reduced risk of over-pressurizing low-pressure components
- Efficient test execution (single setup)

**Disadvantages**:
- May span multiple physical areas
- Requires coordination across areas

**Example**:
- Test Package 001: All 150# lines in Unit 100
- Test Package 002: All 300# lines in Unit 100
- Test Package 003: All 600# lines in Unit 100

**When to Use**: Projects with wide range of pressure classes, focus on safety/over-pressure protection.

#### Method 3: Service Type Grouping

**Concept**: Group lines with similar service (steam, cooling water, process, etc.).

**Advantages**:
- Consistent test medium (water for liquid service, air for gas service)
- Aligns with operational systems
- Facilitates commissioning handoff

**Disadvantages**:
- Requires line list or ISO data to determine service
- May span multiple areas

**Example**:
- Test Package 001: Cooling Water (CW) - All CW lines
- Test Package 002: Steam (ST) - All steam lines
- Test Package 003: Instrument Air (IA) - All IA lines

**When to Use**: Projects organized by system, clear service codes in line numbers.

#### Method 4: Construction Sequence Grouping

**Concept**: Group lines based on installation schedule and readiness.

**Advantages**:
- Aligns with project schedule
- Enables early testing of completed sections
- Reduces waiting time for punch list closure

**Disadvantages**:
- May create unusual test boundaries
- Requires frequent replanning as schedule changes

**Example**:
- Test Package 001: Week 10 completions
- Test Package 002: Week 12 completions
- Test Package 003: Week 14 completions

**When to Use**: Fast-track projects, phased construction, early turnover requirements.

#### Method 5: Hybrid Grouping

**Concept**: Combine multiple grouping methods for optimal organization.

**Advantages**:
- Flexible, adapts to project constraints
- Balances physical, technical, and schedule considerations

**Disadvantages**:
- More complex to define and communicate
- Requires clear documentation

**Example**:
- Test Package 001: Unit 100 Area A, 150# Cooling Water
- Test Package 002: Unit 100 Area A, 300# Process Lines
- Test Package 003: Unit 100 Area B, 150# Instrument Air

**When to Use**: Most projects (recommended approach).

---

## Test Boundary Identification

### Challenge: No P&IDs

**Industry Standard**: Draw test boundary on P&ID, mark isolation valves, blinds, and test vents.

**Without P&IDs**: Must identify boundaries using ISO review, line list analysis, and field coordination.

### Isolation Point Identification

**Isolation points** are locations where the test package is physically separated from adjacent piping to prevent over-pressure or mixing.

#### Sources for Isolation Points

1. **ISO Review**
   - Identify flanges (potential blind locations)
   - Identify valves (can be closed for isolation)
   - Identify pipe caps/plugs (dead ends)
   - Note threaded connections (potential test boundaries)

2. **Line List Analysis**
   - Lines terminating at equipment (natural boundary)
   - Lines with different pressure classes (must isolate)
   - Lines with different services (should isolate)

3. **Engineering Coordination**
   - Request test boundary information from engineering
   - Coordinate with client on acceptable isolation points
   - Verify isolation points won't damage equipment

4. **Field Walkdown**
   - Physical verification of proposed isolation points
   - Confirm valves close fully (can provide isolation)
   - Identify temporary blind locations
   - Check accessibility for test vents and drains

### Isolation Methods

| Method | Description | When to Use | Considerations |
|--------|-------------|-------------|----------------|
| **Blind Flange** | Solid plate between flanges | High-pressure, critical isolation | Requires gaskets, bolts; must be removed after test |
| **Spectacle Blind** | Figure-8 plate, rotate to open/close | Permanent isolation point | Pre-installed during construction |
| **Valve Closure** | Close existing valve | Low-pressure, temporary isolation | Must verify valve can hold test pressure |
| **Cap/Plug** | Threaded or welded cap | Dead-end isolation | Temporary caps must be rated for test pressure |
| **Equipment Isolation** | Isolate at equipment nozzle | Equipment not ready for testing | Coordinate with equipment vendor |

### Test Boundary Documentation

**Required Information**:
- ISO numbers included in test package
- Isolation point locations (ISO + weld number or tag)
- Isolation method (blind, valve, cap)
- Vent locations (high points for air removal)
- Drain locations (low points for filling/draining)
- Test gauge locations (pressure monitoring)

**Future Enhancement**: Visual test boundary diagram (highlighted ISOs with isolation points marked).

---

## Test Package Numbering/Identification

### ID Format Options

#### Option 1: Sequential Numbering
- Format: `TP-001`, `TP-002`, `TP-003`
- Simple, easy to assign
- No meaning encoded in number
- Works for any project

#### Option 2: Area-Based Numbering
- Format: `TP-100A-001`, `TP-100B-001`
- Encodes area/unit in ID
- Easy to filter by area
- Requires area codes

#### Option 3: System-Based Numbering
- Format: `TP-CW-001`, `TP-ST-001`
- Encodes service type in ID
- Aligns with commissioning systems
- Requires service codes

#### Option 4: Hybrid Numbering
- Format: `TP-100A-CW-001`
- Encodes area + service
- Most information-rich
- Longer IDs, more complex

**Recommendation**: Start simple (`TP-001`) unless project has strong area or system organization.

### Metadata to Track

**Per Test Package**:
- Test package ID
- Description/name (e.g., "Unit 100 Area A Cooling Water")
- Status (planning, ready, testing, passed, failed, accepted)
- Responsible party (contractor, third-party, client)
- Planned test date
- Actual test date
- Test type (hydrotest, pneumatic)
- Test pressure (calculated)
- ISO count (number of ISOs in package)
- Component count (number of components)
- Weld count (number of welds)
- Area/unit (for filtering)
- Service type (for filtering)
- Pressure class (for filtering)

---

## Step-by-Step: Creating a Test Package

### Step 1: Gather Available Documents

**Checklist**:
- [ ] All ISOs for area/system/phase
- [ ] Line list with pressure and service data
- [ ] Weld maps (from PipeTrak)
- [ ] Component tracking data (from PipeTrak)
- [ ] Construction schedule (if sequence-based)
- [ ] Engineering test package recommendations (if available)

### Step 2: Determine Grouping Strategy

**Decision Questions**:
- Is project organized by area or system? → Use area or service grouping
- Are there multiple pressure classes? → Consider pressure class grouping
- Is schedule critical? → Consider construction sequence grouping
- What isolation points are available? → May drive grouping decision

**Document Decision**: Record grouping strategy in project documentation for consistency.

### Step 3: Group ISOs

**Process**:
1. List all ISOs in scope
2. Apply grouping criteria (area, pressure, service, etc.)
3. Review for logical groupings (not too large, not too small)
4. Verify test boundaries can be isolated
5. Check for compatibility (test medium, pressure)

**Size Guidelines**:
- **Too small**: <5 ISOs → Inefficient, excessive test setups
- **Optimal**: 10-30 ISOs → Manageable, efficient testing
- **Too large**: >50 ISOs → Difficult to inspect, long test duration, high risk

### Step 4: Identify Isolation Points

**Process**:
1. Review ISOs for flanges, valves, dead ends
2. Check line list for pressure class changes (require isolation)
3. Coordinate with engineering for system boundaries
4. Field walkdown to verify isolation points accessible
5. Document isolation method (blind, valve, cap)

**Isolation Point Record**:
```
Test Package: TP-001
Isolation Point 1: ISO-2-CW-101-A4, Weld W-042, Flange, Blind Required
Isolation Point 2: ISO-2-CW-102-A4, Weld W-089, Valve XV-1234, Close
Isolation Point 3: ISO-2-CW-103-A4, End of Line, Cap Existing
```

### Step 5: Generate Component List

**PipeTrak Process**:
1. Select test package in PipeTrak
2. View ISOs assigned to package
3. Auto-generate component list from ISOs
4. Review for completeness (all components listed)
5. Verify MTC traceability (all materials certified)

**Component List Contents**:
- Component tag/number
- Component type (pipe, elbow, tee, valve, flange, etc.)
- Size and rating
- Material specification
- Heat number (from MTC)
- Quantity
- ISO reference

### Step 6: Receive Test Parameters from Engineering

**IMPORTANT**: Contractors receive test parameters from engineering via line list and testing schedule. **Contractors do NOT calculate or determine test pressure.**

**Provided by Engineering**:
- **Test Pressure**: Pre-calculated by engineering per ASME B31.3 (1.5× design pressure with temperature correction if applicable)
- **Test Media**: Water, air, nitrogen, or other specified medium
- **Test Class** (Test Type): Hydrostatic, Pneumatic, Sensitive Leak, etc.
- **Testing Schedule**: When each test package should be ready for testing

**Data Source**: Line list and/or testing schedule provided by client/engineering team.

**Example Line List Entry**:
```
Line Number: 2-CW-101-A4
Service: Cooling Water
Design Pressure: 150 psi
Test Class: Hydrostatic
Test Pressure: 225 psi
Test Media: Water
Test Package: PKG-001
Target Date: 2025-12-15
```

**Contractor Responsibility**:
- Verify test parameters are provided for all lines in package
- Request missing data from engineering if test parameters not specified
- Execute test per provided parameters (do NOT modify test pressure)
- Record actual test pressure achieved (may differ slightly from specified due to gauge calibration, temperature)

**For Reference Only**: Engineering calculates test pressure using ASME B31.3 formulas:
- **Hydrostatic**: P_test = 1.5 × P_design (with temperature correction if applicable)
- **Pneumatic**: P_test = 1.2 to 1.5 × P_design

**Note**: These formulas are for understanding only. Actual test pressure values come from engineering documentation.

### Step 7: Verify Completeness

**Pre-Test Checklist**:
- [ ] All ISOs in package identified
- [ ] Isolation points identified and documented
- [ ] Component list generated
- [ ] All welds inspected and accepted (from PipeTrak)
- [ ] All punch list items resolved (Category A minimum)
- [ ] Test parameters received from engineering (test class, test pressure, test media)
- [ ] Test procedure prepared (per engineering specifications)
- [ ] Test gauges calibrated (certificates available)
- [ ] Safety review complete (especially for pneumatic)

### Step 8: Create Test Package Record

**PipeTrak Workflow**:
1. Create new test package in PipeTrak
2. Assign unique test package ID
3. Add description/name
4. Assign ISOs to package
5. Enter test parameters from line list/testing schedule:
   - Test Class (hydrotest, pneumatic, etc.)
   - Test Pressure (as specified by engineering)
   - Test Media (water, air, nitrogen, etc.)
6. Document isolation points
7. Assign responsible parties
8. Enter target test date (from testing schedule)
9. Link to related documents (line list, test procedure, testing schedule)

---

## Common Challenges and Solutions

### Challenge 1: Incomplete Line List Data

**Problem**: Line list missing test parameters (test pressure, test class, test media).

**Solutions**:
- **Request from engineering team** (primary solution - test parameters are engineering's responsibility)
- Check testing schedule (may have test parameters even if line list doesn't)
- Review previous submittals or RFIs (test parameters may have been provided earlier)
- Extract service type from ISO headers if needed for context (pressure class, service code)
- **Do NOT guess or calculate test pressure** - always get from engineering

### Challenge 2: Unclear Test Boundaries

**Problem**: Cannot determine where to isolate without P&ID.

**Solutions**:
- Request test boundary drawings from engineering
- Coordinate with client on acceptable boundaries
- Field walkdown with experienced piping engineer
- Use natural boundaries (equipment nozzles, flanges)
- Smaller test packages reduce boundary complexity

### Challenge 3: Mixed Pressure Classes

**Problem**: Test package contains lines with different design pressures.

**Solutions**:
- **Option 1**: Test at highest pressure (verify all components rated)
- **Option 2**: Split into separate test packages by pressure class
- **Option 3**: Use multiple test pressures (test highest first, then reduce)
- **Best Practice**: Avoid mixing pressure classes when possible

### Challenge 4: Mixed Services (Liquid vs Gas)

**Problem**: Test package contains both liquid and gas service lines.

**Solutions**:
- **Preferred**: Separate packages by service (liquid vs gas)
- **Alternative**: Hydrotest all lines (conservative, works for gas service too)
- **Avoid**: Pneumatic testing liquid service lines (not per code)

### Challenge 5: No Isolation Points Available

**Problem**: Cannot isolate test package without cutting or welding.

**Solutions**:
- Install temporary test flanges (requires welding, NDE, may add cost)
- Install spectacle blinds at key locations (plan during design)
- Test larger section (expand package to next available isolation point)
- Coordinate with equipment vendor (isolate at equipment if not ready)

---

## Best Practices

### DO:

✅ **Start with available isolation points** - Let physical boundaries guide package definition
✅ **Keep packages manageable** - 10-30 ISOs optimal, easier to inspect and manage
✅ **Document grouping strategy** - Ensure consistency across project
✅ **Coordinate with engineering** - Verify test boundaries align with system design
✅ **Field walkdown** - Verify isolation points and accessibility before testing
✅ **Use line list data** - Automate test type and pressure calculation when possible
✅ **Review with QC team** - Ensure inspection completeness before testing
✅ **Plan for re-tests** - Assume some packages will fail initial test, plan schedule accordingly

### DON'T:

❌ **Don't mix pressure classes** - Risk of over-pressure damage to low-pressure components
❌ **Don't create huge packages** - Difficult to inspect, long test duration, high failure risk
❌ **Don't ignore service type** - Liquid lines need hydrotest, some gas lines can be pneumatic
❌ **Don't test without completeness check** - Incomplete punch lists cause test failures
❌ **Don't assume valves isolate** - Verify valve can hold test pressure, use blinds for critical isolation
❌ **Don't skip documentation** - Test package records required for client acceptance
❌ **Don't test without calibrated gauges** - Invalid test results, must re-test

---

## Future Enhancement Opportunities

### Auto-Grouping Based on ISO Metadata

**Concept**: Automatically suggest test package groupings using ISO data.

**Implementation**:
1. Parse ISO headers for line number, pressure class, service code
2. Apply user-selected grouping rules (area, pressure, service)
3. Propose test packages with ISOs pre-assigned
4. User reviews and adjusts as needed
5. Auto-detect pressure class conflicts, mixed services

**Benefits**: Faster test package creation, consistency, reduced errors.

### Line List Import and Integration

**Concept**: Import line list data to auto-populate test package metadata.

**Implementation**:
1. Import line list CSV/Excel (line number, pressure, service, material)
2. Match line numbers to ISOs (if ISOs have line numbers)
3. Auto-populate test type recommendation (based on service and pressure)
4. Auto-calculate test pressure (1.5× design pressure)
5. Flag special conditions (steam, instrument air, internal lining)

**Benefits**: Eliminates manual data entry, accurate test pressure, consistent decision logic.

### Visual Test Boundary Editor

**Concept**: Graphical interface to define test boundaries on ISOs.

**Implementation**:
1. Display ISOs in test package (thumbnail or list view)
2. Mark isolation points on ISOs (click to add marker)
3. Select isolation method (blind, valve, cap) from dropdown
4. Auto-generate isolation point list
5. Export test boundary diagram (highlighted ISOs + isolation markers)

**Benefits**: Visual clarity, easier communication, reduced errors.

### Test Package Templates

**Concept**: Pre-defined templates for common test package types.

**Implementation**:
1. Define templates (e.g., "Cooling Water Area-Based", "Steam Pressure-Based")
2. Templates include grouping rules, test type, pressure calculation method
3. User selects template when creating test package
4. Auto-apply rules to ISOs in scope
5. Templates shareable across projects

**Benefits**: Faster setup, consistency, best practices embedded.

---

## Related Documentation

- [TEST-PACKAGE-WORKFLOW-CONTEXT.md](./TEST-PACKAGE-WORKFLOW-CONTEXT.md) - Industry standards and workflow overview
- [TESTING-PROCEDURES.md](./TESTING-PROCEDURES.md) - Hydrotest and pneumatic testing procedures
- [TEST-PACKAGE-STAGES.md](./TEST-PACKAGE-STAGES.md) - Workflow stages and handoffs
- [TEST-PACKAGE-DATA-MODEL.md](./TEST-PACKAGE-DATA-MODEL.md) - Data model and schema
