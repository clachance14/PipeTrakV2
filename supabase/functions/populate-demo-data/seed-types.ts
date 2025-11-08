/**
 * Seed Data Schema Types
 * Feature: 023-demo-data-population
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
  stencil: string;       // e.g., "JD-123"
  stencil_norm: string;  // Normalized version (uppercase, no spaces)
  name: string;          // e.g., "John Davis"
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
  component_tag: string;   // Tag of the field_weld component
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
}

// Weld Milestone State
export interface WeldMilestoneState {
  weld_number: string;     // Natural key reference
  fit_up?: boolean;        // Fit-Up milestone
  weld_made?: boolean;     // Weld Made milestone (triggers welder assignment)
  punch?: boolean;         // Punch milestone
}

// Welder Assignment
export interface WelderAssignment {
  weld_number: string;      // Natural key reference
  welder_stencil: string;   // Natural key reference
  date_welded: string;      // ISO 8601 date string (YYYY-MM-DD)
}

// Complete Seed Data Structure
export interface DemoSeedData {
  skeleton: {
    areas: string[];
    systems: string[];
    packages: string[];
    welders: Welder[];
  };
  drawings: DemoDrawing[];
  components: DemoComponent[];
  welds: DemoWeld[];
  milestones: ComponentMilestoneState[];
  weld_milestones: WeldMilestoneState[];
  weld_assignments: WelderAssignment[];
}
