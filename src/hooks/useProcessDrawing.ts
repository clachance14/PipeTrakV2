/**
 * useProcessDrawing Hook
 * TanStack Query mutation for AI-powered drawing import
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

interface ProcessDrawingRequest {
  projectId: string;
  filePath: string;
  pageNumber?: number;
  totalPages?: number;
}

interface ProcessingResult {
  success: boolean;
  drawingsProcessed: number;
  componentsCreated: number;
  bomItemsStored: number;
  errors: string[];
}

async function processDrawing(request: ProcessDrawingRequest): Promise<ProcessingResult> {
  const { data, error } = await supabase.functions.invoke<ProcessingResult>('process-drawing', {
    body: request,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody = await error.context.json();
      // 400 with success field = partial failure result from edge function
      if (error.context.status === 400 && errorBody && typeof errorBody === 'object' && 'success' in errorBody) {
        return errorBody as ProcessingResult;
      }
      throw new Error(errorBody?.errors?.[0] || `Processing failed: ${error.message}`);
    }
    if (error instanceof FunctionsRelayError) {
      throw new Error(`Edge function relay error: ${error.message}`);
    }
    if (error instanceof FunctionsFetchError) {
      throw new Error(`Network error calling edge function: ${error.message}`);
    }
    throw error;
  }

  if (!data) {
    throw new Error('No data returned from edge function');
  }

  return data;
}

export function useProcessDrawing() {
  return useMutation({
    mutationFn: processDrawing,
    onSuccess: (data) => {
      if (data.success) {
        console.log(`Successfully processed ${data.drawingsProcessed} drawing(s), created ${data.componentsCreated} component(s)`);
      }
    },
    onError: (error: Error) => {
      console.error('Drawing processing failed:', error.message);
    },
  });
}
