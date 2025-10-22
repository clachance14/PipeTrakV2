/**
 * Package Types
 * Feature 012: Test Package Readiness Page Enhancement
 */

import type { ComponentType, IdentityKey, MilestoneConfig } from './drawing-table.types';

// Status color for package cards
export type StatusColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red';

/**
 * PackageCard - Display interface for package cards in grid view
 * Maps from mv_package_readiness materialized view
 */
export interface PackageCard {
  id: string;
  name: string;
  description: string | null;
  progress: number; // 0-100 (avg_percent_complete)
  componentCount: number; // total_components
  blockerCount: number; // blocker_count
  targetDate: string | null; // ISO 8601 date
  statusColor: StatusColor; // Computed from progress
}

/**
 * Package - Full entity from test_packages table
 */
export interface Package {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string | null; // ISO 8601 date
  created_at: string;
}

/**
 * PackageComponent - Component with drawing info for package detail page
 * Includes drawing.test_package_id for inheritance detection
 */
export interface PackageComponent {
  id: string;
  drawing_id: string | null;
  drawing_no_norm: string | null;
  drawing_test_package_id: string | null; // For inheritance badge detection
  component_type: ComponentType;
  identity_key: IdentityKey;
  identityDisplay: string; // Formatted via formatIdentityKey
  test_package_id: string | null; // NULL = inherited from drawing
  percent_complete: number;
  current_milestones: Record<string, boolean | number>;
  progress_template_id: string;
  milestones_config: MilestoneConfig[];
}

/**
 * CreatePackagePayload - Input for create_test_package RPC
 */
export interface CreatePackagePayload {
  p_project_id: string;
  p_name: string;
  p_description?: string | null;
  p_target_date?: string | null;
}

/**
 * UpdatePackagePayload - Input for update_test_package RPC
 * All fields optional (partial update)
 */
export interface UpdatePackagePayload {
  p_package_id: string;
  p_name?: string | null;
  p_description?: string | null;
  p_target_date?: string | null;
}

/**
 * UpdatePackageResponse - JSONB response from update_test_package RPC
 */
export type UpdatePackageResponse =
  | { success: true }
  | { error: string };
