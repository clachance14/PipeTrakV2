/**
 * API Contract: Milestone Tracking
 * Feature 007: Component Tracking & Lifecycle Management
 *
 * Defines the API surface for component milestone update operations.
 * Tests will validate implementations match these contracts.
 */

import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];
type MilestoneEvent = Database['public']['Tables']['milestone_events']['Row'];
type PostgrestError = { message: string; code: string; details: string };

/**
 * useUpdateMilestone() - Update component milestone
 *
 * Request: { component_id: UUID, milestone_name: string, value: boolean | number, metadata?: object }
 * Response: { component: Component, event: MilestoneEvent } | { error: PostgrestError }
 *
 * Behavior:
 * 1. Updates component.current_milestones JSONB (merge new value)
 * 2. Database trigger (calculate_component_percent) auto-calculates percent_complete
 * 3. Creates milestone_events record with action, value, previous_value
 * 4. Updates component.last_updated_at and last_updated_by
 * 5. Returns updated component + created milestone event
 *
 * Validation:
 * - milestone_name must exist in component's progress_template.milestones_config
 * - value must be boolean for discrete milestones (is_partial: false)
 * - value must be number 0-100 for partial milestones (is_partial: true)
 * - metadata.welder_stencil required for "Weld Made" milestone on field_weld components
 *
 * Actions:
 * - 'complete': value changes from false→true OR 0→>0
 * - 'rollback': value changes from true→false OR >0→0
 * - 'update': partial % changes (e.g., 50→85)
 *
 * Permissions:
 * - Requires can_update_milestones permission (enforced by RLS policy)
 *
 * Performance:
 * - Trigger execution + response <100ms (NFR-003)
 */
export interface UpdateMilestoneRequest {
  component_id: string;
  milestone_name: string;
  value: boolean | number; // boolean for discrete, 0-100 for partial
  metadata?: {
    welder_stencil?: string; // Required for "Weld Made" milestone
    [key: string]: any;      // Extensible for future milestone-specific data
  };
}

export interface UpdateMilestoneResponse {
  component?: Component;
  event?: MilestoneEvent;
  error?: PostgrestError;
}
