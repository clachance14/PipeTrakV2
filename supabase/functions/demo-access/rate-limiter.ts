// Rate Limiter Utility
// Feature: 031-one-click-demo-access
// Description: Rate limiting logic for demo access (10/hour per IP, 5/day per email)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number // Seconds until rate limit resets
  limitType?: 'ip' | 'email'
  message?: string
}

/**
 * Check if demo access is allowed based on rate limits
 * - 10 requests per hour per IP address
 * - 5 requests per day per email address
 */
export async function checkRateLimits(
  supabase: SupabaseClient,
  email: string,
  ipAddress: string
): Promise<RateLimitResult> {
  try {
    // Check IP-based rate limit (10/hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: ipEvents, error: ipError } = await supabase
      .from('rate_limit_events')
      .select('created_at')
      .eq('event_type', 'demo_signup')
      .eq('identifier_type', 'ip_address')
      .eq('identifier_value', ipAddress)
      .gt('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (ipError) {
      console.error('[demo-access] Error checking IP rate limit:', ipError)
      throw new Error('Failed to check rate limits')
    }

    if (ipEvents && ipEvents.length >= 10) {
      const oldestEvent = new Date(ipEvents[ipEvents.length - 1].created_at)
      const resetTime = new Date(oldestEvent.getTime() + 60 * 60 * 1000)
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000)

      return {
        allowed: false,
        retryAfter,
        limitType: 'ip',
        message: `Too many demo requests from this IP address. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
      }
    }

    // Check email-based rate limit (5/day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: emailEvents, error: emailError } = await supabase
      .from('rate_limit_events')
      .select('created_at')
      .eq('event_type', 'demo_signup')
      .eq('identifier_type', 'email')
      .eq('identifier_value', email.toLowerCase())
      .gt('created_at', oneDayAgo)
      .order('created_at', { ascending: false })

    if (emailError) {
      console.error('[demo-access] Error checking email rate limit:', emailError)
      throw new Error('Failed to check rate limits')
    }

    if (emailEvents && emailEvents.length >= 5) {
      const oldestEvent = new Date(emailEvents[emailEvents.length - 1].created_at)
      const resetTime = new Date(oldestEvent.getTime() + 24 * 60 * 60 * 1000)
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000)

      return {
        allowed: false,
        retryAfter,
        limitType: 'email',
        message: `This email has reached the daily demo access limit. Please try again in ${Math.ceil(retryAfter / 3600)} hours.`
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('[demo-access] Rate limit check error:', error)
    throw error
  }
}

/**
 * Log a rate limit event for demo access
 */
export async function logRateLimitEvent(
  supabase: SupabaseClient,
  email: string,
  ipAddress: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const events = [
      {
        event_type: 'demo_signup',
        identifier_type: 'ip_address',
        identifier_value: ipAddress,
        metadata: { ...metadata, email_hash: hashEmail(email) }
      },
      {
        event_type: 'demo_signup',
        identifier_type: 'email',
        identifier_value: email.toLowerCase(),
        metadata: { ...metadata, ip_address: ipAddress }
      }
    ]

    const { error } = await supabase
      .from('rate_limit_events')
      .insert(events)

    if (error) {
      console.error('[demo-access] Error logging rate limit events:', error)
      // Don't throw - rate limit logging is non-critical
    }
  } catch (error) {
    console.error('[demo-access] Rate limit logging error:', error)
  }
}

/**
 * Simple hash function for email privacy in logs
 */
function hashEmail(email: string): string {
  let hash = 0
  const str = email.toLowerCase()

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return hash.toString(16)
}
