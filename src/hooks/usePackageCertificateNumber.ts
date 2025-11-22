/**
 * TanStack Query hook for package certificate number generation
 * Feature 030 - Test Package Lifecycle Workflow
 *
 * Generates sequential certificate numbers in format: "PKG-001", "PKG-002", etc.
 * Used by PackageCertificateForm when submitting certificate (FR-016).
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Query next available certificate number for a project
 *
 * Queries existing certificates to find highest number, then returns next sequential number.
 * Format: "PKG-NNN" where NNN is zero-padded (e.g., "PKG-001", "PKG-042", "PKG-123").
 *
 * @param projectId - Project ID to scope certificate numbers
 * @returns Next available certificate number
 *
 * @example
 * const { data: nextNumber } = usePackageCertificateNumber('project-uuid');
 * // Returns "PKG-001" if no certificates exist
 * // Returns "PKG-005" if highest existing is "PKG-004"
 */
export function usePackageCertificateNumber(
  projectId: string
): UseQueryResult<string, Error> {
  return useQuery({
    queryKey: ['certificate-number', projectId],
    queryFn: async () => {
      // First, get all package IDs for this project
      const { data: packages, error: pkgError } = await supabase
        .from('test_packages')
        .select('id')
        .eq('project_id', projectId);

      if (pkgError) throw pkgError;

      // If no packages exist, start at PKG-001
      if (!packages || packages.length === 0) {
        return 'PKG-001';
      }

      const packageIds = packages.map((pkg) => pkg.id);

      // Query existing certificates for these packages
      const { data: certificates, error } = await supabase
        .from('package_certificates')
        .select('certificate_number')
        .in('package_id', packageIds)
        .order('certificate_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      // If no certificates exist, start at PKG-001
      if (!certificates || certificates.length === 0) {
        return 'PKG-001';
      }

      // Extract number from highest certificate (format: "PKG-NNN")
      const highestCert = certificates[0];
      if (!highestCert || !highestCert.certificate_number) {
        return 'PKG-001';
      }

      const match = highestCert.certificate_number.match(/PKG-(\d+)/);

      if (!match || !match[1]) {
        // Fallback if format doesn't match (shouldn't happen)
        return 'PKG-001';
      }

      const nextNum = parseInt(match[1], 10) + 1;
      return `PKG-${nextNum.toString().padStart(3, '0')}`;
    },
    staleTime: 0, // Always fresh (certificate numbers must be unique)
  });
}
