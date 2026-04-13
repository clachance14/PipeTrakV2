/**
 * useDrawingProcessingStatus Hook
 * Subscribes to Realtime changes on drawings.processing_status for a project
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DrawingStatus {
  id: string;
  drawing_no_raw: string;
  drawing_no_norm: string;
  sheet_number: string | null;
  processing_status: string | null;
  processing_note: string | null;
  file_path: string | null;
}

export function useDrawingProcessingStatus(projectId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery({
    queryKey: ['drawing-processing-status', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('drawings')
        .select('id, drawing_no_raw, drawing_no_norm, sheet_number, processing_status, processing_note, file_path')
        .eq('project_id', projectId)
        .not('processing_status', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as DrawingStatus[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['drawing-processing-status', projectId] });
  }, [queryClient, projectId]);

  // Auto-recover stuck drawings: if any are still 'processing' after 3 minutes, call unstick RPC
  useEffect(() => {
    if (!query.data) return;

    const hasStuck = query.data.some(
      (d) => d.processing_status === 'processing' || d.processing_status === 'queued',
    );
    if (!hasStuck) return;

    const timer = setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: count } = await (supabase.rpc as any)('unstick_processing_drawings');
        if (typeof count === 'number' && count > 0) {
          console.log(`[auto-recovery] Unstuck ${count} drawing(s)`);
          invalidate();
        }
      } catch {
        // Non-critical — the RPC may not exist on older deployments
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearTimeout(timer);
  }, [query.data, invalidate]);

  // Subscribe to Realtime changes on drawings for this project
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`drawing-status-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drawings',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          invalidate();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drawings',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          invalidate();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [projectId, invalidate]);

  return query;
}
