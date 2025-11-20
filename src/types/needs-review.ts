// src/types/needs-review.ts

export interface WeldCompletedPayload {
  weld_id: string;
  weld_number: string;
  component_id: string;
  drawing_number: string;
  welder_id: string | null;
  welder_name: string | null;
  date_welded: string;
  weld_type: 'BW' | 'SW' | 'FW' | 'TW';
  nde_required: boolean;
}

export type NeedsReviewPayload =
  | WeldCompletedPayload
  | Record<string, unknown>; // Other review types
