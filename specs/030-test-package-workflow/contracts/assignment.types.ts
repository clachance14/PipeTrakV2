/**
 * Assignment Domain Types
 *
 * TypeScript interfaces for package assignment entities (drawing-based and component-based).
 * See: specs/030-test-package-workflow/data-model.md
 */

/**
 * Assignment Mode Enum
 *
 * Determines assignment mode for package creation (FR-003, FR-004).
 * Users choose EITHER drawing-based OR component-based, not both.
 */
export type AssignmentMode = 'drawing' | 'component';

/**
 * Package Drawing Assignment
 *
 * Links package to drawing for component inheritance.
 * Corresponds to database table: package_drawing_assignments
 */
export interface PackageDrawingAssignment {
  id: string;
  package_id: string;
  drawing_id: string;
  created_at: string; // ISO 8601 timestamp
}

/**
 * Package Component Assignment
 *
 * Links package to individual component (direct assignment, overrides inheritance).
 * Corresponds to database table: package_component_assignments
 */
export interface PackageComponentAssignment {
  id: string;
  package_id: string;
  component_id: string;
  created_at: string; // ISO 8601 timestamp
}

/**
 * Drawing Assignment Create Input
 *
 * Input for assigning drawings to package (FR-006, FR-007).
 * Creates entries in package_drawing_assignments table.
 */
export interface DrawingAssignmentCreateInput {
  package_id: string;
  drawing_ids: string[]; // Multi-select drawings
}

/**
 * Component Assignment Create Input
 *
 * Input for assigning components to package (FR-009, FR-010).
 * Creates entries in package_component_assignments table.
 * Validates component uniqueness (FR-012, FR-013).
 */
export interface ComponentAssignmentCreateInput {
  package_id: string;
  component_ids: string[]; // Multi-select components
}

/**
 * Drawing with Component Preview
 *
 * Extended drawing info with component count for assignment preview (FR-008).
 */
export interface DrawingWithComponentCount {
  id: string;
  drawing_no_raw: string;
  drawing_no_norm: string;
  title: string | null;
  rev: string | null;
  component_count: number; // Number of components that will be inherited
  areas: string[]; // Unique areas from components on this drawing
}

/**
 * Component with Assignment Status
 *
 * Extended component info with current package assignment for uniqueness validation (FR-012, FR-013).
 */
export interface ComponentWithAssignmentStatus {
  id: string;
  component_type: string;
  identity_key: Record<string, unknown>; // JSONB
  area_id: string | null;
  system_id: string | null;
  test_package_id: string | null; // NULL if unassigned, UUID if assigned elsewhere
  test_package_name: string | null; // Package name if assigned elsewhere
  can_assign: boolean; // True if test_package_id IS NULL
}

/**
 * Assignment Preview
 *
 * Preview of what will be assigned before package creation (FR-008).
 * Shows total component count and breakdown by area/system.
 */
export interface AssignmentPreview {
  mode: AssignmentMode;
  total_components: number;
  drawing_count?: number; // Only for drawing mode
  component_count?: number; // Only for component mode
  breakdown_by_area: Record<string, number>; // Area name → component count
  breakdown_by_system: Record<string, number>; // System name → component count
  conflicts: ComponentAssignmentConflict[]; // Components already assigned elsewhere
}

/**
 * Component Assignment Conflict
 *
 * Details about component that cannot be assigned due to uniqueness constraint (FR-013).
 */
export interface ComponentAssignmentConflict {
  component_id: string;
  component_identity: string; // Human-readable identity (e.g., "Weld W-001", "Spool SP-042")
  current_package_id: string;
  current_package_name: string;
  error_message: string; // "Component already assigned to package {name}"
}

/**
 * Assignment Validation Result
 *
 * Result of validating component assignments before creation.
 * Used to enforce component uniqueness (FR-012, FR-013).
 */
export interface AssignmentValidationResult {
  valid: boolean;
  conflicts: ComponentAssignmentConflict[];
  assignable_components: string[]; // Component IDs that can be assigned
}

/**
 * Package Components Query Result
 *
 * Result of querying all components for a package (direct + inherited).
 * See data-model.md Query Patterns section.
 */
export interface PackageComponentsQueryResult {
  package_id: string;
  components: Array<{
    component_id: string;
    assignment_type: 'direct' | 'inherited'; // Direct = package_component_assignments, Inherited = package_drawing_assignments
    drawing_id: string | null; // Only for inherited components
    drawing_no: string | null; // Only for inherited components
  }>;
  total_count: number;
  direct_count: number;
  inherited_count: number;
}
