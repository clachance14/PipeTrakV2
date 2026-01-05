/**
 * Organization Logo Hook for PDF Generation
 * Feature: Company Logo Support
 *
 * Fetches organization logo and converts to base64 for PDF reports.
 * Uses TanStack Query with long cache time since logos rarely change.
 */

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/useOrganization'

/**
 * Hook to get organization logo as base64 for PDF generation
 *
 * @returns Query result with base64-encoded logo string or null
 */
export function useOrganizationLogo() {
  const { useCurrentOrganization } = useOrganization()
  const { data: orgData } = useCurrentOrganization()
  const logoUrl = orgData?.organization.logo_url

  return useQuery({
    queryKey: ['organizationLogoBase64', logoUrl],
    queryFn: async () => {
      if (!logoUrl) return null

      try {
        // Fetch image
        const response = await fetch(logoUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch logo: ${response.statusText}`)
        }

        const blob = await response.blob()

        // Convert to base64
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result)
          }
          reader.onerror = () => {
            reject(new Error('Failed to convert logo to base64'))
          }
          reader.readAsDataURL(blob)
        })
      } catch (error) {
        console.error('Error fetching organization logo:', error)
        return null
      }
    },
    enabled: !!logoUrl,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (logos rarely change)
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  })
}
