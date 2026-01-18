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
  // Optional fields for current NDE state (fetched fresh when button clicked)
  current_nde_result?: 'PASS' | 'FAIL' | 'PENDING' | null;
  current_nde_type?: string | null;
}

export type NeedsReviewPayload =
  | WeldCompletedPayload
  | Record<string, unknown>; // Other review types
