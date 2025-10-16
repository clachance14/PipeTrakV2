/**
 * TanStack Query hooks for audit_log table (Feature 005)
 * Provides read-only audit trail queries for compliance
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type AuditLogEntry = Database['public']['Tables']['audit_log']['Row'];

interface AuditLogFilters {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action_type?: string;
  limit?: number; // default 100
  offset?: number; // default 0
}

/**
 * Query audit_log entries for a project (read-only)
 * Retention: Indefinite while project active (FR-032)
 */
export function useAuditLog(
  projectId: string,
  filters?: AuditLogFilters
): UseQueryResult<AuditLogEntry[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'audit-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('project_id', projectId);

      // Apply filters
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters?.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      // Pagination
      const limit = filters?.limit || 100;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (audit log rarely needs real-time updates)
  });
}
