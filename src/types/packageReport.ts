/**
 * Package Completion Report Types
 *
 * TypeScript interfaces for the test package completion report view.
 * Feature 030: Test Package Workflow - Component list grouped by drawing.
 */

import type { Database } from './database.types';
import type { PackageComponent } from './package.types';

// Re-export database types for convenience
type ComponentRow = Database['public']['Tables']['components']['Row'];
type FieldWeldRow = Database['public']['Tables']['field_welds']['Row'];

/**
 * Weld Log Entry
 *
 * Extends field weld data with component context for display in weld log table.
 * Includes all NDE data: type, result, date, notes.
 */
export interface WeldLogEntry extends FieldWeldRow {
  // Component context (joined from components table)
  component_identity_key: ComponentRow['identity_key'];
  component_type: ComponentRow['component_type'];
  weld_display_name: string; // Formatted weld number from identity_key

  // Welder context (optional - may be null)
  welder_name?: string | null;
}

/**
 * Drawing Group
 *
 * Groups package components by drawing with calculated statistics.
 * Used for accordion-based display in completion report.
 */
export interface DrawingGroup {
  // Drawing identification
  drawing_id: string;
  drawing_no_norm: string;

  // Component counts and statistics
  component_count: number;
  unique_supports_count: number; // Distinct identity_key values where component_type = 'support'

  // Component data
  components: PackageComponent[];

  // Weld log data (filtered to components in this drawing)
  weld_log: WeldLogEntry[];

  // NDE summary statistics (calculated from weld_log)
  nde_summary: NDESummary;
}

/**
 * NDE Summary Statistics
 *
 * Aggregate NDE data for a drawing or package.
 * Calculated from field_welds where nde_required = true.
 */
export interface NDESummary {
  total_welds: number; // All welds (nde_required + !nde_required)
  nde_required_count: number; // Welds where nde_required = true
  nde_pass_count: number; // Welds where nde_result = 'PASS'
  nde_fail_count: number; // Welds where nde_result = 'FAIL'
  nde_pending_count: number; // Welds where nde_required = true AND nde_result IS NULL or 'PENDING'
}

/**
 * Component Summary Row
 *
 * Package-level component summary with aggregated counts.
 * Groups components by identity (excluding seq field).
 */
export interface ComponentSummaryRow {
  drawing_no_norm: string;
  component_type: string;
  identity_display: string; // Human-readable tag (e.g., "1-SPOOL-001", "CS-2/2IN")
  quantity: number; // Count of components with same identity (excluding seq)
}

/**
 * Support Summary Row
 *
 * Package-level support summary with commodity code breakdown.
 * Groups supports by commodity_code + size (excluding seq).
 */
export interface SupportSummaryRow {
  commodity_code: string;
  size: string;
  quantity: number; // Count of supports with same commodity_code + size
}

/**
 * Package Completion Report Data
 *
 * Complete data structure for the completion report page.
 * Includes package metadata + drawing groups + summary tables.
 */
export interface PackageCompletionReport {
  // Package metadata
  package_id: string;
  package_name: string;
  test_type: string | null;
  target_date: string | null;

  // Summary tables (NEW - Feature 030)
  component_summary: ComponentSummaryRow[];
  support_summary: SupportSummaryRow[];
  is_draft: boolean; // true if any workflow stages incomplete

  // Grouped component data
  drawing_groups: DrawingGroup[];

  // Overall package statistics
  total_components: number;
  total_unique_supports: number;
  overall_nde_summary: NDESummary;
}
