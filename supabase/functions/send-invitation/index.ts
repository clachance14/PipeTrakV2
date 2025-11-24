// Edge Function: Send invitation email via Resend
// Feature: 002-user-registration-and
// Purpose: Send branded invitation emails with Resend API
// Note: Email template editing restricted to owner (clachance14@hotmail.com)
//       Invitation sending available to admins and project managers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { generateInvitationEmailHtml, generateInvitationEmailSubject } from './email-template.ts'

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

    // Generate email content using template
    const htmlContent = generateInvitationEmailHtml(
      email,
      invitationLink,
      role,
      organizationName,
      inviterName
    )

    const emailSubject = generateInvitationEmailSubject(organizationName)

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
        subject: emailSubject,
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
