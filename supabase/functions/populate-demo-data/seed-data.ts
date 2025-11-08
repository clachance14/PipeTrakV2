/**
 * Demo Seed Data
 * Feature: 023-demo-data-population
 *
 * Complete seed data for demo project population:
 * - 5 areas, 5 systems, 10 packages, 4 welders (skeleton)
 * - 20 drawings
 * - 200 components (40 spools, 80 supports, 50 valves, 20 flanges, 10 instruments)
 * - 120 field welds (3 per spool)
 * - Realistic milestone progression
 * - 78 welder assignments (65% of welds)
 */

import type {
  DemoSeedData,
  DemoDrawing,
  DemoComponent,
  DemoWeld,
  ComponentMilestoneState,
  WeldMilestoneState,
  WelderAssignment,
  Welder
} from './seed-types.ts';

// ============================================================================
// SKELETON DATA (Phase 1 - Created by SQL Function)
// ============================================================================

const DEMO_AREAS = [
  'Pipe Rack',
  'ISBL',
  'Containment Area',
  'Water Process',
  'Cooling Tower'
];

const DEMO_SYSTEMS = [
  'Air',
  'Nitrogen',
  'Steam',
  'Process',
  'Condensate'
];

const DEMO_PACKAGES = [
  'TP-01', 'TP-02', 'TP-03', 'TP-04', 'TP-05',
  'TP-06', 'TP-07', 'TP-08', 'TP-09', 'TP-10'
];

const DEMO_WELDERS: Welder[] = [
  { stencil: 'JD-123', stencil_norm: 'JD-123', name: 'John Davis' },
  { stencil: 'SM-456', stencil_norm: 'SM-456', name: 'Sarah Miller' },
  { stencil: 'TR-789', stencil_norm: 'TR-789', name: 'Tom Rodriguez' },
  { stencil: 'KL-012', stencil_norm: 'KL-012', name: 'Kim Lee' }
];

// ============================================================================
// COMMODITY CODES (Sourced from Production)
// ============================================================================

const COMMODITY_CODES = {
  valve: [
    'VBALP-DICBFLR01M-024',
    'VBALU-PFCBFLF00M-001',
    'VCHKU-SECBFEQ00Q-008',
    'VGATU-SECBFLR02F-025'
  ],
  support: [
    'G4G-1412-05AA-001-1-1',
    'G4G-1412-05AA-001-6-6',
    'G4G-1430-05AB'
  ],
  flange: [
    'FBLABLDRA3399531',
    'FBLABLDRAWF0261',
    'FBLAG2DFA2351215'
  ],
  instrument: [
    'FE-55403',
    'ME-55403',
    'PIT-55402',
    'PIT-55406'
  ]
};

const SIZES = ['1', '1.5', '2', '3', '4', '6', '8'];

// ============================================================================
// DRAWINGS (20 records)
// ============================================================================

const DEMO_DRAWINGS: DemoDrawing[] = [
  // Pipe Rack (6 drawings)
  { drawing_number: 'ISO-PR-001', area: 'Pipe Rack', system: 'Steam' },
  { drawing_number: 'ISO-PR-002', area: 'Pipe Rack', system: 'Process' },
  { drawing_number: 'ISO-PR-003', area: 'Pipe Rack', system: 'Air' },
  { drawing_number: 'ISO-PR-004', area: 'Pipe Rack', system: 'Nitrogen' },
  { drawing_number: 'ISO-PR-005', area: 'Pipe Rack', system: 'Condensate' },
  { drawing_number: 'ISO-PR-006', area: 'Pipe Rack', system: 'Steam' },

  // ISBL (5 drawings)
  { drawing_number: 'ISO-ISBL-001', area: 'ISBL', system: 'Process' },
  { drawing_number: 'ISO-ISBL-002', area: 'ISBL', system: 'Steam' },
  { drawing_number: 'ISO-ISBL-003', area: 'ISBL', system: 'Air' },
  { drawing_number: 'ISO-ISBL-004', area: 'ISBL', system: 'Nitrogen' },
  { drawing_number: 'ISO-ISBL-005', area: 'ISBL', system: 'Condensate' },

  // Containment Area (3 drawings)
  { drawing_number: 'ISO-CA-001', area: 'Containment Area', system: 'Process' },
  { drawing_number: 'ISO-CA-002', area: 'Containment Area', system: 'Steam' },
  { drawing_number: 'ISO-CA-003', area: 'Containment Area', system: 'Air' },

  // Water Process (3 drawings)
  { drawing_number: 'ISO-WP-001', area: 'Water Process', system: 'Process' },
  { drawing_number: 'ISO-WP-002', area: 'Water Process', system: 'Condensate' },
  { drawing_number: 'ISO-WP-003', area: 'Water Process', system: 'Steam' },

  // Cooling Tower (3 drawings)
  { drawing_number: 'ISO-CT-001', area: 'Cooling Tower', system: 'Process' },
  { drawing_number: 'ISO-CT-002', area: 'Cooling Tower', system: 'Condensate' },
  { drawing_number: 'ISO-CT-003', area: 'Cooling Tower', system: 'Air' }
];

// ============================================================================
// COMPONENTS (200 records)
// ============================================================================

const DEMO_COMPONENTS: DemoComponent[] = [];

// Helper function to distribute items across drawings
function getDrawingForIndex(index: number, drawingSet: string[]): string {
  return drawingSet[index % drawingSet.length];
}

// Helper function to cycle through arrays
function getItemForIndex<T>(index: number, items: T[]): T {
  return items[index % items.length];
}

// --- SPOOLS (40 records) ---
for (let i = 1; i <= 40; i++) {
  const spoolId = `SP-${i.toString().padStart(3, '0')}`;
  const drawingIndex = Math.floor((i - 1) / 2); // 2 spools per drawing for first 20 drawings
  const drawing = DEMO_DRAWINGS[drawingIndex % 20].drawing_number;
  const area = DEMO_DRAWINGS[drawingIndex % 20].area;
  const system = DEMO_DRAWINGS[drawingIndex % 20].system;
  const packageName = getItemForIndex(i - 1, DEMO_PACKAGES);

  DEMO_COMPONENTS.push({
    tag: spoolId,
    type: 'spool',
    identity: { spool_id: spoolId },
    drawing,
    area,
    system,
    package: packageName,
    attributes: {
      cmdty_code: 'SPOOL',
      description: `Pipe Spool ${spoolId}`,
      size: getItemForIndex(i - 1, SIZES),
      spec: 'A106-B'
    }
  });
}

// --- SUPPORTS (80 records - 2 per spool) ---
for (let i = 1; i <= 80; i++) {
  const spoolIndex = Math.floor((i - 1) / 2); // 2 supports per spool
  const spool = DEMO_COMPONENTS[spoolIndex];
  const drawing = spool.drawing;
  const area = spool.area;
  const system = spool.system;
  const packageName = spool.package;
  const seq = ((i - 1) % 2) + 1; // Sequence 1 or 2 within the spool
  const commodityCode = getItemForIndex(i - 1, COMMODITY_CODES.support);
  const size = spool.attributes?.size || '2';
  const tag = `SUP-${i.toString().padStart(3, '0')}`;

  DEMO_COMPONENTS.push({
    tag,
    type: 'support',
    identity: {
      drawing_norm: drawing,
      commodity_code: commodityCode,
      size,
      seq
    },
    drawing,
    area,
    system,
    package: packageName,
    attributes: {
      cmdty_code: commodityCode,
      description: `Pipe Support ${tag}`,
      size
    }
  });
}

// --- VALVES (50 records) ---
for (let i = 1; i <= 50; i++) {
  const drawingIndex = Math.floor((i - 1) * 20 / 50); // Distribute across all 20 drawings
  const drawing = DEMO_DRAWINGS[drawingIndex].drawing_number;
  const area = DEMO_DRAWINGS[drawingIndex].area;
  const system = DEMO_DRAWINGS[drawingIndex].system;
  const packageName = getItemForIndex(i - 1, DEMO_PACKAGES);
  const commodityCode = getItemForIndex(i - 1, COMMODITY_CODES.valve);
  const size = getItemForIndex(i - 1, SIZES);
  const seq = Math.floor((i - 1) / 20) + 1; // Varies based on distribution
  const tag = `VLV-${i.toString().padStart(3, '0')}`;

  DEMO_COMPONENTS.push({
    tag,
    type: 'valve',
    identity: {
      drawing_norm: drawing,
      commodity_code: commodityCode,
      size,
      seq
    },
    drawing,
    area,
    system,
    package: packageName,
    attributes: {
      cmdty_code: commodityCode,
      description: `Valve ${tag}`,
      size
    }
  });
}

// --- FLANGES (20 records) ---
for (let i = 1; i <= 20; i++) {
  const drawing = DEMO_DRAWINGS[i - 1].drawing_number; // One flange per drawing
  const area = DEMO_DRAWINGS[i - 1].area;
  const system = DEMO_DRAWINGS[i - 1].system;
  const packageName = getItemForIndex(i - 1, DEMO_PACKAGES);
  const commodityCode = getItemForIndex(i - 1, COMMODITY_CODES.flange);
  const size = getItemForIndex(i - 1, SIZES);
  const seq = 1;
  const tag = `FLG-${i.toString().padStart(3, '0')}`;

  DEMO_COMPONENTS.push({
    tag,
    type: 'flange',
    identity: {
      drawing_norm: drawing,
      commodity_code: commodityCode,
      size,
      seq
    },
    drawing,
    area,
    system,
    package: packageName,
    attributes: {
      cmdty_code: commodityCode,
      description: `Flange ${tag}`,
      size
    }
  });
}

// --- INSTRUMENTS (10 records) ---
for (let i = 1; i <= 10; i++) {
  const drawingIndex = (i - 1) * 2; // Every other drawing
  const drawing = DEMO_DRAWINGS[drawingIndex].drawing_number;
  const area = DEMO_DRAWINGS[drawingIndex].area;
  const system = DEMO_DRAWINGS[drawingIndex].system;
  const packageName = getItemForIndex(i - 1, DEMO_PACKAGES);
  const commodityCode = getItemForIndex(i - 1, COMMODITY_CODES.instrument);
  const size = '1';
  const seq = 1;
  const tag = `INST-${i.toString().padStart(3, '0')}`;

  DEMO_COMPONENTS.push({
    tag,
    type: 'instrument',
    identity: {
      drawing_norm: drawing,
      commodity_code: commodityCode,
      size,
      seq
    },
    drawing,
    area,
    system,
    package: packageName,
    attributes: {
      cmdty_code: commodityCode,
      description: `Instrument ${tag}`,
      size
    }
  });
}

// --- FIELD WELDS (120 records - 3 per spool) ---
// Field welds are components that reference the field_welds table
for (let spoolIndex = 0; spoolIndex < 40; spoolIndex++) {
  const spool = DEMO_COMPONENTS[spoolIndex]; // First 40 components are spools
  const drawing = spool.drawing;
  const area = spool.area;
  const system = spool.system;
  const packageName = spool.package;

  for (let weldSeq = 1; weldSeq <= 3; weldSeq++) {
    const weldNumber = `W-${((spoolIndex * 3) + weldSeq).toString().padStart(3, '0')}`;
    const tag = `WELD-${weldNumber}`;

    DEMO_COMPONENTS.push({
      tag,
      type: 'field_weld',
      identity: { weld_number: weldNumber }, // Use weld_number as identity (NOT spool_id!)
      drawing,
      area,
      system,
      package: packageName,
      attributes: {
        cmdty_code: 'FIELD-WELD',
        description: `Field Weld ${weldNumber}`,
        size: spool.attributes?.size || '2'
      }
    });
  }
}

// ============================================================================
// FIELD WELD DETAILS (120 records - metadata for field_weld components)
// ============================================================================

const DEMO_WELDS: DemoWeld[] = [];

for (let spoolIndex = 0; spoolIndex < 40; spoolIndex++) {
  const spool = DEMO_COMPONENTS[spoolIndex]; // First 40 components are spools
  const drawing = spool.drawing;

  for (let weldSeq = 1; weldSeq <= 3; weldSeq++) {
    const weldNumber = `W-${((spoolIndex * 3) + weldSeq).toString().padStart(3, '0')}`;
    const weldType = weldSeq === 1 ? 'butt' : (weldSeq === 2 ? 'socket' : 'butt');
    const tag = `WELD-${weldNumber}`;

    DEMO_WELDS.push({
      weld_number: weldNumber,
      component_tag: tag,  // Link to the component
      drawing,
      type: weldType,
      material: 'CS'
    });
  }
}

// ============================================================================
// COMPONENT MILESTONES (320 records - 200 standard + 120 field welds)
// ============================================================================

const COMPONENT_MILESTONES: ComponentMilestoneState[] = [];

// Milestone progression probabilities
const PROB_RECEIVE = 0.95;
const PROB_INSTALL_ERECT = 0.70;
const PROB_CONNECT = 0.50; // Spool only
const PROB_PUNCH = 0.30;

// Random helper (deterministic seed for reproducibility)
let seed = 42;
function random(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

for (const component of DEMO_COMPONENTS) {
  const milestone: ComponentMilestoneState = {
    component_tag: component.tag
  };

  // Receive milestone (95% probability)
  const hasReceive = random() < PROB_RECEIVE;
  milestone.receive = hasReceive;

  // Install/Erect milestone (70% probability, only if received)
  if (hasReceive) {
    const hasInstallErect = random() < PROB_INSTALL_ERECT;

    if (component.type === 'spool') {
      milestone.erect = hasInstallErect;

      // Connect milestone (50% probability, only if erected)
      if (hasInstallErect) {
        milestone.connect = random() < PROB_CONNECT;
      }
    } else {
      // Valve, support, flange, instrument
      milestone.install = hasInstallErect;
    }

    // Punch milestone (30% probability, only if installed/erected)
    if (hasInstallErect) {
      milestone.punch = random() < PROB_PUNCH;
    }
  }

  COMPONENT_MILESTONES.push(milestone);
}

// ============================================================================
// WELD MILESTONES (120 records)
// ============================================================================

const WELD_MILESTONES: WeldMilestoneState[] = [];

// Weld milestone probabilities
const PROB_FIT_UP = 0.90;
const PROB_WELD_MADE = 0.65;
const PROB_WELD_PUNCH = 0.25;

for (const weld of DEMO_WELDS) {
  const milestone: WeldMilestoneState = {
    weld_number: weld.weld_number
  };

  // Fit-up milestone (90% probability)
  const hasFitUp = random() < PROB_FIT_UP;
  milestone.fit_up = hasFitUp;

  // Weld Made milestone (65% probability, only if fit-up complete)
  if (hasFitUp) {
    milestone.weld_made = random() < PROB_WELD_MADE;

    // Punch milestone (25% probability, only if weld made)
    if (milestone.weld_made) {
      milestone.punch = random() < PROB_WELD_PUNCH;
    }
  }

  WELD_MILESTONES.push(milestone);
}

// ============================================================================
// WELDER ASSIGNMENTS (78 records - 65% of welds with "Weld Made" true)
// ============================================================================

const WELD_ASSIGNMENTS: WelderAssignment[] = [];

// Generate dates within the past 30 days
function getDateWithinLast30Days(index: number): string {
  const daysAgo = (index % 30) + 1;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Assign welders only to welds with "Weld Made" true
let assignmentIndex = 0;
for (let i = 0; i < WELD_MILESTONES.length; i++) {
  const weldMilestone = WELD_MILESTONES[i];

  if (weldMilestone.weld_made) {
    const welderStencil = DEMO_WELDERS[assignmentIndex % 4].stencil;
    const dateWelded = getDateWithinLast30Days(assignmentIndex);

    WELD_ASSIGNMENTS.push({
      weld_number: weldMilestone.weld_number,
      welder_stencil: welderStencil,
      date_welded: dateWelded
    });

    assignmentIndex++;
  }
}

// ============================================================================
// EXPORT COMPLETE SEED DATA
// ============================================================================

export const DEMO_SEED_DATA: DemoSeedData = {
  skeleton: {
    areas: DEMO_AREAS,
    systems: DEMO_SYSTEMS,
    packages: DEMO_PACKAGES,
    welders: DEMO_WELDERS
  },
  drawings: DEMO_DRAWINGS,
  components: DEMO_COMPONENTS,
  welds: DEMO_WELDS,
  milestones: COMPONENT_MILESTONES,
  weld_milestones: WELD_MILESTONES,
  weld_assignments: WELD_ASSIGNMENTS
};

// Validation summary (for debugging)
export const SEED_DATA_SUMMARY = {
  areas: DEMO_AREAS.length,
  systems: DEMO_SYSTEMS.length,
  packages: DEMO_PACKAGES.length,
  welders: DEMO_WELDERS.length,
  drawings: DEMO_DRAWINGS.length,
  components: {
    total: DEMO_COMPONENTS.length,
    spools: DEMO_COMPONENTS.filter(c => c.type === 'spool').length,
    supports: DEMO_COMPONENTS.filter(c => c.type === 'support').length,
    valves: DEMO_COMPONENTS.filter(c => c.type === 'valve').length,
    flanges: DEMO_COMPONENTS.filter(c => c.type === 'flange').length,
    instruments: DEMO_COMPONENTS.filter(c => c.type === 'instrument').length
  },
  welds: DEMO_WELDS.length,
  milestones: COMPONENT_MILESTONES.length,
  weld_milestones: WELD_MILESTONES.length,
  weld_assignments: WELD_ASSIGNMENTS.length
};
