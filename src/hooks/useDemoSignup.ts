// Demo Signup Hook
// Feature: 021-public-homepage
// Task: T038
// Description: TanStack Query mutation for demo signup Edge Function

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DemoSignupRequest {
  email: string
  full_name: string
}

interface DemoSignupResponse {
  success: boolean
  message: string
  demo_user_id?: string
  demo_expires_at?: string
  email_sent?: boolean
  stats?: {
    areas: number
    systems: number
    testPackages: number
    drawings: number
    components: number
  }
  duration_ms?: number
  error?: string
  field?: string
  retry_after?: number
  limit_type?: 'ip' | 'email'
}

export function useDemoSignup() {
  return useMutation({
    mutationFn: async (request: DemoSignupRequest): Promise<DemoSignupResponse> => {
      const { data, error } = await supabase.functions.invoke('demo-signup', {
        body: request
      })

      if (error) {
        console.error('Demo signup error:', error)
        throw error
      }

      return data
    }
  })
}
