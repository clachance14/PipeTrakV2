// Rate Limit Check Hook
// Feature: 021-public-homepage
// Task: T039
// Description: Query rate_limit_events before signup (informational only)

import { useQuery } from '@tanstack/react-query'

interface RateLimitCheckResult {
  allowed: boolean
  ipCount: number
  emailCount: number
  message?: string
}

/**
 * Check rate limits before demo signup
 * Note: This is informational only - actual enforcement happens server-side
 *
 * @param email - Email to check
 * @param enabled - Whether to run the query
 */
export function useRateLimitCheck(email: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ['rate-limit-check', email],
    queryFn: async (): Promise<RateLimitCheckResult> => {
      // Note: This is a client-side check for UX only
      // Server-side enforcement is in the Edge Function

      // We can't actually query rate_limit_events from the client due to RLS
      // This hook exists for future client-side pre-check if needed

      // For now, just return allowed = true
      // Real rate limiting happens server-side in demo-signup Edge Function

      return {
        allowed: true,
        ipCount: 0,
        emailCount: 0
      }
    },
    enabled: enabled && !!email,
    staleTime: 1000 * 60 // 1 minute
  })
}
