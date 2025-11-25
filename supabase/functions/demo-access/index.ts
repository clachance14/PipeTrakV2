// Demo Access Edge Function
// Feature: 031-one-click-demo-access
// Description: Capture lead info and send welcome email with demo credentials

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateDemoAccessRequest, normalizeEmail, normalizeFullName } from './validation.ts'
import { checkRateLimits, logRateLimitEvent } from './rate-limiter.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

// Demo account credentials - sent to user via email
const DEMO_ACCOUNT_EMAIL = 'demo@pipetrak.co'
const DEMO_ACCOUNT_PASSWORD = Deno.env.get('DEMO_PASSWORD')!

/**
 * Log structured error with context
 */
function logError(phase: string, error: unknown, context: Record<string, unknown> = {}): void {
  console.error(`[demo-access][${phase}] Error:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
    timestamp: new Date().toISOString()
  })
}

/**
 * Generate HTML email with demo credentials
 */
function generateDemoWelcomeEmail(
  fullName: string,
  demoEmail: string,
  demoPassword: string,
  loginUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your PipeTrak Demo Access</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #1e293b; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">PipeTrak</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px;">Welcome to PipeTrak, ${fullName}!</h2>

              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                You're all set to explore PipeTrak's pipe tracking capabilities with real construction data. Use the credentials below to access the demo project.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 16px; font-weight: 600;">Your Demo Credentials</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 80px;">Email:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-family: monospace; font-weight: 600;">${demoEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Password:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-family: monospace; font-weight: 600;">${demoPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                  Login to Demo
                </a>
              </div>

              <p style="margin: 0 0 16px; color: #64748b; font-size: 14px; line-height: 1.6;">
                <strong>What you can explore:</strong>
              </p>
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #64748b; font-size: 14px; line-height: 1.8;">
                <li>Dashboard with real-time progress metrics</li>
                <li>Component tracking with milestone updates</li>
                <li>Drawing and weld log management</li>
                <li>Test package tracking and reporting</li>
                <li>Export reports to PDF and Excel</li>
              </ul>

              <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                <em>Note: This is a shared demo environment. Data resets nightly at midnight UTC.</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
                Questions? Reply to this email or contact us at <a href="mailto:info@pipetrak.co" style="color: #2563eb; text-decoration: none;">info@pipetrak.co</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info'
      }
    })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const startTime = Date.now()

    // Parse request body
    const body = await req.json()

    // 1. Validate input
    const validationErrors = validateDemoAccessRequest(body)

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'VALIDATION_ERROR',
          message: validationErrors[0].message,
          field: validationErrors[0].field
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    const email = normalizeEmail(body.email)
    const fullName = normalizeFullName(body.full_name)

    // Get client metadata from headers
    const clientIp = req.headers.get('X-Forwarded-For') || req.headers.get('CF-Connecting-IP') || 'unknown'
    const userAgent = req.headers.get('User-Agent') || 'unknown'
    const referrer = req.headers.get('Referer') || null

    // Extract UTM parameters if present
    const utmSource = body.utm_source || null
    const utmMedium = body.utm_medium || null
    const utmCampaign = body.utm_campaign || null

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 2. Check rate limits
    const rateLimitResult = await checkRateLimits(supabase, email, clientIp)

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: rateLimitResult.message,
          retry_after: rateLimitResult.retryAfter,
          limit_type: rateLimitResult.limitType
        }),
        { status: 429, headers: corsHeaders }
      )
    }

    // 3. Log rate limit event for tracking
    await logRateLimitEvent(supabase, email, clientIp, {
      user_agent: userAgent,
      referrer: referrer
    })

    // 4. Store lead in demo_leads table
    const { error: leadError } = await supabase
      .from('demo_leads')
      .insert({
        email,
        full_name: fullName,
        ip_address: clientIp,
        user_agent: userAgent,
        referrer: referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign
      })

    if (leadError) {
      // Log error but don't fail the request - lead capture is non-critical
      logError('LEAD_CAPTURE', leadError, { email })
    } else {
      console.log('[demo-access] Lead captured successfully:', { email })
    }

    // 5. Verify required config is set
    if (!DEMO_ACCOUNT_PASSWORD) {
      logError('CONFIG_MISSING', 'DEMO_PASSWORD environment variable not set')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'DEMO_UNAVAILABLE',
          message: 'Demo is temporarily unavailable. Please try again later or contact support.'
        }),
        { status: 503, headers: corsHeaders }
      )
    }

    if (!RESEND_API_KEY) {
      logError('CONFIG_MISSING', 'RESEND_API_KEY environment variable not set')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'DEMO_UNAVAILABLE',
          message: 'Demo is temporarily unavailable. Please try again later or contact support.'
        }),
        { status: 503, headers: corsHeaders }
      )
    }

    // 6. Build login URL with pre-filled credentials
    // Always use production URL for email links
    const baseUrl = 'https://pipetrak.co'
    const loginUrl = `${baseUrl}/login?demo=true&email=${encodeURIComponent(DEMO_ACCOUNT_EMAIL)}&password=${encodeURIComponent(DEMO_ACCOUNT_PASSWORD)}`

    // 7. Send welcome email with demo credentials
    const emailHtml = generateDemoWelcomeEmail(fullName, DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD, loginUrl)

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
        to: email,
        subject: 'Your PipeTrak Demo Access',
        html: emailHtml
      })
    })

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text()
      logError('EMAIL_SEND', `HTTP ${emailResponse.status}: ${emailResponse.statusText}`, {
        status: emailResponse.status,
        body: errorBody,
        recipientEmail: email
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'EMAIL_FAILED',
          message: 'Failed to send demo credentials. Please try again.'
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    const duration = Date.now() - startTime
    console.log('[demo-access] Welcome email sent successfully:', {
      recipientEmail: email,
      duration_ms: duration
    })

    // 8. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo credentials sent! Check your email.',
        email_sent_to: email,
        duration_ms: duration
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    logError('UNHANDLED', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again or contact support.'
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
