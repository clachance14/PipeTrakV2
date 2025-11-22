/**
 * TanStack Query hooks for package certificates (Feature 030)
 * Provides CRUD operations for certificate management
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Package Certificate
 * Corresponds to database table: package_certificates
 */
export interface PackageCertificate {
  id: string;
  package_id: string;
  certificate_number: string;
  client: string | null;
  client_spec: string | null;
  line_number: string | null;
  test_pressure: number;
  pressure_unit: 'PSIG' | 'BAR' | 'KPA' | 'PSI';
  test_media: string;
  temperature: number;
  temperature_unit: 'F' | 'C' | 'K';
  created_at: string;
  updated_at: string;
}

/**
 * Create Certificate Input
 */
export interface CreateCertificateInput {
  package_id: string;
  project_id: string; // Needed for certificate number generation
  client?: string | null;
  client_spec?: string | null;
  line_number?: string | null;
  test_pressure: number;
  pressure_unit: 'PSIG' | 'BAR' | 'KPA' | 'PSI';
  test_media: string;
  temperature: number;
  temperature_unit: 'F' | 'C' | 'K';
}

/**
 * Update Certificate Input
 */
export interface UpdateCertificateInput {
  id: string;
  client?: string | null;
  client_spec?: string | null;
  line_number?: string | null;
  test_pressure?: number;
  pressure_unit?: 'PSIG' | 'BAR' | 'KPA' | 'PSI';
  test_media?: string;
  temperature?: number;
  temperature_unit?: 'F' | 'C' | 'K';
}

/**
 * Query certificate for a package
 * Returns null if no certificate exists
 */
export function usePackageCertificate(
  packageId: string | undefined
): UseQueryResult<PackageCertificate | null, Error> {
  return useQuery({
    queryKey: ['package-certificate', packageId],
    queryFn: async () => {
      if (!packageId) return null;

      const { data, error } = await supabase
        .from('package_certificates')
        .select('*')
        .eq('package_id', packageId)
        .single();

      if (error) {
        // PGRST116 = no rows returned (certificate doesn't exist yet)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as PackageCertificate;
    },
    enabled: !!packageId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create a new certificate
 * Auto-generates certificate number using generate_certificate_number RPC
 */
export function useCreateCertificate(): UseMutationResult<
  PackageCertificate,
  Error,
  CreateCertificateInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCertificateInput) => {
      // Step 1: Generate certificate number
      const { data: certNumber, error: rpcError } = await supabase.rpc(
        'generate_certificate_number',
        { p_project_id: input.project_id }
      );

      if (rpcError) throw rpcError;
      if (!certNumber) throw new Error('Failed to generate certificate number');

      // Step 2: Insert certificate
      const { data, error } = await supabase
        .from('package_certificates')
        .insert({
          package_id: input.package_id,
          certificate_number: certNumber,
          client: input.client || null,
          client_spec: input.client_spec || null,
          line_number: input.line_number || null,
          test_pressure: input.test_pressure,
          pressure_unit: input.pressure_unit,
          test_media: input.test_media,
          temperature: input.temperature,
          temperature_unit: input.temperature_unit,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create certificate');

      return data as PackageCertificate;
    },
    onSuccess: (data) => {
      // Invalidate certificate query
      queryClient.invalidateQueries({
        queryKey: ['package-certificate', data.package_id],
      });
      toast.success('Certificate saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save certificate: ' + error.message);
    },
  });
}

/**
 * Update an existing certificate
 */
export function useUpdateCertificate(): UseMutationResult<
  PackageCertificate,
  Error,
  UpdateCertificateInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCertificateInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('package_certificates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update certificate');

      return data as PackageCertificate;
    },
    onSuccess: (data) => {
      // Invalidate certificate query
      queryClient.invalidateQueries({
        queryKey: ['package-certificate', data.package_id],
      });
      toast.success('Certificate updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update certificate: ' + error.message);
    },
  });
}

/**
 * Save certificate as draft (partial data allowed)
 * Uses same mutation as create/update but with different toast message
 */
export function useSaveCertificateDraft(): UseMutationResult<
  PackageCertificate,
  Error,
  CreateCertificateInput | UpdateCertificateInput
> {
  const queryClient = useQueryClient();
  const createMutation = useCreateCertificate();
  const updateMutation = useUpdateCertificate();

  return useMutation({
    mutationFn: async (input: CreateCertificateInput | UpdateCertificateInput) => {
      // Determine if this is a create or update based on presence of `id`
      if ('id' in input) {
        return updateMutation.mutateAsync(input);
      } else {
        return createMutation.mutateAsync(input);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['package-certificate', data.package_id],
      });
      toast.success('Draft saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save draft: ' + error.message);
    },
  });
}
