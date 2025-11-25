// Demo Access Hook
// Feature: 031-one-click-demo-access
// Description: TanStack Query mutation for demo access - sends credentials via email

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DemoAccessRequest {
  email: string
  full_name: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

interface DemoAccessResponse {
  success: boolean
  message: string
  email_sent_to?: string
  duration_ms?: number
  error?: string
  field?: string
  retry_after?: number
  limit_type?: 'ip' | 'email'
}

interface UseDemoAccessOptions {
  onSuccess?: (data: DemoAccessResponse) => void
  onError?: (error: Error) => void
}

export function useDemoAccess(options: UseDemoAccessOptions = {}) {
  return useMutation({
    mutationFn: async (request: DemoAccessRequest): Promise<DemoAccessResponse> => {
      // Call the demo-access edge function
      const { data, error } = await supabase.functions.invoke('demo-access', {
        body: request
      })

      if (error) {
        console.error('[useDemoAccess] Edge function error:', error)
        throw error
      }

      // Check for API-level errors (rate limit, validation, etc.)
      if (!data.success) {
        const apiError = new Error(data.message || 'Demo access failed')
        Object.assign(apiError, {
          code: data.error,
          field: data.field,
          retryAfter: data.retry_after,
          limitType: data.limit_type
        })
        throw apiError
      }

      return data
    },
    onSuccess: (data) => {
      options.onSuccess?.(data)
    },
    onError: (error: Error) => {
      console.error('[useDemoAccess] Error:', error)
      options.onError?.(error)
    }
  })
}

// Type export for consumers
export type { DemoAccessRequest, DemoAccessResponse }
