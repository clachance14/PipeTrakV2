# Implement Rate Limiting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement rate limiting on authentication endpoints and API calls to prevent brute force attacks and DoS

**Architecture:** Use Supabase Upstash Rate Limiting for Edge Functions. Configure tiered rate limits (authentication = strict, API = lenient). Add rate limit headers to responses. Implement client-side retry logic with exponential backoff.

**Tech Stack:** Supabase Edge Functions (Deno), Upstash Redis, TypeScript

**OWASP Reference:** [Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

**Priority:** 🟠 HIGH

---

## Current Vulnerability

**Issue:** No rate limiting on any endpoints

**Risk:**
- Brute force password attacks
- Credential stuffing attacks
- API abuse and resource exhaustion
- DoS attacks

**OWASP Recommendation:**
- Authentication: 5 requests/minute per IP
- API: 100 requests/minute per user
- Enforce at edge/gateway level

---

## Background: Supabase Rate Limiting Options

**Option 1: Supabase Built-in Rate Limiting (Free tier)**
- Limited to 100 requests/second per IP
- No granular control
- Not suitable for auth protection

**Option 2: Upstash Redis with @upstash/ratelimit (Recommended)**
- Fine-grained control
- Multiple algorithms (sliding window, token bucket)
- Persistent across deployments
- Free tier: 10,000 requests/day

**Option 3: Cloudflare Rate Limiting (External)**
- Requires Cloudflare proxy
- Additional cost
- Global CDN benefits

**This plan uses Option 2 (Upstash).**

---

## Task 1: Set Up Upstash Redis

**Files:**
- Configuration: Upstash Dashboard

**Step 1: Create Upstash account**

1. Go to https://upstash.com
2. Sign up with GitHub
3. Verify email

**Step 2: Create Redis database**

1. Click "Create Database"
2. Choose:
   - Name: `pipetrak-rate-limiting`
   - Region: Closest to Supabase region
   - Type: Regional (free)
   - TLS: Enabled
3. Click Create

**Step 3: Get connection details**

From database dashboard, copy:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Step 4: Add to Supabase secrets**

```bash
supabase secrets set UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io" --linked
supabase secrets set UPSTASH_REDIS_REST_TOKEN="your-token" --linked
```

Verify:
```bash
supabase secrets list --linked
```

Expected output includes:
```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

**Step 5: Document configuration**

Create `docs/security/RATE-LIMITING-SETUP.md`:

```markdown
# Rate Limiting Setup

## Upstash Redis Configuration

**Database:** pipetrak-rate-limiting
**Region:** [your region]
**Type:** Regional (Free tier)

**Environment Variables:**
- `UPSTASH_REDIS_REST_URL`: Upstash REST API URL
- `UPSTASH_REDIS_REST_TOKEN`: Authentication token

## Rate Limit Tiers

| Endpoint Type | Limit | Window | Algorithm |
|---------------|-------|--------|-----------|
| Authentication | 5 req | 1 min | Sliding Window |
| Password Reset | 3 req | 15 min | Sliding Window |
| API Calls | 100 req | 1 min | Token Bucket |
| Edge Functions | 20 req | 1 min | Sliding Window |

## Testing

Use curl to test rate limits:
```bash
# Trigger rate limit (run 6 times quickly)
for i in {1..6}; do
  curl -X POST https://your-project.supabase.co/functions/v1/your-function
done
```

Expected: 429 Too Many Requests after 5th request
```

**Step 6: Commit documentation**

```bash
git add docs/security/RATE-LIMITING-SETUP.md
git commit -m "docs: add rate limiting setup guide"
```

---

## Task 2: Create Rate Limiting Utility for Edge Functions

**Files:**
- Create: `supabase/functions/_shared/rate-limit.ts`

**Step 1: Install Upstash dependency**

In your Edge Function:
```typescript
// Import directly from CDN (Deno style)
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@0.4.4'
import { Redis } from 'https://esm.sh/@upstash/redis@1.24.0'
```

**Step 2: Create rate limit utility**

Create `supabase/functions/_shared/rate-limit.ts`:

```typescript
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@0.4.4'
import { Redis } from 'https://esm.sh/@upstash/redis@1.24.0'

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  /** Authentication endpoints: 5 requests per minute */
  AUTH: {
    requests: 5,
    window: '1 m',
  },
  /** Password reset: 3 requests per 15 minutes */
  PASSWORD_RESET: {
    requests: 3,
    window: '15 m',
  },
  /** General API: 100 requests per minute */
  API: {
    requests: 100,
    window: '1 m',
  },
  /** Edge Functions: 20 requests per minute */
  EDGE_FUNCTION: {
    requests: 20,
    window: '1 m',
  },
} as const

/**
 * Create Redis client for rate limiting
 */
function getRedisClient() {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

  if (!url || !token) {
    throw new Error('Upstash Redis credentials not configured')
  }

  return new Redis({
    url,
    token,
  })
}

/**
 * Create rate limiter with sliding window algorithm
 */
export function createRateLimiter(
  preset: keyof typeof RATE_LIMITS
): Ratelimit {
  const redis = getRedisClient()
  const { requests, window } = RATE_LIMITS[preset]

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `ratelimit:${preset.toLowerCase()}`,
  })
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(req: Request): string {
  // Try to get user ID from authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from JWT (simplified - in production, verify token)
    try {
      const token = authHeader.replace('Bearer ', '')
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.sub) {
        return `user:${payload.sub}`
      }
    } catch {
      // Fall through to IP-based limiting
    }
  }

  // Fall back to IP address
  const forwardedFor = req.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'

  return `ip:${ip}`
}

/**
 * Check rate limit and return response if exceeded
 */
export async function checkRateLimit(
  req: Request,
  preset: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; response?: Response }> {
  try {
    const rateLimiter = createRateLimiter(preset)
    const identifier = getIdentifier(req)

    const { success, limit, remaining, reset } = await rateLimiter.limit(identifier)

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    }

    if (!success) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again after ${new Date(reset * 1000).toISOString()}`,
            retryAfter: reset,
          }),
          {
            status: 429,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((reset * 1000 - Date.now()) / 1000).toString(),
            },
          }
        ),
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Fail open (allow request) if rate limiting service is down
    return { allowed: true }
  }
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: Response,
  limit: number,
  remaining: number,
  reset: number
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', limit.toString())
  headers.set('X-RateLimit-Remaining', remaining.toString())
  headers.set('X-RateLimit-Reset', reset.toString())

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
```

**Step 3: Type check (if using Deno types)**

```bash
cd supabase/functions/_shared
deno check rate-limit.ts
```

Expected: No errors (or missing types warnings - acceptable)

**Step 4: Commit rate limit utility**

```bash
git add supabase/functions/_shared/rate-limit.ts
git commit -m "feat: add rate limiting utility for Edge Functions

- Create Upstash Redis integration
- Define rate limit presets (auth, API, etc)
- Implement sliding window algorithm
- Add identifier extraction (user ID or IP)
- Fail-open behavior for service outages

OWASP: Denial of Service Prevention"
```

---

## Task 3: Apply Rate Limiting to Authentication Endpoint

**Files:**
- Modify: Supabase Auth configuration (if using custom auth endpoint)
- Or: Create wrapper Edge Function for login

**Note:** Supabase Auth endpoints are built-in and don't expose hooks for rate limiting. We'll create a custom login endpoint or use Supabase's built-in protection.

**Alternative:** Apply rate limiting to custom Edge Functions only.

For this task, we'll apply to `send-invitation` as an example.

**Step 1: Update send-invitation function**

Modify `supabase/functions/send-invitation/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(req, 'EDGE_FUNCTION')
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!
  }

  try {
    // ... existing function logic ...

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending invitation:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send invitation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
```

**Step 2: Deploy function**

```bash
supabase functions deploy send-invitation --linked
```

Expected: Deployment successful

**Step 3: Test rate limit**

```bash
# Get your function URL and anon key
FUNCTION_URL="https://your-project.supabase.co/functions/v1/send-invitation"
ANON_KEY="your-anon-key"

# Send 21 requests (should trigger rate limit on 21st)
for i in {1..21}; do
  echo "Request $i:"
  curl -i -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","role":"user","projectId":"test"}'
  echo ""
done
```

Expected:
- Requests 1-20: 200 OK with `X-RateLimit-Remaining` header
- Request 21: 429 Too Many Requests

**Step 4: Verify rate limit headers**

Check response headers:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 1700000000
Retry-After: 60
```

**Step 5: Commit rate-limited function**

```bash
git add supabase/functions/send-invitation/index.ts
git commit -m "feat: add rate limiting to send-invitation Edge Function

- Apply EDGE_FUNCTION rate limit (20 req/min)
- Return 429 with retry-after header when exceeded
- Add rate limit headers to all responses"
```

---

## Task 4: Client-Side Rate Limit Handling

**Files:**
- Create: `src/lib/api-client.ts`
- Create: `src/lib/api-client.test.ts`

**Step 1: Write test for API client with retry**

Create `src/lib/api-client.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { apiClient } from './api-client'

describe('API Client - Rate Limit Handling', () => {
  it('should retry after rate limit with exponential backoff', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    // First call: 429
    // Second call: 200
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Retry-After': '1' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )

    const result = await apiClient.post('/api/test', { data: 'test' })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ success: true })
  })

  it('should respect Retry-After header', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    const sleepSpy = vi.spyOn(global, 'setTimeout')

    fetchSpy
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { 'Retry-After': '5' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )

    await apiClient.post('/api/test', {})

    // Should wait ~5 seconds
    expect(sleepSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
  })

  it('should fail after max retries', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    // Always return 429
    fetchSpy.mockResolvedValue(
      new Response(null, { status: 429, headers: { 'Retry-After': '1' } })
    )

    await expect(apiClient.post('/api/test', {})).rejects.toThrow('Too many requests')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test src/lib/api-client.test.ts
```

Expected: API client doesn't exist yet

**Step 3: Create API client with retry logic**

Create `src/lib/api-client.ts`:

```typescript
/**
 * API client with rate limit handling and exponential backoff
 */

interface RequestOptions extends RequestInit {
  maxRetries?: number
  baseDelay?: number
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY = 1000 // 1 second

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 60000) // Max 60 seconds
}

/**
 * Parse Retry-After header (seconds or date)
 */
function parseRetryAfter(header: string | null): number {
  if (!header) return 0

  // If it's a number (seconds)
  const seconds = parseInt(header, 10)
  if (!isNaN(seconds)) {
    return seconds * 1000 // Convert to milliseconds
  }

  // If it's a date
  const date = new Date(header)
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now())
  }

  return 0
}

/**
 * Make API request with automatic retry on rate limits
 */
async function fetchWithRetry(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { maxRetries = DEFAULT_MAX_RETRIES, baseDelay = DEFAULT_BASE_DELAY, ...fetchOptions } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)

      // If rate limited, retry
      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error('Too many requests. Maximum retries exceeded.')
        }

        // Get retry delay from header or use exponential backoff
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
        const delay = retryAfter > 0 ? retryAfter : getBackoffDelay(attempt, baseDelay)

        console.warn(`Rate limited. Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(delay)
        continue
      }

      // Success or non-retryable error
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) {
        throw lastError
      }

      // Retry on network errors
      const delay = getBackoffDelay(attempt, baseDelay)
      console.warn(`Request failed. Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
      await sleep(delay)
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * API client with rate limit handling
 */
export const apiClient = {
  async get(url: string, options?: RequestOptions): Promise<any> {
    const response = await fetchWithRetry(url, { ...options, method: 'GET' })
    return response.json()
  },

  async post(url: string, data: any, options?: RequestOptions): Promise<any> {
    const response = await fetchWithRetry(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async put(url: string, data: any, options?: RequestOptions): Promise<any> {
    const response = await fetchWithRetry(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async delete(url: string, options?: RequestOptions): Promise<any> {
    const response = await fetchWithRetry(url, { ...options, method: 'DELETE' })
    return response.json()
  },
}

/**
 * Extract rate limit info from response headers
 */
export function getRateLimitInfo(response: Response) {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0', 10),
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10),
    reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10),
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/lib/api-client.test.ts
```

Expected: All tests pass

**Step 5: Commit API client**

```bash
git add src/lib/api-client.ts src/lib/api-client.test.ts
git commit -m "feat: add API client with rate limit retry logic

- Implement exponential backoff
- Respect Retry-After headers
- Max 3 retries by default
- Extract rate limit info from headers
- Comprehensive test coverage"
```

---

## Task 5: Document Rate Limiting for Users

**Files:**
- Create: `docs/security/RATE-LIMITING.md`

**Step 1: Create user-facing documentation**

Create `docs/security/RATE-LIMITING.md`:

```markdown
# Rate Limiting

## Overview

PipeTrak V2 implements rate limiting to protect against abuse and ensure fair usage of resources.

## Rate Limits

| Endpoint Type | Limit | Window | Identifier |
|---------------|-------|--------|------------|
| Edge Functions | 20 requests | 1 minute | IP or User ID |
| API Endpoints | 100 requests | 1 minute | User ID |
| Authentication | 5 requests | 1 minute | IP address |
| Password Reset | 3 requests | 15 minutes | Email address |

## How It Works

Rate limits are applied based on:
1. **Authenticated requests**: Your user ID
2. **Anonymous requests**: Your IP address

## Response Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1700000000
```

- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Rate Limit Exceeded

When you exceed a rate limit, you'll receive:

**Status Code:** `429 Too Many Requests`

**Response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again after 2025-11-18T15:30:00Z",
  "retryAfter": 1700000000
}
```

**Headers:**
```
Retry-After: 60
```

## Best Practices

### 1. Monitor Rate Limit Headers

Check `X-RateLimit-Remaining` before making additional requests:

```typescript
const response = await fetch('/api/endpoint')
const remaining = response.headers.get('X-RateLimit-Remaining')

if (parseInt(remaining) < 5) {
  console.warn('Approaching rate limit')
}
```

### 2. Implement Exponential Backoff

Use `Retry-After` header to wait before retrying:

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  await sleep(parseInt(retryAfter) * 1000)
  // Retry request
}
```

### 3. Use Our API Client

The built-in API client handles rate limits automatically:

```typescript
import { apiClient } from '@/lib/api-client'

// Automatically retries with backoff
const data = await apiClient.post('/api/endpoint', { ... })
```

## Troubleshooting

### "Too many requests" errors

**Cause:** You've exceeded the rate limit

**Solutions:**
1. Wait for the rate limit window to reset (check `Retry-After` header)
2. Reduce request frequency
3. Batch multiple operations into single requests
4. Use pagination for large data sets

### Rate limits in development

Rate limits apply in development mode. If developing locally and hitting limits:

1. Use `.env.local` with different credentials
2. Implement request caching
3. Use mock data for testing

## Production Considerations

### Increased Limits

Contact support if you need higher rate limits:
- Explain use case
- Provide expected request volume
- Justify need for increase

### Monitoring

Track rate limit metrics:
- Percentage of requests rate-limited
- Time of day patterns
- Users frequently hitting limits

## Technical Implementation

For developers working on the codebase:

**Server-side:** `supabase/functions/_shared/rate-limit.ts`
**Client-side:** `src/lib/api-client.ts`
**Configuration:** `docs/security/RATE-LIMITING-SETUP.md`
```

**Step 2: Commit documentation**

```bash
git add docs/security/RATE-LIMITING.md
git commit -m "docs: add rate limiting user documentation

- Explain rate limits and windows
- Document response headers
- Provide best practices
- Add troubleshooting guide"
```

---

## Verification Checklist

- [ ] Upstash Redis configured and connected
- [ ] Rate limit utility created for Edge Functions
- [ ] Rate limiting applied to Edge Functions
- [ ] Client-side retry logic implemented
- [ ] Tests pass for API client
- [ ] Documentation complete
- [ ] Rate limits tested manually
- [ ] 429 responses return correct headers
- [ ] Retry-After header present
- [ ] All tests pass

---

## Rollback Plan

If rate limiting causes issues:

1. **Temporarily disable:**
   ```typescript
   // In rate-limit.ts, return early:
   return { allowed: true }
   ```

2. **Adjust limits:**
   ```typescript
   AUTH: { requests: 10, window: '1 m' }  // More permissive
   ```

3. **Check Upstash:**
   - Verify Redis is accessible
   - Check quota limits
   - Review error logs

4. **Redeploy without rate limiting:**
   - Remove `checkRateLimit()` calls
   - Deploy functions
   - Fix issues
   - Re-enable gradually

---

## Success Criteria

✅ Rate limiting active on all Edge Functions
✅ Authentication endpoints protected (if custom)
✅ 429 responses with proper headers
✅ Client automatically retries with backoff
✅ Tests verify retry behavior
✅ Documentation complete
✅ Manual testing confirms limits enforced
✅ No false positives (legitimate users blocked)

---

## Future Enhancements

1. **Adaptive Rate Limiting**
   - Increase limits for verified users
   - Decrease for suspicious activity

2. **Per-User Quotas**
   - Different limits per subscription tier
   - Track usage in database

3. **Rate Limit Dashboard**
   - Real-time monitoring
   - Alert when users hit limits frequently

4. **Distributed Rate Limiting**
   - Use Cloudflare for global rate limiting
   - Protect against DDoS

---

## References

- [OWASP Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)
- [RFC 6585: HTTP 429 Too Many Requests](https://tools.ietf.org/html/rfc6585#section-4)
