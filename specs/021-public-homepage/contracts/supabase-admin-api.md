# Supabase Auth Admin API Contract

**Feature**: Custom Demo Signup Emails
**Service**: Supabase Auth Admin API
**Method**: `admin.generateLink()`
**Purpose**: Generate magic link tokens for custom email delivery

## Overview

Contract for Supabase Auth Admin API used to generate magic link authentication tokens in the `demo-signup` Edge Function. Tokens are embedded in custom Resend emails instead of using Supabase's default email delivery.

## Authentication

**Method**: Service role key (automatically available in Edge Functions)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**Security**: Service role key has full database access (bypasses RLS). Only use in server-side code.

## Method: admin.generateLink()

### Request

**Method**: `supabase.auth.admin.generateLink(params)`

**Parameters**:
```typescript
interface GenerateLinkParams {
  type: 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change_email_new' | 'email_change_email_current'
  email: string
  options?: {
    redirectTo?: string           // URL to redirect after authentication
    data?: Record<string, any>    // User metadata (optional)
  }
}
```

**Example Request** (Demo Signup):
```typescript
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: 'prospect@example.com',
  options: {
    redirectTo: 'https://pipetrak.co/dashboard'
  }
})
```

### Response

**Success Response**:
```typescript
interface GenerateLinkResponse {
  data: {
    properties: {
      action_link: string          // Complete magic link URL with token
      email_otp: string            // OTP code (not used for magic links)
      hashed_token: string         // Token hash (for verification)
      redirect_to: string          // Redirect URL from request
      verification_type: string    // Type of verification (e.g., "magiclink")
    }
    user: {
      id: string                   // User UUID
      email: string                // User email
      // ... other user fields
    }
  }
  error: null
}
```

**Example Success**:
```json
{
  "data": {
    "properties": {
      "action_link": "https://abc123.supabase.co/auth/v1/verify?token=xyz789&type=magiclink&redirect_to=https://pipetrak.co/dashboard",
      "email_otp": "",
      "hashed_token": "hashed_token_value",
      "redirect_to": "https://pipetrak.co/dashboard",
      "verification_type": "magiclink"
    },
    "user": {
      "id": "uuid-here",
      "email": "prospect@example.com",
      ...
    }
  },
  "error": null
}
```

**Error Response**:
```typescript
interface GenerateLinkError {
  data: null
  error: {
    message: string       // Error description
    status: number        // HTTP status code
  }
}
```

**Common Errors**:

1. **User Not Found** (when type != 'signup'):
```json
{
  "data": null,
  "error": {
    "message": "User not found",
    "status": 404
  }
}
```

2. **Invalid Email Format**:
```json
{
  "data": null,
  "error": {
    "message": "Invalid email format",
    "status": 400
  }
}
```

3. **Missing Service Role Key**:
```json
{
  "data": null,
  "error": {
    "message": "Unauthorized",
    "status": 401
  }
}
```

## Magic Link Token Properties

### Token Structure

The `action_link` contains a complete URL with authentication token:

```
https://{project_ref}.supabase.co/auth/v1/verify?token={token}&type=magiclink&redirect_to={redirect_url}
```

**Components**:
- `{project_ref}`: Supabase project identifier
- `{token}`: Signed authentication token (JWT)
- `type`: Verification type (always "magiclink" for our use case)
- `redirect_to`: URL to redirect after successful authentication

### Token Security

- **Signed**: Token is cryptographically signed by Supabase Auth
- **Single-use**: Token is invalidated after first use
- **Time-limited**: Token expires after 24 hours (Supabase default)
- **User-bound**: Token is associated with specific user email

### Token Validation

Token validation is handled automatically by Supabase Auth when user clicks the magic link:

1. User clicks magic link in email
2. Browser navigates to `https://{project}.supabase.co/auth/v1/verify?...`
3. Supabase Auth validates token signature and expiration
4. If valid: Creates authenticated session and redirects to `redirect_to` URL
5. If invalid: Shows error page with message

## Error Handling Strategy

### Critical Errors (Fail Signup)

**Magic link generation failure**: Cleanup user/org/project and throw error

```typescript
const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: `${origin}/dashboard` }
})

if (linkError || !linkData) {
  console.error('Error generating magic link:', linkError)

  // Cleanup: delete user, org, project
  await supabase.auth.admin.deleteUser(authUser.user.id)
  await supabase.from('organizations').delete().eq('id', org.id)

  throw new Error('Failed to generate magic link')
}
```

**Rationale**: Without a valid magic link, user cannot access their demo account. Better to fail signup and prompt retry than create an inaccessible account.

## Implementation Example

```typescript
// In demo-signup Edge Function (after user/org/project creation)

// 1. Generate magic link token
const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: email,
  options: {
    redirectTo: `${req.headers.get('origin') || 'https://pipetrak.co'}/dashboard`
  }
})

if (linkError || !linkData) {
  console.error('Error generating magic link:', linkError)
  // Cleanup logic...
  throw new Error('Failed to generate magic link')
}

// 2. Extract magic link URL
const magicLinkUrl = linkData.properties.action_link

// 3. Use in custom email template
const html = generateDemoEmailHtml(fullName, magicLinkUrl, demoExpiresAt)

// 4. Send via Resend
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'PipeTrak Demo <demo@pipetrak.co>',
    to: email,
    subject: 'Welcome to Your PipeTrak Demo!',
    html
  })
})
```

## Testing Strategy

### Unit Tests
- Mock `admin.generateLink()` to return success/error responses
- Verify error handling with cleanup logic
- Verify magic link URL extraction

### Integration Tests
- Generate real magic link in staging environment
- Verify token structure and components
- Verify link redirects to correct URL after auth

### E2E Tests (Manual)
- Complete signup flow with magic link generation
- Click magic link in email → verify redirect to dashboard
- Verify authenticated session created
- Test expired token (wait 24 hours) → should show error

## Performance Targets

| Metric | Target | Expected |
|--------|--------|----------|
| API Response Time | <500ms | 100-200ms |
| Token Generation | <100ms | ~50ms |

## Security Considerations

### Service Role Key Protection
- ✅ Only used in Edge Functions (server-side)
- ❌ Never expose to client-side code
- ❌ Never log in error messages

### Magic Link Security
- ✅ Token is cryptographically signed (prevents tampering)
- ✅ Single-use token (prevents replay attacks)
- ✅ 24-hour expiration (limits exposure window)
- ✅ User-bound token (cannot be used for different user)

### Redirect URL Validation
- ✅ Always use HTTPS for production redirects
- ✅ Validate redirect URL is within allowed domains (Supabase Auth settings)
- ❌ Never allow arbitrary redirect URLs (open redirect vulnerability)

## Comparison: generateLink() vs signInWithOtp()

| Feature | `signInWithOtp()` (Old) | `admin.generateLink()` (New) |
|---------|-------------------------|------------------------------|
| **Email Delivery** | Supabase default SMTP | Custom (Resend) |
| **Email Content** | Generic template | Custom branded template |
| **Token Generation** | Automatic | Manual (API call) |
| **Token Access** | Hidden (sent via email) | Exposed (via API response) |
| **Customization** | Limited | Full control |
| **Use Case** | Standard auth flows | Custom email integrations |

## References

- **Supabase Docs**: https://supabase.com/docs/reference/javascript/auth-admin-generatelink
- **Magic Link Guide**: https://supabase.com/docs/guides/auth/auth-magic-link
- **Auth Admin API**: https://supabase.com/docs/reference/javascript/auth-admin-api
- **Feature Spec**: `specs/021-public-homepage/spec.md` (FR-034)
- **Design Doc**: `docs/plans/2025-10-29-custom-demo-signup-emails-design.md`

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2025-10-29 | 1.0 | Initial contract for magic link generation in demo signup |
