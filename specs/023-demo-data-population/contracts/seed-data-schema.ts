/**
 * Seed Data Schema Contract
 * Feature: 023-demo-data-population
 *
 * Defines TypeScript interfaces for declarative demo seed data structure.
 * This contract ensures type safety and consistency across seed data generation.
 */

// Component Types
export type ComponentType = 'spool' | 'valve' | 'support' | 'flange' | 'instrument';

// Weld Types
export type WeldType = 'butt' | 'socket';

// Material Types
export type Material = 'CS'; // Carbon Steel

// Identity Keys (type-specific)
export type IdentityKey =
  | { spool_id: string }  // For spools
  | {                     // For valve, support, flange, instrument
      drawing_norm: string;
      commodity_code: string;
      size: string;
      seq: number;
    };

// Welder Record
export interface Welder {
  stamp: string;  // e.g., "JD-123"
  name: string;   // e.g., "John Davis"
}

// Drawing Record
export interface DemoDrawing {
  drawing_number: string;  // e.g., "ISO-PR-001"
  area: string;            // Natural key reference
  system: string;          // Natural key reference
}

// Component Record
export interface DemoComponent {
  tag: string;             // Natural key for lookups
  type: ComponentType;
  identity: IdentityKey;
  drawing: string;         // Natural key reference (drawing_number)
  area: string;            // Natural key reference
  system: string;          // Natural key reference
  package: string;         // Natural key reference
  attributes?: {           // Optional commodity code and description
    cmdty_code?: string;
    description?: string;
    size?: string;
    spec?: string;
  };
}

// Field Weld Record
export interface DemoWeld {
  weld_number: string;     // e.g., "W-001"
  drawing: string;         // Natural key reference (drawing_number)
  type: WeldType;
  material: Material;
}

// Component Milestone State
export interface ComponentMilestoneState {
  component_tag: string;   // Natural key reference
  receive?: boolean;       // Receive milestone (all types)
  install?: boolean;       // Install milestone (valve, support, flange, instrument)
  erect?: boolean;         // Erect milestone (spool only)
  connect?: boolean;       // Connect milestone (spool only)
  punch?: boolean;         // Punch milestone (all types)
  // test and restore intentionally omitted (0% for active construction)
}

// Weld Milestone State
export interface WeldMilestoneState {
  weld_number: string;     // Natural key reference
  fit_up?: boolean;        // Fit-Up milestone
  weld_made?: boolean;     // Weld Made milestone (triggers welder assignment)
  punch?: boolean;         // Punch milestone
  // test and restore intentionally omitted (0% for active construction)
}

// Welder Assignment
export interface WelderAssignment {
  weld_number: string;     // Natural key reference
  welder_stamp: string;    // Natural key reference
  date_welded: string;     // ISO 8601 date string (YYYY-MM-DD)
}

// Complete Seed Data Structure
export interface DemoSeedData {
  // Phase 1: Skeleton (created by SQL function)
  skeleton: {
    areas: string[];       // 5 areas
    systems: string[];     // 5 systems
    packages: string[];    // 10 packages
    welders: Welder[];     // 4 welders
  };

  // Phase 2: Bulk data (created by Edge Function)
  drawings: DemoDrawing[];                   // 20 drawings
  components: DemoComponent[];               // 200 components
  welds: DemoWeld[];                         // ~120 welds
  milestones: ComponentMilestoneState[];     // 200 component states
  weld_milestones: WeldMilestoneState[];     // ~120 weld states
  weld_assignments: WelderAssignment[];      // ~78 assignments (65% of welds)
}

// Validation Constants
export const DEMO_DATA_CONSTRAINTS = {
  areas: { count: 5 },
  systems: { count: 5 },
  packages: { count: 10 },
  welders: { count: 4 },
  drawings: { count: 20, componentsPerDrawing: { min: 5, max: 20 } },
  components: {
    total: 200,
    distribution: {
      spool: 40,
      support: 80,
      valve: 50,
      flange: 20,
      instrument: 10
    }
  },
  welds: {
    total: 120,  // Approximately (3 per spool)
    perSpool: 3,
    assignmentRate: 0.65  // 65% of welds have welder assigned
  }
} as const;

// Milestone Progression Probabilities
export const MILESTONE_PROBABILITIES = {
  receive: 0.95,         // 95% of components received
  install_erect: 0.70,   // 70% installed/erected
  connect: 0.50,         // 50% connected (spool only)
  punch: 0.30,           // 30% punch complete
  test: 0.00,            // 0% tested (active construction)
  restore: 0.00          // 0% restored (active construction)
} as const;

// Export type guards
export function isSpoolIdentity(identity: IdentityKey): identity is { spool_id: string } {
  return 'spool_id' in identity;
}

export function isStandardIdentity(
  identity: IdentityKey
): identity is { drawing_norm: string; commodity_code: string; size: string; seq: number } {
  return 'drawing_norm' in identity && 'commodity_code' in identity;
}
