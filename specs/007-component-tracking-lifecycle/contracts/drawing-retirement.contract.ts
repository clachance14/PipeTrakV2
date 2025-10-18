/**
 * API Contract: Drawing Retirement
 * Feature 007: Component Tracking & Lifecycle Management
 *
 * Defines the API surface for drawing retirement operations.
 * Tests will validate implementations match these contracts.
 */

import type { Database } from '@/types/database.types';

type Drawing = Database['public']['Tables']['drawings']['Row'];
type PostgrestError = { message: string; code: string; details: string };

/**
 * useRetireDrawing() - Retire a drawing
 *
 * Request: { drawing_id: UUID, retire_reason: string }
 * Response: { drawing: Drawing } | { error: PostgrestError }
 *
 * Behavior:
 * - Sets is_retired = true
 * - Sets retire_reason (required, min 10 chars)
 * - Sets retired_at timestamp
 * - Components retain their drawing_id reference (NO cascade delete)
 * - Retired drawings should be visually indicated in UI
 * - Updates updated_at timestamp
 */
export interface RetireDrawingRequest {
  drawing_id: string;
  retire_reason: string; // Required, min 10 chars
}

export interface RetireDrawingResponse {
  drawing?: Drawing;
  error?: PostgrestError;
}
