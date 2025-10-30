# Research: Custom Demo Signup Emails via Resend

**Feature**: Custom Demo Signup Emails
**Date**: 2025-10-29
**Status**: Complete

## Research Questions

All technical decisions were resolved during the brainstorming phase (2025-10-29) and documented in `docs/plans/2025-10-29-custom-demo-signup-emails-design.md`.

## Decision 1: Email Delivery Provider

**Decision**: Use Resend API for transactional email delivery

**Rationale**:
- User already has Resend account with API key configured
- Resend is designed for transactional emails (vs marketing-focused alternatives)
- Simple REST API integration (no SDK required for Deno)
- Excellent delivery rates (>99% typical)
- Modern developer experience with TypeScript-friendly API

**Alternatives Considered**:
1. **Supabase default SMTP** - Rejected: Generic emails with no branding or guidance
2. **SendGrid** - Not considered: User already using Resend
3. **AWS SES** - Not considered: More complex setup, user already using Resend

**References**:
- [Resend API Documentation](https://resend.com/docs/api-reference/emails/send-email)
- [Resend Pricing](https://resend.com/pricing) - 100 emails/day free tier, 3,000 emails/month on paid tier

## Decision 2: Magic Link Generation Method

**Decision**: Use `supabase.auth.admin.generateLink()` API to create magic link tokens

**Rationale**:
- Official Supabase Auth Admin API for token generation
- Returns complete magic link URL with proper token format
- Security handled by Supabase (token signing, expiration, validation)
- Same authentication flow as current `signInWithOtp()` implementation
- No custom token generation needed

**Alternatives Considered**:
1. **Supabase Auth Webhook** - Rejected: More complex, requires webhook configuration, extra network hop
2. **Custom auth token** - Rejected: Security risk, reinventing the wheel, adds complexity
3. **Direct link without email verification** - Rejected: Security concern, violates email verification requirement

**References**:
- [Supabase Auth Admin API - generateLink()](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [Supabase Magic Link Docs](https://supabase.com/docs/guides/auth/auth-magic-link)

## Decision 3: Email Template Format

**Decision**: Simple HTML template with inline styles (no external CSS or images)

**Rationale**:
- User preference for "Simple text + basic HTML" over complex templates
- Better email client compatibility (Gmail, Outlook, Apple Mail)
- Faster rendering and smaller payload size (~5KB vs 50KB+ for rich templates)
- Easier to edit for non-designers (plain HTML in TypeScript string)
- No external asset dependencies (fonts, images, CSS files)

**Alternatives Considered**:
1. **Rich HTML with full branding** - Rejected: User preference for simplicity, harder to maintain
2. **Plain text only** - Rejected: Less engaging, no CTA button, harder to read structure
3. **React Email or MJML** - Rejected: Overkill for simple template, adds build complexity

**Best Practices Applied**:
- Inline styles only (no `<style>` blocks or external CSS)
- Max width 600px for email client compatibility
- Sans-serif font stack for universal support
- Adequate whitespace and color contrast (WCAG 2.1 AA)
- Single-column layout for mobile compatibility

**References**:
- [Email HTML Best Practices (Resend)](https://resend.com/docs/dashboard/emails/html-best-practices)
- [Can I Email - CSS Support Matrix](https://www.caniemail.com/)

## Decision 4: Email Content Structure

**Decision**: Include welcome message, value proposition, quick start guide, CTA button, and footer

**Content Sections** (validated with user during brainstorming):
1. **Header**: "Welcome to PipeTrak!" (h1)
2. **Welcome Message**: Personalized greeting + brand introduction (2-3 sentences)
3. **CTA Button**: "Access Your Demo Project →" (primary action, contains magic link)
4. **Quick Start Guide**: "What to Explore First" with 4 bulleted features:
   - Progress Dashboard (200 sample components)
   - Drawing Table (20 test drawings)
   - Test Packages (10 pre-configured packages)
   - Team Management (invite collaborators)
5. **Footer**: Support contact + pipetrak.co link

**Rationale**:
- User explicitly requested: welcome message, brand intro, quick start guide
- User explicitly rejected: limitation messaging (what's NOT available in demo)
- Quick start guide reduces time-to-value by directing users to key features
- CTA button above the fold ensures magic link is immediately visible

**Personalization Variables**:
- `fullName` - User's name from signup form (personalized greeting)
- `magicLinkUrl` - Supabase magic link with auth token
- `expiryDate` - Demo expiration date (formatted for readability)

## Decision 5: Error Handling Strategy

**Decision**: Non-critical failure for email delivery (log error, don't block signup)

**Rationale**:
- User account and demo project already created successfully
- Email delivery failure shouldn't prevent user from accessing demo
- User can request new magic link via login page ("Forgot password" flow)
- Better user experience than failing entire signup

**Error Categories**:
1. **Critical (Fail Signup)**:
   - Missing RESEND_API_KEY → Function startup failure
   - Magic link generation failure → Cleanup user/org/project, throw error
2. **Non-Critical (Log and Continue)**:
   - Resend API failure → Log error, set `email_sent: false`, allow signup

**Monitoring**:
- Log all Resend API errors with response body for debugging
- Track email delivery rate via Supabase Edge Function logs
- Monitor Resend delivery dashboard for bounce/spam reports

## Implementation Notes

### Environment Configuration
```bash
# Set Resend API key in Supabase Edge Function secrets
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Email Template Storage
- File: `supabase/functions/demo-signup/email-template.ts`
- Function: `generateDemoEmailHtml(fullName, magicLinkUrl, demoExpiresAt)`
- Returns: HTML string with template variables interpolated

### Testing Strategy
1. **Unit Test**: Verify email template renders with correct variables
2. **Integration Test**: Verify Resend API call with mocked response
3. **E2E Test**: Manual verification of complete signup → email delivery → magic link flow

### Deployment Steps
1. Verify `demo@pipetrak.co` sender verified in Resend dashboard
2. Set RESEND_API_KEY secret: `npx supabase secrets set RESEND_API_KEY=...`
3. Deploy Edge Function: `npx supabase functions deploy demo-signup`
4. Test signup flow end-to-end
5. Monitor logs: `npx supabase functions logs demo-signup`

## Open Questions

None - All design decisions validated during brainstorming session.

## References

- **Design Document**: `docs/plans/2025-10-29-custom-demo-signup-emails-design.md`
- **Feature Spec**: `specs/021-public-homepage/spec.md` (FR-027 through FR-035)
- **Resend API Docs**: https://resend.com/docs/api-reference/emails/send-email
- **Supabase Auth Admin API**: https://supabase.com/docs/reference/javascript/auth-admin-generatelink
- **Existing Edge Function**: `supabase/functions/demo-signup/index.ts` (lines 208-220)

## Research Completion

✅ All technical decisions documented and validated
✅ No additional research required
✅ Ready to proceed to Phase 1 (Design & Contracts)
