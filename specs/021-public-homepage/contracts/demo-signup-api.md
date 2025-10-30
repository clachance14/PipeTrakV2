# API Contract: Demo Signup

**Endpoint**: `POST /functions/v1/demo-signup`
**Type**: Supabase Edge Function
**Authentication**: Public (no auth required)
**Rate Limiting**: 10/hour per IP, 3/day per email

## Request

### Headers

```http
Content-Type: application/json
X-Forwarded-For: {client_ip}  # Automatically set by Supabase
```

### Body

```typescript
interface DemoSignupRequest {
  email: string;        // Required: Valid email format
  full_name: string;    // Required: 1-100 characters
}
```

### Example

```json
{
  "email": "john.doe@example.com",
  "full_name": "John Doe"
}
```

### Validation Rules

- **email**:
  - Required
  - Must be valid email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
  - Maximum 255 characters
  - Case-insensitive (normalized to lowercase)

- **full_name**:
  - Required
  - Minimum 1 character
  - Maximum 100 characters
  - Trimmed of leading/trailing whitespace

---

## Response

### Success (201 Created)

```typescript
interface DemoSignupSuccess {
  success: true;
  message: string;
  demo_user_id: string;        // UUID of created demo user
  demo_expires_at: string;     // ISO 8601 timestamp (NOW() + 7 days)
  email_sent: boolean;         // Whether confirmation email was delivered
}
```

**Example**:
```json
{
  "success": true,
  "message": "Demo account created successfully. Please check your email for the confirmation link.",
  "demo_user_id": "123e4567-e89b-12d3-a456-426614174000",
  "demo_expires_at": "2025-11-05T12:34:56.789Z",
  "email_sent": true
}
```

### Error Responses

#### 400 Bad Request - Invalid Input

```typescript
interface ValidationError {
  success: false;
  error: "VALIDATION_ERROR";
  message: string;
  field?: string;  // Which field failed validation
}
```

**Examples**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "field": "email"
}
```

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Full name is required",
  "field": "full_name"
}
```

#### 429 Too Many Requests - Rate Limit Exceeded

```typescript
interface RateLimitError {
  success: false;
  error: "RATE_LIMIT_EXCEEDED";
  message: string;
  retry_after: number;  // Seconds until rate limit resets
  limit_type: "ip" | "email";
}
```

**Examples**:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many signup attempts from this IP address. Please try again in 45 minutes.",
  "retry_after": 2700,
  "limit_type": "ip"
}
```

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "This email has reached the daily signup limit. Please try again tomorrow.",
  "retry_after": 82800,
  "limit_type": "email"
}
```

#### 409 Conflict - Email Already Exists

```typescript
interface EmailExistsError {
  success: false;
  error: "EMAIL_EXISTS";
  message: string;
  is_demo_user: boolean;
  demo_expires_at?: string;  // If existing user is a demo user
}
```

**Example**:
```json
{
  "success": false,
  "error": "EMAIL_EXISTS",
  "message": "This email already has an active demo account. Please check your email for the login link.",
  "is_demo_user": true,
  "demo_expires_at": "2025-11-02T10:15:30.000Z"
}
```

#### 500 Internal Server Error - Server Failure

```typescript
interface ServerError {
  success: false;
  error: "INTERNAL_ERROR";
  message: string;
  error_code?: string;  // Internal error tracking code
}
```

**Examples**:
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "Failed to create demo project. Please try again or contact support.",
  "error_code": "DEMO_CLONE_FAILED"
}
```

```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "Failed to send confirmation email. Please try again.",
  "error_code": "EMAIL_DELIVERY_FAILED"
}
```

---

## Business Logic Flow

### 1. Request Validation

```typescript
// Validate email format
if (!isValidEmail(email)) {
  return 400: VALIDATION_ERROR
}

// Validate full_name length
if (full_name.trim().length < 1 || full_name.length > 100) {
  return 400: VALIDATION_ERROR
}
```

### 2. Rate Limit Check

```typescript
// Check IP-based rate limit (10/hour)
const ipAttempts = await countRateLimitEvents({
  event_type: 'demo_signup',
  identifier_type: 'ip_address',
  identifier_value: clientIp,
  since: now() - 1 hour
});

if (ipAttempts >= 10) {
  return 429: RATE_LIMIT_EXCEEDED (ip)
}

// Check email-based rate limit (3/day)
const emailAttempts = await countRateLimitEvents({
  event_type: 'demo_signup',
  identifier_type: 'email',
  identifier_value: email.toLowerCase(),
  since: now() - 1 day
});

if (emailAttempts >= 3) {
  return 429: RATE_LIMIT_EXCEEDED (email)
}
```

### 3. Duplicate Email Check

```typescript
// Check if email already exists
const existingUser = await supabase
  .from('users')
  .select('id, is_demo_user, demo_expires_at')
  .eq('email', email.toLowerCase())
  .single();

if (existingUser) {
  if (existingUser.is_demo_user && existingUser.demo_expires_at > now()) {
    return 409: EMAIL_EXISTS (active demo)
  } else {
    return 409: EMAIL_EXISTS (regular user)
  }
}
```

### 4. Log Rate Limit Event

```typescript
// Log this attempt (before creating user)
await supabase.from('rate_limit_events').insert([
  { event_type: 'demo_signup', identifier_type: 'ip_address', identifier_value: clientIp },
  { event_type: 'demo_signup', identifier_type: 'email', identifier_value: email.toLowerCase() }
]);
```

### 5. Create Demo User

```typescript
// Create auth user via Supabase Auth
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  email_confirm: false,  // Will confirm via magic link
  user_metadata: {
    full_name: full_name.trim(),
    is_demo_user: true
  }
});

// Create public users record
const demo_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days
await supabase.from('users').insert({
  id: authUser.user.id,
  email: email.toLowerCase(),
  full_name: full_name.trim(),
  is_demo_user: true,
  demo_expires_at: demo_expires_at.toISOString()
});
```

### 6. Create Demo Organization & Project

```typescript
// Create isolated organization for demo user
const { data: org } = await supabase.from('organizations').insert({
  name: `Demo - ${full_name.trim()}`,
  owner_id: authUser.user.id
}).select().single();

// Update user with organization_id
await supabase.from('users').update({
  organization_id: org.id
}).eq('id', authUser.user.id);

// Create demo project
const { data: project } = await supabase.from('projects').insert({
  name: 'PipeTrak Demo Project',
  organization_id: org.id,
  created_by: authUser.user.id
}).select().single();
```

### 7. Clone Demo Data

```typescript
// Clone 200 components, 20 drawings, 10 packages from template
// Use bulk INSERT with batches of 50 records
await cloneDemoTemplate({
  projectId: project.id,
  organizationId: org.id,
  templateData: {
    components: 200,
    drawings: 20,
    packages: 10
  }
});
```

### 8. Send Confirmation Email

```typescript
// Send magic link email via Supabase Auth
const { error: emailError } = await supabase.auth.signInWithOtp({
  email: email.toLowerCase(),
  options: {
    emailRedirectTo: `${baseUrl}/dashboard`
  }
});

const email_sent = !emailError;
```

### 9. Return Success

```typescript
return 201: {
  success: true,
  message: "Demo account created successfully. Please check your email for the confirmation link.",
  demo_user_id: authUser.user.id,
  demo_expires_at: demo_expires_at.toISOString(),
  email_sent
}
```

---

## Performance Requirements

- **Rate limit query**: <10ms
- **User creation**: <500ms
- **Project cloning**: <8 seconds (230 records)
- **Email delivery**: <2 seconds (async, don't block response)
- **Total response time**: <10 seconds

---

## Logging Requirements

### Success Events

```typescript
{
  event: 'demo_signup_success',
  demo_user_id: string,
  email: string,  // hashed for privacy
  ip_address: string,
  duration_ms: number,
  email_sent: boolean,
  timestamp: ISO8601
}
```

### Failure Events

```typescript
{
  event: 'demo_signup_failure',
  error_type: string,
  email: string,  // hashed for privacy
  ip_address: string,
  duration_ms: number,
  error_message: string,
  timestamp: ISO8601
}
```

---

## Security Considerations

- **No authentication required** (public endpoint)
- **Rate limiting** prevents abuse (10/hour per IP, 3/day per email)
- **Email validation** prevents invalid/malicious inputs
- **RLS policies** ensure demo users can only access their isolated project
- **Magic links** provide secure, password-less authentication
- **Service role key** used server-side only (never exposed to frontend)

---

## Testing Checklist

- [ ] Valid email + name creates demo user successfully
- [ ] Invalid email format returns 400 VALIDATION_ERROR
- [ ] Empty full_name returns 400 VALIDATION_ERROR
- [ ] 11th signup from same IP in 1 hour returns 429 RATE_LIMIT_EXCEEDED
- [ ] 4th signup from same email in 1 day returns 429 RATE_LIMIT_EXCEEDED
- [ ] Duplicate email returns 409 EMAIL_EXISTS
- [ ] Demo project cloning completes in <10 seconds
- [ ] Confirmation email is sent successfully
- [ ] All events logged to audit_log table
- [ ] RLS policies prevent cross-demo data access
