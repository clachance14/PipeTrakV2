import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')

if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')

    if (!email) {
      return new Response(
        htmlResponse('Missing Email', 'Please provide an email address.'),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Check if user exists and is demo user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, is_demo_user, demo_expires_at')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return new Response(
        htmlResponse('User Not Found', 'No account found with this email address.'),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Check if demo has expired
    if (user.is_demo_user && user.demo_expires_at) {
      const expiresAt = new Date(user.demo_expires_at)
      if (expiresAt < new Date()) {
        return new Response(
          htmlResponse('Demo Expired', 'Your demo access has expired. Please sign up for a new demo.'),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        )
      }
    }

    // Rate limiting: Check recent requests (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('rate_limit_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'resend_magic_link')
      .eq('identifier_type', 'email')
      .eq('identifier_value', email.toLowerCase())
      .gte('created_at', oneHourAgo)

    if (count && count >= 3) {
      return new Response(
        htmlResponse('Rate Limit Exceeded', 'Too many requests. Please wait an hour before requesting another link.'),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Log rate limit event
    await supabase.from('rate_limit_events').insert({
      event_type: 'resend_magic_link',
      identifier_type: 'email',
      identifier_value: email.toLowerCase(),
      metadata: {
        user_agent: req.headers.get('User-Agent') || 'unknown'
      }
    })

    // Generate new magic link
    const baseUrl = url.origin
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${baseUrl}/dashboard`
      }
    })

    if (linkError || !linkData) {
      console.error('Magic link generation error:', linkError)
      return new Response(
        htmlResponse('Error', 'Failed to generate login link. Please try again.'),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    const magicLinkUrl = linkData.properties.action_link

    // Send email via Resend
    const emailHtml = generateSimpleEmailHtml(user.full_name || 'User', magicLinkUrl, user.demo_expires_at)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
        to: email,
        subject: 'Your New PipeTrak Login Link',
        html: emailHtml
      })
    })

    if (!response.ok) {
      console.error('Resend API error:', await response.text())
      return new Response(
        htmlResponse('Email Error', 'Failed to send email. Please try again.'),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Success - show confirmation page
    return new Response(
      htmlResponse(
        'Check Your Email!',
        `We've sent a new login link to <strong>${email}</strong>. Check your inbox and click the link to access your demo.`
      ),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      htmlResponse('Error', 'An unexpected error occurred. Please try again later.'),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )
  }
})

function htmlResponse(title: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - PipeTrak</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      max-width: 500px;
      text-align: center;
    }
    h1 {
      color: #2563eb;
      margin-bottom: 20px;
    }
    p {
      color: #4b5563;
      font-size: 16px;
      line-height: 1.6;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📧</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `.trim()
}

function generateSimpleEmailHtml(fullName: string, magicLinkUrl: string, demoExpiresAt: string | null): string {
  const expiryText = demoExpiresAt
    ? `Your demo access is valid until ${new Date(demoExpiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      })}.`
    : ''

  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Your New Login Link</h1>
  
  <p>Hi ${fullName},</p>
  
  <p>Click the button below to access your PipeTrak demo:</p>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="${magicLinkUrl}"
       style="background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
      Access Your Demo →
    </a>
  </div>
  
  ${expiryText ? `<p style="color: #6b7280; font-size: 14px;">${expiryText}</p>` : ''}
  
  <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
    Questions? Reply to this email or visit
    <a href="https://pipetrak.co" style="color: #2563eb;">pipetrak.co</a>
  </p>
</body>
</html>
  `.trim()
}
