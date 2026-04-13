/**
 * useDrawingFile Hook
 * Gets a signed URL for a drawing PDF from Supabase Storage
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface DrawingFileResult {
  signedUrl: string;
}

export function useDrawingFile(filePath: string | null) {
  return useQuery({
    queryKey: ['drawing-file', filePath],
    queryFn: async (): Promise<DrawingFileResult> => {
      if (!filePath) {
        throw new Error('No file path provided');
      }

      const { data, error } = await supabase.storage
        .from('drawing-pdfs')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        throw new Error(`Failed to get signed URL: ${error.message}`);
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned');
      }

      return { signedUrl: data.signedUrl };
    },
    enabled: !!filePath,
    staleTime: 30 * 60 * 1000, // 30 minutes (URL valid for 60)
  });
}
