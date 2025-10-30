# Custom Demo Signup Emails via Resend

**Date:** 2025-10-29
**Feature:** Custom demo signup emails with marketing content
**Related Spec:** 021-public-homepage (enhancement)

## Overview

Replace Supabase's default magic link email with custom-branded emails sent via Resend for demo user signups. Include welcome message, quick start guide, and maintain Supabase Auth magic link flow.

## Problem Statement

Currently, demo users receive Supabase's generic magic link email with no branding or guidance. This misses an opportunity to:
- Welcome users with brand introduction
- Guide users on what to explore first in the demo
- Create a professional first impression

## Goals

1. Send custom-branded emails via Resend for demo signups
2. Include welcome message with PipeTrak value proposition
3. Provide "What to Explore First" quick start guide
4. Maintain existing Supabase Auth magic link security
5. Keep email template easily editable for future changes

## Non-Goals

- Customizing emails for non-demo user flows (login, password reset, etc.)
- Complex email template systems or visual builders
- Tracking email open rates or click-through analytics (can be added later)
- Replacing Supabase SMTP globally

## Architecture

### Approach: Generate Token in Edge Function + Call Resend API

**Flow:**
```
1. User submits demo signup form
2. demo-signup Edge Function creates user/org/project
3. Generate magic link using supabase.auth.admin.generateLink()
4. Call Resend API with custom HTML email template
5. Return success to client
```

**Why This Approach:**
- All logic stays in one place (demo-signup function)
- Full control over email content and timing
- Supabase Auth handles token verification automatically
- No webhook configuration needed
- Only affects demo signups, not other auth flows

**Alternatives Considered:**
1. **Supabase Auth Webhook → Edge Function → Resend** - More complex setup, requires webhook config, adds extra hop
2. **Replace Supabase SMTP globally** - Affects all auth emails, less control, requires Supabase dashboard config

## Email Template Design

### Content Structure

**Simple HTML + Text Format:**

1. **Header:** "Welcome to PipeTrak!"
2. **Welcome Message:** Brand introduction and value proposition
3. **CTA Button:** "Access Your Demo Project →" (magic link)
4. **Quick Start Guide:**
   - Progress Dashboard - 200 sample components
   - Drawing Table - 20 test drawings
   - Test Packages - 10 pre-configured packages
   - Team Management - Try inviting members
5. **Footer:** Support contact and pipetrak.co link

### Template Variables

- `{{fullName}}` - User's name from signup form
- `{{magicLinkUrl}}` - Generated Supabase magic link
- `{{expiryDate}}` - Demo expiration date (7 days, formatted)

### File Organization

```
/supabase/functions/demo-signup/
  ├── index.ts              # Main function (modified)
  ├── email-template.ts     # NEW: generateDemoEmailHtml()
  ├── validation.ts         # Existing
  ├── rate-limiter.ts       # Existing
  └── demo-template.ts      # Existing
```

## Implementation Changes

### 1. Environment Configuration

**Add Resend API Key:**
```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**Update .env.example:**
```bash
RESEND_API_KEY=re_your_resend_api_key_here
```

### 2. Modify demo-signup/index.ts

**Add environment variable (line 14):**
```typescript
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
```

**Replace signInWithOtp() call (lines 208-220):**
```typescript
// OLD:
await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${origin}/dashboard` }
})

// NEW:
// Generate magic link token
const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: {
    redirectTo: `${req.headers.get('origin') || 'https://pipetrak.co'}/dashboard`
  }
})

if (linkError || !linkData) {
  console.error('Error generating magic link:', linkError)
  throw new Error('Failed to generate magic link')
}

const magicLinkUrl = linkData.properties.action_link

// Send custom email via Resend
const emailResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'PipeTrak Demo <demo@pipetrak.co>',
    to: email,
    subject: 'Welcome to Your PipeTrak Demo!',
    html: generateDemoEmailHtml(fullName, magicLinkUrl, demoExpiresAt)
  })
})

const emailSent = emailResponse.ok

if (!emailResponse.ok) {
  console.error('Resend API error:', await emailResponse.text())
  // Don't fail the request - user account is created
}
```

### 3. Create email-template.ts

**New file:** `/supabase/functions/demo-signup/email-template.ts`

```typescript
/**
 * Generate HTML email template for demo signup
 *
 * @param fullName - User's full name from signup form
 * @param magicLinkUrl - Supabase magic link URL for authentication
 * @param demoExpiresAt - ISO timestamp of demo expiration (7 days)
 * @returns HTML email string
 */
export function generateDemoEmailHtml(
  fullName: string,
  magicLinkUrl: string,
  demoExpiresAt: string
): string {
  const expiryDate = new Date(demoExpiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <h1 style="color: #2563eb;">Welcome to PipeTrak!</h1>

  <!-- Welcome message with brand intro -->
  <p>Hi ${fullName},</p>
  <p>
    Thanks for trying PipeTrak! We're the industrial pipe tracking system designed
    for brownfield construction projects. Track component progress, manage milestones,
    and keep your entire team in sync.
  </p>

  <!-- Magic link CTA -->
  <div style="margin: 30px 0;">
    <a href="${magicLinkUrl}"
       style="background: #2563eb; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 6px; display: inline-block;">
      Access Your Demo Project →
    </a>
  </div>

  <!-- Quick start guide -->
  <h2 style="color: #1e40af; font-size: 18px;">What to Explore First:</h2>
  <ul>
    <li><strong>Progress Dashboard</strong> - See your 200 sample components with milestone tracking</li>
    <li><strong>Drawing Table</strong> - Explore the 20 test drawings with component assignments</li>
    <li><strong>Test Packages</strong> - Review the 10 pre-configured test packages</li>
    <li><strong>Team Management</strong> - Try inviting team members to collaborate</li>
  </ul>

  <!-- Footer -->
  <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
    Questions? Reply to this email or visit
    <a href="https://pipetrak.co">pipetrak.co</a>
  </p>

</body>
</html>
  `.trim()
}
```

**Import in index.ts:**
```typescript
import { generateDemoEmailHtml } from './email-template.ts'
```

## Error Handling

### Critical Errors (Fail Signup)

1. **Missing RESEND_API_KEY** - Function startup fails
2. **Magic link generation fails** - Cleanup user/org/project, throw error

### Non-Critical Errors (Log but Continue)

1. **Resend API fails** - Log error, set `email_sent: false`, allow signup to complete
   - User account exists, can request new magic link via login page

### Error Logging

```typescript
// Magic link generation failure
if (linkError || !linkData) {
  console.error('Error generating magic link:', linkError)
  // Cleanup logic
  await supabase.auth.admin.deleteUser(authUser.user.id)
  throw new Error('Failed to generate magic link')
}

// Resend API failure
if (!emailResponse.ok) {
  console.error('Resend API error:', await emailResponse.text())
  // Continue - user can request new link
}
```

## Deployment Plan

### Step 1: Verify Resend Configuration
- Ensure `demo@pipetrak.co` is verified sender in Resend dashboard
- Or use `onboarding@resend.dev` for testing

### Step 2: Set Environment Secret
```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Step 3: Deploy Edge Function
```bash
npx supabase functions deploy demo-signup
```

### Step 4: Test End-to-End
1. Submit demo signup on homepage
2. Verify custom email received with proper formatting
3. Click magic link → redirect to `/dashboard`
4. Confirm demo project visible with sample data

### Step 5: Monitor
- Check Edge Function logs: `npx supabase functions logs demo-signup`
- Verify Resend delivery dashboard for email status

## Rollback Plan

If issues occur:
1. Revert commit to restore `signInWithOtp()` call
2. Redeploy Edge Function: `npx supabase functions deploy demo-signup`
3. Investigate Resend API errors in logs

## Future Enhancements

### Phase 2 (Optional)
- Email open/click tracking via Resend webhooks
- A/B testing different email content
- Drip campaign for demo users (day 3, day 6 reminders)
- HTML email template builder for non-developers

### Phase 3 (Optional)
- Extend custom emails to all auth flows (login, password reset)
- Supabase Auth webhook integration for global email customization

## Testing

### Manual Testing Checklist
- [ ] Demo signup sends email via Resend
- [ ] Email contains all content sections (welcome, CTA, quick start, footer)
- [ ] Magic link redirects to `/dashboard` with authenticated session
- [ ] Demo project visible with sample data
- [ ] Error handling: Invalid email format rejected
- [ ] Error handling: Rate limit blocks excessive signups
- [ ] Error handling: Resend API failure doesn't break signup

### Edge Cases
- [ ] Missing RESEND_API_KEY throws startup error
- [ ] Invalid magic link shows error page
- [ ] Expired magic link prompts new login
- [ ] Special characters in fullName render correctly in email

## Success Metrics

- Demo signup completion rate (target: >80%)
- Email delivery rate via Resend (target: >95%)
- Magic link click-through rate (baseline to establish)
- Demo user engagement with suggested features

## Documentation Updates

- [ ] Update Feature 021 implementation notes with Resend integration
- [ ] Document email template editing process in CLAUDE.md
- [ ] Add Resend API key to .env.example

## Open Questions

None - design validated and ready for implementation.

## Sign-off

- [x] Architecture approach validated
- [x] Email content approved
- [x] Error handling defined
- [x] Deployment plan clear
- [x] Ready for implementation planning
