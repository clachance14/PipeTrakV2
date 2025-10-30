# Resend API Contract

**Feature**: Custom Demo Signup Emails
**Service**: Resend Email API
**Version**: v1 (2024)
**Base URL**: `https://api.resend.com`

## Overview

Contract for Resend API integration in the `demo-signup` Edge Function. Used to send custom-branded emails with magic links for demo user signups.

## Authentication

**Method**: Bearer token in `Authorization` header

```http
Authorization: Bearer ${RESEND_API_KEY}
```

**API Key Storage**: Supabase Edge Function secrets (not in code or `.env`)

**Setup Command**:
```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

## Endpoint: Send Email

### Request

**Method**: `POST`
**Path**: `/emails`
**Content-Type**: `application/json`

**Request Body**:
```typescript
interface SendEmailRequest {
  from: string       // Verified sender (e.g., "PipeTrak Demo <demo@pipetrak.co>")
  to: string | string[]  // Recipient email(s)
  subject: string    // Email subject line
  html?: string      // HTML email content
  text?: string      // Plain text fallback (optional)
  reply_to?: string  // Reply-to address (optional)
  tags?: {           // Custom tags for tracking (optional)
    name: string
    value: string
  }[]
}
```

**Example Request** (Demo Signup):
```json
{
  "from": "PipeTrak Demo <demo@pipetrak.co>",
  "to": "prospect@example.com",
  "subject": "Welcome to Your PipeTrak Demo!",
  "html": "<html><body>...</body></html>"
}
```

### Response

**Success Response** (HTTP 200):
```typescript
interface SendEmailResponse {
  id: string  // Email ID (e.g., "re_abc123xyz")
}
```

**Example Success**:
```json
{
  "id": "re_4zKfmP9qB3Ji1rFjYK9DcM2S"
}
```

**Error Response** (HTTP 4xx/5xx):
```typescript
interface ResendError {
  statusCode: number
  name: string       // Error type (e.g., "validation_error", "missing_required_field")
  message: string    // Human-readable error description
}
```

**Example Errors**:

1. **Unverified Sender** (HTTP 403):
```json
{
  "statusCode": 403,
  "name": "forbidden",
  "message": "The sender email address is not verified"
}
```

2. **Invalid Recipient** (HTTP 422):
```json
{
  "statusCode": 422,
  "name": "validation_error",
  "message": "Invalid recipient email address"
}
```

3. **Rate Limit Exceeded** (HTTP 429):
```json
{
  "statusCode": 429,
  "name": "rate_limit_exceeded",
  "message": "Daily email limit reached"
}
```

4. **Missing API Key** (HTTP 401):
```json
{
  "statusCode": 401,
  "name": "unauthorized",
  "message": "Invalid API key"
}
```

## Rate Limits

| Plan | Daily Limit | Monthly Limit |
|------|-------------|---------------|
| Free | 100 emails  | 3,000 emails  |
| Paid | Custom      | Custom        |

**Enforcement**: Resend API returns HTTP 429 when limit exceeded

**Retry Strategy**: Do NOT retry on 429 (user rate limited, not transient error)

## Validation Rules

### Sender Address (`from`)
- ✅ Must be verified in Resend dashboard (Settings → Domains)
- ✅ Can use display name format: `"Display Name <email@domain.com>"`
- ❌ Cannot use unverified addresses (returns 403)

### Recipient Address (`to`)
- ✅ Must be valid email format (RFC 5322)
- ✅ Can send to multiple recipients (array of strings)
- ❌ Cannot exceed 50 recipients per email

### Email Content
- ✅ HTML email size must be <1MB
- ✅ Inline styles recommended for email client compatibility
- ✅ Plain text fallback (`text` field) recommended but optional

## Error Handling Strategy

### Critical Errors (Fail Startup)
- **Missing RESEND_API_KEY**: Check at Edge Function initialization, throw error

### Non-Critical Errors (Log and Continue)
- **Resend API failure (4xx/5xx)**: Log error with response body, set `email_sent: false`, allow signup to complete
- **Rationale**: User account already created successfully, can request new magic link via login

**Error Logging Example**:
```typescript
if (!emailResponse.ok) {
  const errorBody = await emailResponse.text()
  console.error('Resend API error:', {
    status: emailResponse.status,
    statusText: emailResponse.statusText,
    body: errorBody,
    email: email,  // Log for debugging (PII, handle carefully)
    timestamp: new Date().toISOString()
  })
  // Continue, don't throw
}
```

## Implementation Example

```typescript
// In demo-signup Edge Function
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

// ... after user/org/project creation, magic link generation ...

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
  // Don't fail signup - user can request new link
}

return new Response(JSON.stringify({
  success: true,
  email_sent: emailSent,
  // ... other response fields
}))
```

## Testing Strategy

### Unit Tests
- Mock `fetch()` to return success/error responses
- Verify correct request payload structure
- Verify error handling doesn't throw

### Integration Tests
- Test with Resend API in staging environment
- Verify email delivery to test inbox
- Verify email renders correctly in email clients

### E2E Tests (Manual)
- Complete signup flow → check inbox for email
- Click magic link → verify redirect to dashboard
- Test error scenarios (invalid sender, rate limit)

## Monitoring & Observability

### Metrics to Track
- Email delivery rate (success vs failure)
- Resend API response times
- Rate limit violations (429 responses)

### Logs to Capture
- Each Resend API call (email, status, duration)
- All error responses (status, body, email)
- Rate limit events

### Dashboard
- Resend Dashboard → Analytics → View email delivery stats
- Resend Dashboard → Logs → View individual email events

## Security Considerations

### API Key Protection
- ✅ Store in Supabase Edge Function secrets (encrypted at rest)
- ❌ Never commit to git or include in client-side code
- ❌ Never log API key value in error messages

### Email Content Security
- ✅ Email template is static HTML (no user-generated content)
- ✅ Magic link token generated by Supabase Auth (secure signing)
- ❌ No XSS risk (template variables escaped by TypeScript template literals)

### Sender Verification
- ✅ Resend enforces SPF/DKIM/DMARC on verified domains
- ✅ Prevents email spoofing and improves deliverability
- ✅ Reduces spam complaints

## Performance Targets

| Metric | Target | Expected |
|--------|--------|----------|
| API Response Time | <2 seconds | 500ms-1s |
| Email Delivery Time | <2 minutes | 10-30 seconds |
| Template Generation | <100ms | ~10ms |

## References

- **Resend API Docs**: https://resend.com/docs/api-reference/emails/send-email
- **Resend Dashboard**: https://resend.com/dashboard
- **Email Best Practices**: https://resend.com/docs/dashboard/emails/html-best-practices
- **Feature Spec**: `specs/021-public-homepage/spec.md` (FR-027 through FR-035)
- **Design Doc**: `docs/plans/2025-10-29-custom-demo-signup-emails-design.md`

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2025-10-29 | 1.0 | Initial contract for demo signup email integration |
