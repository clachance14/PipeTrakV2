# Fix CORS Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restrict CORS headers to prevent unauthorized cross-origin requests to Supabase Edge Functions

**Architecture:** Update CORS headers in Edge Functions to use environment variable for allowed origin instead of wildcard. Add FRONTEND_URL to Supabase secrets. Test invitation sending to ensure functionality remains intact.

**Tech Stack:** Supabase Edge Functions (Deno), TypeScript

**OWASP Reference:** [CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)

**Priority:** 🔴 CRITICAL

---

## Current Vulnerability

**File:** `supabase/functions/send-invitation/index.ts:12-15`

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ Allows ANY origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Risk:** Any website can call this Edge Function, potentially enabling phishing attacks or unauthorized access.

---

## Task 1: Add FRONTEND_URL Environment Variable

**Files:**
- Modify: `supabase/functions/send-invitation/index.ts:12-15`
- Create: Test setup for environment variables

**Step 1: Set FRONTEND_URL in Supabase secrets**

Run locally (for testing):
```bash
# Check current secrets
supabase secrets list --linked

# Set FRONTEND_URL
supabase secrets set FRONTEND_URL=http://localhost:5173 --linked

# Verify it was set
supabase secrets list --linked
```

Expected output:
```
NAME          VALUE
FRONTEND_URL  http://localhost:5173
```

**Step 2: Update CORS headers in send-invitation function**

Modify `supabase/functions/send-invitation/index.ts:12-15`:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',  // Add this for authenticated requests
}
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
cd supabase/functions/send-invitation
deno check index.ts
```

Expected: No errors

**Step 4: Deploy the function**

Run:
```bash
supabase functions deploy send-invitation --linked
```

Expected output:
```
Deploying function send-invitation...
Deployed function send-invitation in <region>
```

**Step 5: Test the function locally**

Run:
```bash
supabase functions serve send-invitation --env-file .env
```

Then in another terminal:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-invitation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --header 'Origin: http://localhost:5173' \
  --data '{"email":"test@example.com","role":"user","projectId":"test-id"}'
```

Expected: Function responds with appropriate CORS headers in response

**Step 6: Test CORS rejection from unauthorized origin**

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-invitation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --header 'Origin: https://malicious-site.com' \
  --data '{"email":"test@example.com","role":"user","projectId":"test-id"}'
```

Expected: CORS error (browser would block this)

**Step 7: Commit**

```bash
git add supabase/functions/send-invitation/index.ts
git commit -m "fix: restrict CORS to authorized frontend origin

- Update send-invitation function to use FRONTEND_URL env var
- Remove wildcard CORS policy
- Add Access-Control-Allow-Credentials header
- Prevents unauthorized cross-origin requests

OWASP: Cross-Origin Resource Sharing Security"
```

---

## Task 2: Set Production Environment Variable

**Files:**
- Configuration: Supabase Dashboard

**Step 1: Get production frontend URL**

Identify production URL:
- Vercel deployment: `https://your-app.vercel.app`
- Custom domain: `https://yourdomain.com`

**Step 2: Set production secret**

Via Supabase Dashboard:
1. Go to Project Settings > Edge Functions
2. Navigate to Secrets section
3. Add secret:
   - Name: `FRONTEND_URL`
   - Value: `https://your-production-domain.com`
4. Click Save

Or via CLI:
```bash
supabase secrets set FRONTEND_URL=https://your-production-domain.com --linked
```

**Step 3: Redeploy function to pick up new secret**

```bash
supabase functions deploy send-invitation --linked
```

**Step 4: Verify in production**

Test from production frontend:
1. Open production app
2. Navigate to team management page
3. Try sending an invitation
4. Check browser network tab for CORS headers

Expected: `Access-Control-Allow-Origin: https://your-production-domain.com`

---

## Task 3: Audit Other Edge Functions

**Files:**
- Search: All files in `supabase/functions/*/index.ts`

**Step 1: List all Edge Functions**

Run:
```bash
ls -la supabase/functions/
```

Expected output:
```
drwxr-xr-x send-invitation
[other functions if any]
```

**Step 2: Search for wildcard CORS in all functions**

Run:
```bash
grep -r "Access-Control-Allow-Origin.*\*" supabase/functions/
```

**Step 3: Update any other functions found**

For each function with wildcard CORS, repeat Task 1 steps 2-7.

**Step 4: Document CORS policy**

Add to `docs/security/CORS-POLICY.md`:

```markdown
# CORS Policy

## Edge Functions

All Supabase Edge Functions must use the `FRONTEND_URL` environment variable for CORS configuration.

**Pattern:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
}
```

**Environment Variables:**
- Local development: `http://localhost:5173`
- Production: `https://your-production-domain.com`

**Never use:**
- `'Access-Control-Allow-Origin': '*'` (wildcard)
- Hardcoded production URLs in code

**Testing:**
See `docs/plans/2025-11-18-fix-cors-configuration.md` for test procedures.
```

**Step 5: Commit documentation**

```bash
git add docs/security/CORS-POLICY.md
git commit -m "docs: add CORS policy documentation"
```

---

## Task 4: Write Integration Test

**Files:**
- Create: `tests/integration/edge-functions/send-invitation-cors.test.ts`

**Step 1: Write test file**

Create `tests/integration/edge-functions/send-invitation-cors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('send-invitation Edge Function - CORS Security', () => {
  const FUNCTION_URL = process.env.VITE_SUPABASE_URL + '/functions/v1/send-invitation'
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

  it('should allow requests from authorized origin', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
      },
    })

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(FRONTEND_URL)
  })

  it('should not include wildcard CORS headers', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST',
      },
    })

    // Should not allow arbitrary origins
    expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
  })

  it('should include credentials flag', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
      },
    })

    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
```

**Step 2: Run test**

```bash
npm test tests/integration/edge-functions/send-invitation-cors.test.ts
```

Expected: All tests pass

**Step 3: Commit test**

```bash
git add tests/integration/edge-functions/send-invitation-cors.test.ts
git commit -m "test: add CORS security tests for send-invitation function"
```

---

## Verification Checklist

- [ ] `FRONTEND_URL` environment variable set in Supabase (local and production)
- [ ] CORS headers updated in `send-invitation` function
- [ ] Function deploys without errors
- [ ] Test invitation sending from production frontend works
- [ ] Test invitation sending from localhost:5173 works
- [ ] CORS headers in response match expected origin
- [ ] No wildcard (`*`) CORS headers in any Edge Function
- [ ] Documentation added to `docs/security/CORS-POLICY.md`
- [ ] Integration tests pass
- [ ] Changes committed with descriptive messages

---

## Rollback Plan

If issues occur after deployment:

1. **Quick fix:** Temporarily revert to wildcard while investigating
   ```bash
   # In index.ts, temporarily change:
   'Access-Control-Allow-Origin': '*'
   supabase functions deploy send-invitation --linked
   ```

2. **Check environment variable:**
   ```bash
   supabase secrets list --linked
   ```

3. **Check function logs:**
   ```bash
   supabase functions logs send-invitation --linked
   ```

4. **Redeploy with correct FRONTEND_URL**

---

## Success Criteria

✅ Invitations can be sent from production frontend
✅ Invitations can be sent from localhost:5173
✅ CORS headers return exact origin (not wildcard)
✅ Credentials flag is present
✅ All tests pass
✅ Documentation is updated
✅ No console errors in browser

---

## References

- [OWASP CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
