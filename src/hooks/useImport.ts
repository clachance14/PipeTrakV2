/**
 * useImport Hook
 * TanStack Query mutation for CSV material takeoff import
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ImportResult } from '@/schemas/import';

interface ImportRequest {
  projectId: string;
  csvContent: string;
  // userId is extracted from auth token on server-side
}

/**
 * Call the import-takeoff Edge Function
 */
async function importTakeoff(request: ImportRequest): Promise<ImportResult> {
  // Verify we have a session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  if (!session?.access_token) {
    throw new Error('Not authenticated. Please sign in and try again.');
  }

  // Call Edge Function directly with fetch for better control
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = `${supabaseUrl}/functions/v1/import-takeoff`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify(request)
  });

  const data = await response.json();

  if (!response.ok) {
    // For validation errors (400), return the structured error data
    // The UI will display these as validation failures based on data.success field
    if (response.status === 400 && data && typeof data === 'object' && 'success' in data) {
      return data as ImportResult;
    }

    // For auth errors, throw to trigger proper error handling
    if (response.status === 401) {
      throw new Error('Authentication failed. Please sign in and try again.');
    }

    if (response.status === 403) {
      throw new Error(data?.errors?.[0]?.reason || 'Access denied. You do not have permission to import to this project.');
    }

    // For server errors or unexpected responses, throw with details
    throw new Error(data?.errors?.[0]?.reason || `Import failed: ${response.status} ${response.statusText}`);
  }

  return data as ImportResult;
}

/**
 * Hook for importing CSV material takeoff
 */
export function useImport() {
  return useMutation({
    mutationFn: importTakeoff,
    onSuccess: (data) => {
      if (data.success) {
        console.log(`Successfully imported ${data.componentsCreated} components`);
      }
    },
    onError: (error: Error) => {
      console.error('Import failed:', error.message);
    }
  });
}
