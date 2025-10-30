// Rate Limiter Utility
// Feature: 021-public-homepage
// Task: T008
// Description: Rate limiting logic for demo signups (10/hour per IP, 3/day per email)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number // Seconds until rate limit resets
  limitType?: 'ip' | 'email'
  message?: string
}

/**
 * Check if demo signup is allowed based on rate limits
 * - 10 signups per hour per IP address
 * - 3 signups per day per email address
 *
 * @param supabase - Supabase client (service role)
 * @param email - Email address to check
 * @param ipAddress - IP address to check
 * @returns Rate limit result with allowed status and retry time
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
      console.error('Error checking IP rate limit:', ipError)
      throw new Error('Failed to check rate limits')
    }

    if (ipEvents && ipEvents.length >= 10) {
      // Calculate time until oldest event expires (1 hour from that event)
      const oldestEvent = new Date(ipEvents[ipEvents.length - 1].created_at)
      const resetTime = new Date(oldestEvent.getTime() + 60 * 60 * 1000)
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000)

      return {
        allowed: false,
        retryAfter,
        limitType: 'ip',
        message: `Too many signup attempts from this IP address. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
      }
    }

    // Check email-based rate limit (3/day)
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
      console.error('Error checking email rate limit:', emailError)
      throw new Error('Failed to check rate limits')
    }

    if (emailEvents && emailEvents.length >= 3) {
      // Calculate time until oldest event expires (24 hours from that event)
      const oldestEvent = new Date(emailEvents[emailEvents.length - 1].created_at)
      const resetTime = new Date(oldestEvent.getTime() + 24 * 60 * 60 * 1000)
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000)

      return {
        allowed: false,
        retryAfter,
        limitType: 'email',
        message: `This email has reached the daily signup limit. Please try again in ${Math.ceil(retryAfter / 3600)} hours.`
      }
    }

    // Rate limits passed
    return {
      allowed: true
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    throw error
  }
}

/**
 * Log a rate limit event
 * Records the signup attempt for future rate limit checks
 *
 * @param supabase - Supabase client (service role)
 * @param email - Email address
 * @param ipAddress - IP address
 * @param metadata - Additional metadata (user agent, referrer, etc.)
 */
export async function logRateLimitEvent(
  supabase: SupabaseClient,
  email: string,
  ipAddress: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    // Insert two events: one for IP, one for email
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
      console.error('Error logging rate limit events:', error)
      throw new Error('Failed to log rate limit events')
    }
  } catch (error) {
    console.error('Rate limit logging error:', error)
    throw error
  }
}

/**
 * Simple hash function for email privacy in logs
 * Uses a basic hash to avoid storing plaintext emails in metadata
 */
function hashEmail(email: string): string {
  // Simple hash for privacy (not cryptographic)
  let hash = 0
  const str = email.toLowerCase()

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return hash.toString(16)
}
