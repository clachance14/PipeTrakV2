# Testing Procedures: Hydrotest and Pneumatic

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Audience**: QC inspectors, field engineers, test coordinators

---

## Purpose

This guide provides detailed procedures for **hydrostatic** and **pneumatic** pressure testing of piping systems in chemical plant and refinery construction, per ASME B31.3 requirements. It includes test execution steps, safety protocols, and acceptance criteria.

---

## IMPORTANT: Test Parameters Provided by Engineering

**Contractors receive test parameters from engineering - they do NOT calculate or determine these values.**

**Provided by Engineering** (via line list and testing schedule):
- **Test Class** (Test Type): Hydrostatic, Pneumatic, Sensitive Leak, etc.
- **Test Pressure**: Pre-calculated value (not determined by contractor)
- **Test Media**: Water, air, nitrogen, or specified medium
- **Testing Schedule**: When tests should be performed

**Contractor Responsibility**:
- Execute test per provided parameters
- Record actual test pressure achieved
- Document results and acceptance

**Note**: This document includes test pressure calculation formulas and test type selection logic **for reference and understanding only**. These calculations are performed by engineering, not contractors. Actual test values come from line list/testing schedule.

---

## ASME B31.3 Requirements Summary

### Mandatory Testing

**All piping systems** (except Category D fluid services) must undergo pressure testing before being placed in service. This verifies:
- Mechanical integrity (no leaks, no structural failures)
- Proper installation (all joints, connections secure)
- Material quality (no defects causing leakage)

### Test Type Options

1. **Hydrostatic Test** (default, preferred)
2. **Pneumatic Test** (alternate, when hydrotest impractical)
3. **Combined Hydrostatic-Pneumatic Test** (rare, special cases)
4. **Initial Service Leak Test** (Category D fluid service only)

### Code Reference

**ASME B31.3 Chapter VI - Examination, Inspection, and Testing**
- Para 345.4: Leak Testing
- Para 345.4.1: General Requirements
- Para 345.4.2: Hydrostatic Leak Test
- Para 345.4.3: Pneumatic Leak Test
- Para 345.5: Alternative Leak Test

---

## Test Type Selection (Reference Only - Engineering Determines)

**Note**: This section explains how engineering determines test type. Contractors receive the Test Class from line list/testing schedule - they do not make this decision.

### Decision Logic Flowchart (Used by Engineering)

```
START
  │
  ├─→ Check Fluid Service Category
  │   │
  │   ├─→ Category D Fluid Service?
  │   │   └─→ YES → Initial Service Leak Test Permitted (skip hydrotest/pneumatic)
  │   │
  │   └─→ Normal or Category M → Continue
  │
  ├─→ Check Service Type (from line list)
  │   │
  │   ├─→ Liquid Service (water, chemical, oil, etc.)
  │   │   └─→ HYDROTEST REQUIRED
  │   │
  │   ├─→ Steam Service
  │   │   └─→ HYDROTEST REQUIRED (always)
  │   │
  │   ├─→ Two-Phase Flow
  │   │   └─→ HYDROTEST REQUIRED (always)
  │   │
  │   └─→ Gas/Vapor Service → Continue
  │
  ├─→ Check Design Pressure (from line list)
  │   │
  │   ├─→ Design Pressure ≥ 10 bar (145 psi)
  │   │   └─→ HYDROTEST REQUIRED
  │   │
  │   └─→ Design Pressure < 10 bar (145 psi)
  │       └─→ Consider Pneumatic → Continue
  │
  ├─→ Check Special Conditions
  │   │
  │   ├─→ Cannot be filled with water (design limitation)
  │   │   └─→ PNEUMATIC TEST
  │   │
  │   ├─→ Moisture undesirable (instrument air, refrigerant)
  │   │   └─→ PNEUMATIC TEST
  │   │
  │   ├─→ Internal lining (water may damage)
  │   │   └─→ PNEUMATIC TEST
  │   │
  │   ├─→ Cannot support water weight (structural limitation)
  │   │   └─→ PNEUMATIC TEST
  │   │
  │   └─→ None of the above
  │       └─→ HYDROTEST PREFERRED (default)
  │
END
```

### Decision Matrix

| Service Type | Design Pressure | Test Type | Reasoning |
|--------------|----------------|-----------|-----------|
| **Liquid** (water, oil, chemical) | Any | Hydrotest | Code required, safest method |
| **Steam** | Any | Hydrotest | Code required, always recommended |
| **Gas/Vapor** | ≥10 bar (145 psi) | Hydrotest | Code required for higher pressure |
| **Gas/Vapor** | <10 bar (145 psi) | Pneumatic (allowed) | Lower pressure, less energy stored |
| **Instrument Air** | Any | Pneumatic | Moisture undesirable in system |
| **Refrigerant** | Any | Pneumatic | Cannot be filled with water (design) |
| **With Internal Lining** | Any | Pneumatic | Water may damage lining |

### Category D Fluid Service (Exception)

**ASME B31.3 Definition**:
- Non-flammable, non-toxic fluids
- Safe for human consumption (essentially water)
- Design gauge pressure <150 psi (1035 kPa)
- Design temperature: -29°C to 186°C

**Alternative**: Initial service leak test using actual service fluid at operating pressure (in lieu of hydrotest).

**Typical Use**: Potable water, fire protection water (low-pressure services).

**Not Applicable**: Chemical plants and refineries rarely use Category D classification (most services are flammable, toxic, or high-pressure).

---

## Hydrostatic Testing

### Overview

**Definition**: Pressure testing using incompressible liquid (typically water) at 1.5× design pressure.

**Advantages**:
- ✅ **Safer**: Incompressible liquid stores less energy than compressed gas
- ✅ **Easier leak detection**: Water leaks are visible
- ✅ **Industry standard**: Default test method, well-understood procedures
- ✅ **Code compliance**: Meets ASME B31.3 requirements for all services

**Disadvantages**:
- ❌ **Water weight**: May exceed structural support capacity
- ❌ **Freezing risk**: Cold climates require heated water or antifreeze
- ❌ **Drying required**: Must remove water and dry after test
- ❌ **Contamination risk**: Some services cannot tolerate water traces

### Test Pressure Calculation (Reference Only - Performed by Engineering)

**IMPORTANT**: Contractors receive test pressure from engineering in line list/testing schedule. Do NOT calculate test pressure in the field.

**This section is for reference/understanding only.**

#### Standard Calculation (ASME B31.3 Para 345.4.2)

**Formula** (used by engineering):
```
P_test = 1.5 × P_design (minimum)
```

**Where**:
- `P_test` = minimum hydrostatic test pressure
- `P_design` = design pressure (gauge)

**Constraints**:
- Must not exceed maximum allowable test pressure of any non-isolated component
- Must not produce stress exceeding specified minimum yield strength at test temperature

**Example**:
```
Line: 6"-ST-202-B1 (Steam, 600 psi design pressure)
P_test = 1.5 × 600 psi = 900 psi (minimum)
```

#### Temperature Correction (If Test Temperature ≠ Design Temperature)

**Formula (ASME B31.3 Para 345.4.2(a))**:
```
P_test = 1.5 × P_design × (S_T / S)
```

**Where**:
- `S_T` = allowable stress at test temperature (from ASME B31.3 Table A-1)
- `S` = allowable stress at design temperature (from ASME B31.3 Table A-1)

**When to Use**: System's design temperature is significantly higher than test temperature (e.g., high-temp steam tested with ambient water).

**Example**:
```
Line: 6"-ST-202-B1 (Steam)
Design Pressure: 600 psi
Design Temperature: 750°F (399°C)
Test Temperature: 70°F (21°C)
Material: A335 P11

From ASME B31.3 Table A-1:
S @ 750°F = 14,000 psi
S_T @ 70°F = 20,000 psi

P_test = 1.5 × 600 × (20,000 / 14,000)
P_test = 900 × 1.429 = 1,286 psi
```

**Practical Note**: Temperature correction often **increases** test pressure (cold material is stronger).

#### Yield Strength Limitation

**ASME B31.3 Para 345.4.2(b)**:

If calculated test pressure would produce stress **exceeding specified minimum yield strength** at test temperature, reduce test pressure so stress does not exceed yield.

**Calculation**:
```
Hoop Stress = (P × D) / (2 × t)

Where:
P = test pressure
D = outside diameter
t = wall thickness
```

**Limit**: Hoop stress ≤ Specified minimum yield strength at test temperature.

**Practical Note**: Rare in process piping (usually only for thin-wall, high-pressure systems).

### Test Medium

#### Preferred: Potable Water

**Advantages**:
- Clean, non-corrosive
- Safe for personnel
- No disposal issues

**Requirements**:
- Free of debris, sediment
- No chlorides (if testing stainless steel or high-alloy materials)
- Temperature >40°F (to avoid freezing during test)

#### Alternative: Water with Additives

**Use Cases**:
- **Antifreeze**: Cold climates (prevent freezing)
- **Corrosion inhibitor**: Long hold times (prevent flash rusting)
- **Biocide**: Stored water (prevent bacterial growth)

**Requirements**:
- Non-toxic additives only
- Must not damage piping materials (check compatibility)
- Disposal per environmental regulations

**Typical Additive**: Propylene glycol (non-toxic antifreeze) at 10-30% concentration.

#### Avoid: Seawater, Contaminated Water

**Reasons**:
- Chlorides cause stress corrosion cracking (stainless steel, high-alloy materials)
- Contamination may foul piping (difficult to clean)
- Disposal issues (environmental regulations)

### Pre-Test Requirements

#### Mechanical Completion Checklist

- [ ] All components installed (pipes, fittings, valves, instruments)
- [ ] All welds completed and inspected (visual, RT/UT per code)
- [ ] All NDE reports reviewed and accepted (no rejectable indications)
- [ ] Punch list items resolved (Category A minimum, Category B per project spec)
- [ ] All temporary supports installed (to carry water weight if needed)
- [ ] All permanent supports installed and verified
- [ ] All flanges properly gasketed and bolted (correct gasket, torque sequence)
- [ ] All isolation points installed (blinds, spectacle blinds, valve closures)
- [ ] All test vents and drains installed (high/low points accessible)
- [ ] All pressure gauges installed and calibrated (valid calibration certificates)

#### Safety Review

- [ ] Test procedure reviewed and approved (contractor QC, client, third-party)
- [ ] Safety hazards identified (falling water, structural overload, personnel access)
- [ ] Test area barricaded (restrict access during pressurization)
- [ ] Emergency procedures defined (rapid depressurization, evacuation)
- [ ] Personnel protective equipment (PPE) defined (hard hat, safety glasses, gloves)
- [ ] Communication plan established (radios, hand signals for distributed teams)

#### Documentation Review

- [ ] ISOs for all lines in test package (latest revision)
- [ ] Line list with design pressure/temperature (verified current)
- [ ] Test pressure calculation (reviewed and approved)
- [ ] Material test certificates (MTCs) available for review
- [ ] Weld maps and NDE reports (from PipeTrak or QC records)
- [ ] Calibration certificates for test gauges (within calibration period)
- [ ] Test report template prepared (ready to record results)

### Test Execution Procedure

#### Step 1: System Configuration

1. **Install test boundaries**:
   - Install blind flanges at isolation points
   - Close isolation valves (verify can hold test pressure)
   - Install pipe caps/plugs at dead ends
   - Verify equipment isolated (if not ready for testing)

2. **Install test equipment**:
   - Pressure gauges at high point (2× required for redundancy)
   - Test pump connection at low point (for filling)
   - Vent valves at high points (for air removal)
   - Drain valves at low points (for draining after test)

3. **Verify configuration**:
   - Walk down test boundary (confirm all isolation points installed)
   - Check all flanges (gaskets, bolts, torque)
   - Check all vents/drains (accessible, operable)
   - Verify test gauges (calibration current, readable from safe distance)

#### Step 2: Filling and Venting

1. **Slowly fill system** with test medium (water):
   - Open drain valves to allow air to escape
   - Fill from low point using test pump
   - Monitor for leaks at flanges, welds during filling
   - Stop immediately if leaks observed (repair before continuing)

2. **Vent all high points**:
   - Open vent valves at high points
   - Continue filling until water flows from vents (no air bubbles)
   - Close vent valves when water stream is continuous
   - Repeat for all high points (complete air removal critical)

3. **Check for complete fill**:
   - All vent valves closed
   - System completely filled (no air pockets)
   - Pressure gauge shows positive pressure (>0 psig)

**Critical**: Air pockets can cause inaccurate test results (compressed air stores energy, creates false pressure readings).

#### Step 3: Preliminary Pressurization

**ASME B31.3 Para 345.4.2(c)**:

1. **Gradually increase pressure** to intermediate hold:
   - Target: Lesser of **½ test pressure** or **25 psig** (170 kPa)
   - Pressurization rate: Slow, controlled (avoid shock loading)

2. **Hold at intermediate pressure** for preliminary check:
   - Duration: 5-10 minutes
   - Visual inspection of all accessible areas
   - Check for leaks at flanges, welds, fittings
   - Check for unusual deformation (bulging, sagging)

3. **If leaks found**:
   - Depressurize immediately
   - Repair leak (may require weld repair, flange re-torque)
   - Re-inspect repair (NDE if weld repair)
   - Restart test procedure from Step 2 (refill and vent)

4. **If no leaks**:
   - Proceed to full test pressure

**Purpose**: Catch major leaks early (before full pressurization), verify system integrity at lower stress.

#### Step 4: Full Pressurization

1. **Increase pressure to test pressure**:
   - Gradual increase (avoid shock loading)
   - Monitor pressure gauge continuously
   - Stop at calculated test pressure (e.g., 900 psi)

2. **Verify test pressure**:
   - Check both pressure gauges (should read same, within ±2%)
   - If gauges disagree, use lower reading (conservative)
   - Record pressure and time (start of hold period)

3. **Clear test area**:
   - All personnel exit test area (behind barricades)
   - Only designated inspector remains (at safe observation point)
   - Maintain communication (radio or visual signals)

#### Step 5: Hold Period

**ASME B31.3 Requirement**: Minimum **10 minutes** at test pressure.

**Typical Practice**: 30-60 minutes (longer hold increases leak detection confidence).

**During Hold Period**:
- Monitor pressure gauge (pressure should remain constant ±2%)
- Visual inspection of all accessible areas (flanges, welds, fittings)
- Listen for hissing (water escaping under pressure)
- Check for wetness (wipe suspected areas with dry cloth)

**Pressure Drop Considerations**:
- Small pressure drop due to temperature change is acceptable
- Large pressure drop (>5%) indicates leak (must investigate)
- Constant pressure = good indication of integrity

**Critical Areas to Inspect**:
- All flanges (especially newly made-up joints)
- All welds (especially repair welds, tie-in welds)
- All threaded connections (valves, instruments)
- All temporary test boundaries (blinds, caps)

#### Step 6: Inspection and Documentation

1. **Detailed visual inspection**:
   - Systematic walkdown of entire test package
   - Inspect every weld (look for wetness, staining)
   - Inspect every flange (look for leaks at gasket)
   - Inspect every fitting, valve, instrument connection

2. **Record results**:
   - Test pressure achieved (psig or bar)
   - Hold time (minutes at test pressure)
   - Pressure at end of hold (verify minimal drop)
   - Ambient temperature (affects pressure readings)
   - Leaks found (location, description, severity)
   - Inspector name and signature
   - Date and time

3. **Photography** (recommended):
   - Photograph pressure gauge reading
   - Photograph any leaks found
   - Photograph test setup (for documentation)

#### Step 7: Depressurization and Draining

1. **Gradually reduce pressure**:
   - Slow, controlled depressurization (avoid water hammer)
   - Open drain valve at low point
   - Monitor pressure gauge (should decrease smoothly)

2. **Drain system completely**:
   - Open all drain points
   - Use compressed air to blow out water (if needed)
   - Verify complete drainage (no water pockets remain)

3. **Dry system** (if required):
   - Use compressed air or nitrogen purge
   - Continue until exhaust air is dry (no moisture visible)
   - Some services require desiccant drying or vacuum drying

4. **Remove test equipment**:
   - Remove pressure gauges
   - Remove test pump connection
   - Remove temporary blinds (reinstall if permanent isolation)
   - Cap or plug test connections

### Acceptance Criteria

**ASME B31.3 Para 345.4.2(c)**:

**Test is ACCEPTABLE if**:
- No visible leakage at any joint, connection, or weld
- Test pressure maintained for required duration (minimum 10 minutes)
- Visual inspection of all accessible areas shows no wetness or staining

**Test is UNACCEPTABLE if**:
- Any visible leakage detected (even small weeping)
- Pressure drops significantly (>5%) during hold period
- Structural deformation observed (bulging, sagging, permanent distortion)

**Actions for Unacceptable Test**:
1. Depressurize and drain system immediately
2. Identify leak location(s) and root cause
3. Repair defect (weld repair, flange re-torque, component replacement)
4. Re-inspect repair (NDE if weld repair)
5. Re-test entire system (full procedure, including preliminary pressurization)

**Acceptance Documentation**:
- Test report signed by contractor QC inspector
- Third-party inspector witness and sign-off (if required)
- Client representative acceptance (if required)
- Include in Mechanical Completion package

---

## Pneumatic Testing

### Overview

**Definition**: Pressure testing using compressible gas (typically air or nitrogen) at 1.2-1.5× design pressure.

**Advantages**:
- ✅ **No water**: Suitable for systems that cannot be filled with liquid
- ✅ **No drying**: No moisture removal required after test
- ✅ **No freezing risk**: Suitable for cold climates

**Disadvantages**:
- ❌ **Much more dangerous**: Compressed gas stores significant energy (explosion risk)
- ❌ **Harder leak detection**: Gas leaks not visible (requires soap solution or tracer gas)
- ❌ **Industry caution**: Code and MCAA recommend "last resort only"

**ASME B31.3 Para 345.4.3 Warning**:
> "The hazards associated with pneumatic tests must be taken into consideration."

**MCAA Recommendation**:
> "Pneumatic testing should be used only as a last resort due to the high energy stored in compressed gas."

### When to Use Pneumatic Testing

**Only when hydrostatic testing is impractical**:

1. **System design prevents water filling**:
   - Piping configured with traps or low points that cannot drain
   - Refrigerant systems (not designed to hold liquid)
   - Complex geometry prevents complete venting

2. **Moisture is undesirable**:
   - Instrument air systems (moisture causes control problems)
   - Compressed air systems (moisture causes corrosion, tool damage)
   - Refrigerant systems (moisture causes freeze-up)

3. **Internal lining would be damaged**:
   - FRP (fiberglass) lined piping
   - Rubber-lined piping
   - Specialty coatings sensitive to water

4. **Structural limitations**:
   - Existing supports cannot carry water weight
   - Roof-mounted piping (weight exceeds structural capacity)
   - Temporary piping not designed for water weight

5. **Design pressure <10 bar (145 psi) for gas service**:
   - Lower energy stored at lower pressure
   - Gas service (less risk than testing liquid line with gas)

**If none of above apply**: **Use hydrostatic testing** (safer, easier, code-preferred).

### Test Pressure Calculation (Reference Only - Performed by Engineering)

**IMPORTANT**: Contractors receive test pressure from engineering in line list/testing schedule. Do NOT calculate test pressure in the field.

**This section is for reference/understanding only.**

**ASME B31.3 Para 345.4.3(a)**:

**Formula** (used by engineering):
```
P_test = 1.2 to 1.5 × P_design
```

**Typical Practice** (by engineering): Use **1.25× design pressure** (conservative, between 1.2 and 1.5).

**Example** (for reference):
```
Line: 4"-IA-305-C2 (Instrument Air, 125 psi design pressure)
P_test = 1.25 × 125 psi = 156 psi (calculated by engineering)
```

**Constraints** (considered by engineering):
- Must not exceed maximum allowable test pressure of any non-isolated component
- Must not produce stress exceeding specified minimum yield strength at test temperature

### Test Medium

#### Preferred: Compressed Air

**Advantages**:
- Readily available (portable compressors)
- Non-toxic, non-flammable
- Atmospheric exhaust (no disposal issues)

**Disadvantages**:
- Contains moisture (may require drying)
- Contains oil mist (if oil-lubricated compressor)

**Requirements**:
- Oil-free compressor or coalescent filter (remove oil mist)
- Desiccant dryer (remove moisture, if system is moisture-sensitive)

#### Alternative: Nitrogen

**Advantages**:
- Inert (no oxidation, no combustion)
- Dry (no moisture if from cylinder/dewars)
- Clean (no oil contamination)

**Disadvantages**:
- Asphyxiation hazard (displaces oxygen in confined spaces)
- Cost (must purchase cylinders or liquid nitrogen)
- Requires regulated pressure source

**When to Use**:
- Oxygen-sensitive materials (stainless steel, high-alloy)
- Ultra-clean systems (semiconductor, pharmaceutical)
- Confined space testing (inert atmosphere safer than air)

#### Avoid: Oxygen, Flammable Gases

**Reasons**:
- **Oxygen**: Severe fire/explosion hazard (enriched atmosphere)
- **Flammable gases**: Obvious explosion hazard

**Never use** for pressure testing.

### Pre-Test Requirements

#### Mechanical Completion (Same as Hydrotest)

Same checklist as hydrostatic testing (see above).

**Additional for Pneumatic**:
- [ ] Verify no flammable materials near test area (compressed air + spark = fire)
- [ ] Verify ventilation adequate (if nitrogen, prevent asphyxiation)
- [ ] Verify no confined spaces in test area (if nitrogen, oxygen monitoring required)

#### Enhanced Safety Review (Pneumatic-Specific)

- [ ] **Hazard analysis complete**: Identify stored energy hazards (pressure × volume = energy)
- [ ] **Barricades established**: Minimum safe distance calculated based on energy stored
- [ ] **Personnel cleared**: Only essential personnel within barricade (all others excluded)
- [ ] **Emergency shutdown**: Quick-release valve accessible to abort test immediately
- [ ] **Communication plan**: Clear signals for pressurization, hold, depressurization
- [ ] **Personal protective equipment**: Hard hat, safety glasses, hearing protection minimum
- [ ] **Isolation verified**: All equipment isolated (valves closed and locked out)

**Safe Distance Calculation**:
```
Energy stored (E) = (P × V) / 2

Where:
P = test pressure (absolute, psi)
V = volume (cubic inches)

Safe distance = function of energy (consult safety engineer)
```

**Rule of Thumb**: For small systems (<10 cubic feet, <200 psi), minimum 25 feet clearance. For larger systems, engineering calculation required.

#### Documentation Review (Same as Hydrotest)

Same checklist as hydrostatic testing.

### Test Execution Procedure

#### Step 1: System Configuration

**Same as hydrostatic testing** (install test boundaries, install test equipment, verify configuration).

**Additional for Pneumatic**:
- Verify all vents closed (no air leakage to atmosphere during pressurization)
- Verify pressure relief valve installed (set at 1.1× test pressure, emergency over-pressure protection)
- Verify quick-release valve accessible (for rapid depressurization if needed)

#### Step 2: Initial Pressurization

**No filling/venting required** (gas compresses, no air removal needed).

1. **Verify system ready**:
   - All isolation points closed
   - Pressure gauges installed and readable
   - Test area cleared, barricaded

2. **Initial leak check at low pressure**:
   - Pressurize to 25 psig (or 10% of test pressure, whichever is greater)
   - Apply soap solution to all flanges, fittings
   - Look for bubbles (indicate leaks)
   - Repair any leaks found before continuing

**Purpose**: Identify gross leaks before reaching high pressure (safer to repair at low pressure).

#### Step 3: Graduated Pressurization (ASME B31.1 Procedure)

**ASME B31.1 Para 137.4.4** (more detailed than B31.3, widely adopted):

1. **Pressurize to ½ test pressure**:
   - Slow, gradual increase
   - Monitor pressure gauge continuously
   - Stop at ½ test pressure

2. **Hold at ½ test pressure**:
   - Duration: 10 minutes minimum
   - Visual and audible inspection (listen for leaks)
   - Check pressure stability (should not drop)

3. **Increase in increments of 1/10 test pressure**:
   - Example (for 150 psi test pressure):
     - 75 psi (½ test pressure) → Hold 10 min
     - 90 psi (+15 psi, 1/10 increment) → Hold 5 min
     - 105 psi → Hold 5 min
     - 120 psi → Hold 5 min
     - 135 psi → Hold 5 min
     - 150 psi (test pressure) → Hold 10 min minimum

4. **Purpose of graduated pressurization**:
   - Detect leaks at lower pressure (safer)
   - Monitor system response (no unusual deformation)
   - Reduce shock loading (gentler on welds, joints)

**Alternative (ASME B31.3 simpler procedure)**:
- Increase pressure gradually to test pressure (no specific increments)
- Exercise caution and sound engineering judgment

**Recommendation**: Use **ASME B31.1 graduated procedure** for pneumatic testing (extra safety worth the time).

#### Step 4: Test Pressure Hold

**ASME B31.3 Requirement**: Minimum **10 minutes** at test pressure.

**Typical Practice**: 30-60 minutes (longer hold increases leak detection confidence).

**Procedure**:
1. **Reach test pressure**:
   - Final increment to calculated test pressure
   - Verify both pressure gauges agree (within ±2%)
   - Record pressure and time

2. **Clear test area**:
   - All personnel behind barricades
   - Only designated inspector at safe observation point (minimum safe distance)

3. **Monitor during hold**:
   - Pressure gauge (should remain constant ±1-2%, temperature effects)
   - Audible inspection (listen for hissing from leaks)
   - Visual observation (use binoculars if safe distance is large)

**Temperature Effects**:
- Compressed gas temperature changes affect pressure more than water
- Pressure rise during pressurization (gas heats up during compression)
- Pressure drop during hold (gas cools to ambient)
- Allow 30-60 min stabilization before declaring test pass/fail

#### Step 5: Leak Detection

**Challenge**: Gas leaks are not visible (unlike water leaks).

**Methods**:

##### Method 1: Soap Solution (Bubble Test)

**Procedure**:
1. Reduce pressure to **lower of design pressure or 100 psig** (ASME B31.1 requirement)
2. Apply soap solution to all joints, welds, fittings
3. Look for bubbles (indicate leaks)
4. Mark leak locations
5. Document all leaks found

**Soap Solution**:
- Commercial leak detection solution (preferred)
- Dish soap + water (50/50 mix, adequate for most applications)
- Spray bottle application for large areas

**Advantages**: Simple, inexpensive, effective for accessible areas.

**Disadvantages**: Time-consuming (must apply to every joint), requires pressure reduction, not effective for very small leaks.

##### Method 2: Ultrasonic Leak Detection

**Procedure**:
1. Maintain system at test pressure (or design pressure)
2. Scan all joints, welds, fittings with ultrasonic detector
3. Detector picks up high-frequency sound of escaping gas
4. Mark leak locations
5. Document all leaks found

**Advantages**: Fast, effective for inaccessible areas, works at full test pressure, detects very small leaks.

**Disadvantages**: Requires specialized equipment (expensive), requires trained operator, ambient noise can interfere.

##### Method 3: Pressure Decay Test

**Procedure**:
1. Isolate system at test pressure (close supply valve)
2. Monitor pressure gauge over extended period (4-24 hours)
3. Account for temperature changes (use temperature-compensated calculation)
4. Calculate leak rate from pressure drop

**Formula**:
```
Leak rate = (ΔP × V) / (P_avg × Δt)

Where:
ΔP = pressure drop (psi)
V = system volume (cubic feet)
P_avg = average pressure during test (psi absolute)
Δt = time period (hours)
```

**Advantages**: Quantitative leak rate measurement, effective for very small leaks, no soap solution required.

**Disadvantages**: Time-consuming (hours to days), requires temperature correction, doesn't locate leak (only detects presence).

**When to Use**: Leak suspected but cannot be found with soap solution, quantitative leak rate required by specification.

##### Method 4: Helium Tracer Gas (Most Sensitive)

**Procedure**:
1. Add helium to test gas (5-10% concentration)
2. Pressurize system to test pressure
3. Scan all joints, welds, fittings with helium detector (mass spectrometer)
4. Detector picks up helium escaping from leaks
5. Mark and document all leaks found

**Advantages**: Most sensitive method (detects smallest leaks), quantitative leak rate, works at full test pressure.

**Disadvantages**: Very expensive (helium cost, detector rental), requires trained operator, rarely used in construction (more common in aerospace, nuclear).

**When to Use**: Critical systems (high-pressure, hazardous service), leak-tight requirements exceed standard codes, other methods failed to locate suspected leak.

#### Step 6: Depressurization

**CRITICAL**: Slow, controlled depressurization (fast depressurization creates hazards).

**Procedure**:
1. **Announce depressurization**: Warn all personnel (pressurized system being vented)
2. **Open vent valve slowly**: Gradual pressure reduction
3. **Monitor pressure gauge**: Pressure should decrease smoothly
4. **Vent to atmosphere**: Continue until pressure = 0 psig
5. **Verify zero pressure**: Check pressure gauge reads zero before opening system

**Hazards of Fast Depressurization**:
- Rapid gas expansion creates loud noise (hearing damage)
- High-velocity gas stream can blow debris (projectile hazard)
- Rapid cooling can damage components (Joule-Thomson effect)
- Static electricity generation (ignition source for flammable gases)

**Venting Location**: Vent to safe location (outdoors, away from personnel, away from ignition sources if flammable gas).

#### Step 7: Post-Test Inspection

**After depressurization to 0 psig**:
1. Remove test equipment (gauges, hoses, regulators)
2. Remove temporary test boundaries (blinds, caps) or reinstall if permanent
3. Verify system ready for next phase (pre-commissioning complete, ready for turnover)

### Acceptance Criteria

**ASME B31.3 Para 345.4.3(c)**:

**Test is ACCEPTABLE if**:
- No leaks detected by soap solution (or other leak detection method)
- Pressure maintained for required duration (minimum 10 minutes at test pressure)
- No structural deformation observed

**Test is UNACCEPTABLE if**:
- Any leak detected (even very small)
- Pressure drops significantly (>2-3%) during hold period (after temperature stabilization)
- Structural deformation observed

**Actions for Unacceptable Test**:
1. Depressurize system slowly and safely
2. Identify leak location(s) and root cause
3. Repair defect (weld repair, flange re-torque, component replacement)
4. Re-inspect repair (NDE if weld repair)
5. Re-test entire system (full procedure, including graduated pressurization)

**Acceptance Documentation**:
- Test report signed by contractor QC inspector
- Third-party inspector witness and sign-off (if required)
- Client representative acceptance (if required)
- Include in Mechanical Completion package

---

## Safety Protocols

### Hydrostatic Testing Safety

**Hazards**:
- Falling water (if leak or failure occurs at elevation)
- Structural overload (water weight exceeds support capacity)
- Cold water contact (hypothermia in cold climates)
- Pressurized system energy (sudden failure releases energy)

**Mitigation**:
- Verify supports adequate for water weight
- Barricade test area during pressurization and hold
- Provide drainage to prevent flooding
- PPE: Hard hat, safety glasses, gloves, boots

### Pneumatic Testing Safety (Enhanced)

**Hazards**:
- **Explosion**: Sudden failure releases stored energy (compressed gas)
- **Projectiles**: Failed components become missiles
- **Noise**: Rapid depressurization creates loud noise (hearing damage)
- **Asphyxiation**: Nitrogen displaces oxygen (confined spaces)

**Mitigation**:
- **Engineering controls**:
  - Graduated pressurization (detect leaks at lower pressure)
  - Pressure relief valve (prevent over-pressure)
  - Remote pressurization (personnel clear of test area)
  - Barricades (minimum safe distance based on energy calculation)

- **Administrative controls**:
  - Comprehensive test procedure (reviewed and approved)
  - Hazard analysis (identify risks, mitigation)
  - Personnel training (all team members understand hazards)
  - Communication plan (clear signals, no confusion)

- **Personal protective equipment**:
  - Hard hat (head protection from projectiles)
  - Safety glasses with side shields (eye protection)
  - Hearing protection (if noise >85 dBA expected)
  - Face shield (for close inspection after depressurization)

**MCAA Guidance**:
- Use pneumatic testing only as last resort
- Hydrotest whenever possible (much safer)
- If pneumatic required, follow graduated pressurization procedure
- Calculate safe distance, enforce barricades
- Review procedure with safety professional

---

## Future Enhancement Opportunities

### In-App Test Procedure Templates

**Concept**: Pre-defined hydrostatic and pneumatic procedures in PipeTrak.

**Features**:
- Checklist-driven workflow (step-by-step guidance)
- Automated test pressure calculation (based on line list data)
- Real-time test execution recording (digital test report)
- Photo documentation (attach gauge readings, leak photos)
- Signature capture (inspector, witness, client sign-off)

**Benefits**: Consistent procedures, reduced errors, digital records, faster test execution.

### Automated Test Type Recommendation

**Concept**: Auto-suggest hydrotest or pneumatic based on line list data.

**Logic**:
1. Import line list (service type, design pressure, special notes)
2. Apply decision logic flowchart (liquid → hydro, gas + high pressure → hydro, etc.)
3. Display recommendation with reasoning ("Hydrotest recommended: Liquid service per ASME B31.3")
4. User can override with justification ("Pneumatic required: Internal FRP lining, water will damage")

**Benefits**: Consistent decisions, code compliance, documentation of reasoning.

### Digital Test Reports with Auto-Population

**Concept**: Test report template with data auto-populated from test package.

**Auto-Populated Fields**:
- Test package ID, description
- ISO list (from package assignment)
- Design pressure (from line list)
- Test pressure (calculated 1.5× design)
- Material specifications (from component list)
- Weld count (from PipeTrak weld log)
- Inspector name (from user login)

**Manual Entry Fields**:
- Test date/time
- Actual test pressure (gauge reading)
- Hold time (minutes)
- Ambient temperature
- Leak findings (location, description)
- Photos (attach from mobile device)

**Benefits**: Faster reporting, fewer errors, digital signatures, instant delivery to client.

### Leak Tracking and Re-Test Management

**Concept**: Track failed tests, repairs, and re-tests in PipeTrak.

**Features**:
- Record leak locations (ISO + weld number or component tag)
- Link to repair work order (weld repair, flange re-torque)
- Track re-inspection (NDE after repair)
- Schedule re-test (when repair complete)
- Historical view (all test attempts, pass/fail, repairs)

**Benefits**: Complete test history, repair tracking, quality metrics (first-time pass rate).

---

## Related Documentation

- [TEST-PACKAGE-WORKFLOW-CONTEXT.md](./TEST-PACKAGE-WORKFLOW-CONTEXT.md) - Industry standards and workflow overview
- [TEST-PACKAGE-CREATION.md](./TEST-PACKAGE-CREATION.md) - ISO-based test package creation guide
- [TEST-PACKAGE-STAGES.md](./TEST-PACKAGE-STAGES.md) - Workflow stages and handoffs
- [TEST-PACKAGE-DATA-MODEL.md](./TEST-PACKAGE-DATA-MODEL.md) - Data model and schema

---

## Code References

- **ASME B31.3-2022**: Process Piping, Chapter VI (Examination, Inspection, and Testing)
  - Para 345.4: Leak Testing
  - Para 345.4.1: General
  - Para 345.4.2: Hydrostatic Leak Test
  - Para 345.4.3: Pneumatic Leak Test

- **ASME B31.1-2022**: Power Piping
  - Para 137.4: Pressure Tests
  - Para 137.4.4: Pneumatic Test (graduated pressurization procedure)

- **MCAA (Mechanical Contractors Association of America)**: Guide to Pressure Testing Safety
