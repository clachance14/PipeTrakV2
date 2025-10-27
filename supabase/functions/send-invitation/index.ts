// Edge Function: Send invitation email via Resend
// Feature: 002-user-registration-and
// Purpose: Send branded invitation emails with Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_API_URL = 'https://api.resend.com/emails'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationEmailRequest {
  email: string
  invitationLink: string
  role: string
  organizationName: string
  inviterName?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Edge Function invoked - checking API key...')

    // Verify API key is configured
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ API key found, length:', RESEND_API_KEY.length)

    // Parse request body
    const { email, invitationLink, role, organizationName, inviterName } = await req.json() as InvitationEmailRequest

    console.log('📨 Request payload:', { email, role, organizationName, inviterName, linkLength: invitationLink?.length })

    // Validate required fields
    if (!email || !invitationLink || !role || !organizationName) {
      console.error('❌ Missing required fields')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ All required fields present')

    // Format role for display
    const roleDisplay = role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    // Construct HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #0f172a;">
                You've been invited to join ${organizationName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #475569;">
                ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'} to join <strong>${organizationName}</strong> on PipeTrak as a <strong>${roleDisplay}</strong>.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #475569;">
                Click the button below to accept the invitation and create your account:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 24px 0;">
                    <a href="${invitationLink}" style="display: inline-block; padding: 12px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 20px; color: #64748b;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 20px; color: #3b82f6; word-break: break-all;">
                ${invitationLink}
              </p>

              <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; line-height: 20px; color: #92400e;">
                  <strong>⏰ This invitation expires in 7 days.</strong> Make sure to accept it before then!
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                This invitation was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                © ${new Date().getFullYear()} PipeTrak - Industrial Pipe Tracking System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    // Send email via Resend
    console.log('📤 Calling Resend API...')

    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PipeTrak <noreply@notifications.pipetrak.co>',
        to: [email],
        subject: `You've been invited to join ${organizationName} on PipeTrak`,
        html: htmlContent,
      }),
    })

    console.log('📥 Resend API response status:', resendResponse.status)

    const resendData = await resendResponse.json()
    console.log('📥 Resend API response data:', resendData)

    if (!resendResponse.ok) {
      console.error('❌ Resend API error:', resendData)
      return new Response(
        JSON.stringify({
          success: false,
          error: resendData.message || 'Failed to send email',
          details: resendData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Email sent successfully! Resend ID:', resendData.id)

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Unexpected error in Edge Function:', error)
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name || 'Unknown'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
