/**
 * useDrawingBomItems Hook
 * Fetches BOM items for a specific drawing
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DrawingBomItem {
  id: string;
  drawing_id: string;
  project_id: string;
  item_type: string;
  classification: string;
  section: string;
  description: string | null;
  size: string | null;
  size_2: string | null;
  quantity: number;
  uom: string | null;
  spec: string | null;
  material_grade: string | null;
  schedule: string | null;
  schedule_2: string | null;
  rating: string | null;
  commodity_code: string | null;
  end_connection: string | null;
  item_number: number | null;
  needs_review: boolean;
  review_reason: string | null;
  is_tracked: boolean;
  created_at: string;
}

export function useDrawingBomItems(drawingId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['drawing-bom-items', drawingId],
    queryFn: async () => {
      if (!drawingId) return [];

      const { data, error } = await supabase
        .from('drawing_bom_items')
        .select('*')
        .eq('drawing_id', drawingId)
        .order('item_number', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as DrawingBomItem[];
    },
    enabled: enabled && !!drawingId,
    staleTime: 2 * 60 * 1000,
  });
}
