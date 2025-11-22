/**
 * TanStack Query hooks for audit_log table (Feature 005)
 * Provides read-only audit trail queries for compliance
 * Feature 030: Added mutation hook for package assignment audit trail
 */

import { useQuery, useMutation, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/types/database.types';

type AuditLogEntry = Database['public']['Tables']['audit_log']['Row'];
type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];

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

/**
 * Audit Log Entry Input (Feature 030)
 * Used to create audit trail for package assignment changes
 */
export interface CreateAuditLogEntryInput {
  action_type: string;
  entity_type: string;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  reason?: string | null;
  project_id: string;
}

/**
 * Create audit log entry (Feature 030)
 *
 * Inserts row into audit_log table to track changes.
 * Auto-captures user_id from auth context and created_at timestamp.
 *
 * Used for tracking package assignment changes:
 * - Drawing assignments added/removed
 * - Component assignments added/removed
 *
 * @returns Mutation function to create audit log entry
 */
export function useCreateAuditLogEntry(): UseMutationResult<
  void,
  Error,
  CreateAuditLogEntryInput
> {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateAuditLogEntryInput) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const auditEntry: AuditLogInsert = {
        action_type: input.action_type,
        entity_type: input.entity_type,
        entity_id: input.entity_id || null,
        old_value: (input.old_value as any) || null,
        new_value: (input.new_value as any) || null,
        reason: input.reason || null,
        project_id: input.project_id,
        user_id: user.id,
      };

      const { error } = await supabase.from('audit_log').insert(auditEntry);

      if (error) throw error;
    },
    // Note: No need to invalidate queries - audit log is append-only
    // Components that display audit logs will refetch on their own schedule
  });
}
