# Quickstart Guide: Public Marketing Homepage

**Feature**: 021-public-homepage
**For**: Developers implementing this feature
**Prerequisites**: Familiarity with React, TypeScript, Supabase, and TDD workflow

## Overview

This guide provides a quick reference for implementing the public marketing homepage with demo signup functionality. Follow the TDD workflow: write tests first, then implement to make them pass.

## Quick Links

- **Spec**: [spec.md](./spec.md) - Feature requirements
- **Research**: [research.md](./research.md) - Technical decisions
- **Data Model**: [data-model.md](./data-model.md) - Database schema
- **API Contract**: [contracts/demo-signup-api.md](./contracts/demo-signup-api.md) - Edge Function interface
- **Tasks**: [tasks.md](./tasks.md) - Ordered implementation tasks (created by `/tasks` command)

## Development Workflow

### 1. Database Setup

**Create migrations** (in order):

```bash
# 1. Rate limiting table
npx supabase migration new create_rate_limit_events

# 2. Demo user fields
npx supabase migration new add_demo_user_fields

# 3. RLS policies
npx supabase migration new demo_rls_policies

# 4. Cleanup job
npx supabase migration new setup_pg_cron_cleanup
```

**Apply migrations**:

```bash
npx supabase db push --linked
npx supabase gen types typescript --linked > src/types/database.types.ts
```

### 2. Component Development (TDD)

**Pattern**: Test → Implement → Refactor

#### Example: HeroSection Component

**Test First** (`src/components/homepage/HeroSection.test.tsx`):

```typescript
import { render, screen } from '@testing-library/react'
import { HeroSection } from './HeroSection'

describe('HeroSection', () => {
  it('renders headline and tagline', () => {
    render(<HeroSection />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/industrial pipe tracking/i)).toBeInTheDocument()
  })

  it('renders two CTA buttons', () => {
    render(<HeroSection />)
    expect(screen.getByRole('button', { name: /try demo project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument()
  })

  it('renders three value proposition bullets', () => {
    render(<HeroSection />)
    expect(screen.getByText(/real-time visibility/i)).toBeInTheDocument()
    expect(screen.getByText(/mobile-first updates/i)).toBeInTheDocument()
    expect(screen.getByText(/complete audit trail/i)).toBeInTheDocument()
  })
})
```

**Implement** (`src/components/homepage/HeroSection.tsx`):

```typescript
export function HeroSection() {
  return (
    <section className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="text-6xl font-bold text-white mb-4">
          Track Every Pipe. From Takeoff to Turnover.
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          Industrial pipe tracking for construction teams who demand visibility, efficiency, and control.
        </p>

        {/* Value propositions */}
        <div className="flex flex-col md:flex-row gap-6 mb-10 justify-center">
          <div className="flex items-center gap-2">
            <span>📊</span>
            <span className="text-white">Real-Time Visibility</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📱</span>
            <span className="text-white">Mobile-First Updates</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="text-white">Complete Audit Trail</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Try Demo Project
          </button>
          <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10">
            Learn More
          </button>
        </div>
      </div>
    </section>
  )
}
```

### 3. Edge Function Development

**Create Edge Function**:

```bash
npx supabase functions new demo-signup
```

**Test First** (`supabase/functions/demo-signup/index.test.ts`):

```typescript
import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { handler } from './index.ts'

Deno.test('demo-signup: validates email format', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ email: 'invalid-email', full_name: 'Test User' })
  })

  const res = await handler(req)
  const body = await res.json()

  assertEquals(res.status, 400)
  assertEquals(body.error, 'VALIDATION_ERROR')
})

Deno.test('demo-signup: enforces rate limiting', async () => {
  // Test 11th signup from same IP
  // ... setup mock rate limit events

  const req = new Request('http://localhost', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '192.168.1.1' },
    body: JSON.stringify({ email: 'test@example.com', full_name: 'Test' })
  })

  const res = await handler(req)
  const body = await res.json()

  assertEquals(res.status, 429)
  assertEquals(body.error, 'RATE_LIMIT_EXCEEDED')
})
```

**Implement** (`supabase/functions/demo-signup/index.ts`):

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { email, full_name } = await req.json()

    // 1. Validate input
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        field: 'email'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // 2. Check rate limits
    const clientIp = req.headers.get('X-Forwarded-For') || 'unknown'
    const rateLimitExceeded = await checkRateLimits(email, clientIp)
    if (rateLimitExceeded) {
      return new Response(JSON.stringify(rateLimitExceeded), { status: 429 })
    }

    // 3. Create demo user + organization + project + clone data
    const result = await createDemoUser(email, full_name)

    return new Response(JSON.stringify({
      success: true,
      message: "Demo account created successfully. Please check your email for the confirmation link.",
      ...result
    }), { status: 201, headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Demo signup error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create demo account. Please try again.'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
```

### 4. Testing Checklist

Before marking a task complete, verify:

**Unit Tests**:
- [ ] Component renders correctly
- [ ] Props are passed correctly
- [ ] Event handlers fire correctly
- [ ] Conditional rendering works
- [ ] Accessibility attributes present

**Integration Tests**:
- [ ] TanStack Query mutations work
- [ ] Supabase calls succeed
- [ ] Error states handled
- [ ] Loading states displayed

**E2E Tests**:
- [ ] Full user journey works end-to-end
- [ ] Rate limiting enforced
- [ ] Email confirmation flow completes
- [ ] Demo project accessible

## Common Patterns

### TanStack Query Hook

```typescript
// src/hooks/useDemoSignup.ts
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDemoSignup() {
  return useMutation({
    mutationFn: async ({ email, full_name }: { email: string; full_name: string }) => {
      const { data, error } = await supabase.functions.invoke('demo-signup', {
        body: { email, full_name }
      })

      if (error) throw error
      return data
    }
  })
}
```

### Intersection Observer Animation

```typescript
// src/lib/animations.ts
export function useScrollAnimation(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up')
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [ref])
}
```

### Rate Limit Check

```sql
-- Query in Edge Function
SELECT COUNT(*) as count FROM rate_limit_events
WHERE event_type = 'demo_signup'
  AND identifier_type = 'ip_address'
  AND identifier_value = $1
  AND created_at > NOW() - INTERVAL '1 hour'
```

## Performance Targets

- **Page load**: <2 seconds (hero visible)
- **Demo creation**: <10 seconds (full flow)
- **Animation**: 60fps (no jank)
- **Rate limit query**: <10ms
- **Email delivery**: <2 minutes

## Accessibility Checklist

- [ ] All interactive elements have ≥44px touch targets
- [ ] Color contrast ≥4.5:1 (WCAG 2.1 AA)
- [ ] Keyboard navigation works (Tab order logical)
- [ ] Screen readers can navigate (ARIA labels present)
- [ ] Focus visible on all interactive elements
- [ ] No horizontal scrolling at any breakpoint

## Debugging Tips

### Rate Limiting Issues

```sql
-- Check recent rate limit events
SELECT * FROM rate_limit_events
WHERE event_type = 'demo_signup'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Demo User Issues

```sql
-- Find active demo users
SELECT id, email, demo_expires_at
FROM users
WHERE is_demo_user = TRUE
  AND demo_expires_at > NOW()
ORDER BY demo_expires_at ASC;
```

### Cleanup Job Status

```sql
-- Check pg_cron job status
SELECT * FROM cron.job WHERE jobname = 'cleanup_expired_demo_users';

-- Check cleanup job logs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup_expired_demo_users')
ORDER BY start_time DESC LIMIT 10;
```

## Deployment Checklist

Before merging to main:

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation passing (`npx tsc -b`)
- [ ] Migrations applied to production (`npx supabase db push --linked`)
- [ ] Edge Functions deployed (`npx supabase functions deploy demo-signup`)
- [ ] pg_cron job scheduled (verify in production database)
- [ ] Rate limiting verified (manual test from external IP)
- [ ] Email delivery tested (send test signup, verify email received)
- [ ] Demo project accessible (login with magic link, verify data visible)
- [ ] Accessibility audit passed (Lighthouse score ≥90)

## Useful Commands

```bash
# Run tests
npm test

# Run specific test file
npm test src/components/homepage/HeroSection.test.tsx

# Type check
npx tsc -b

# Deploy Edge Function
npx supabase functions deploy demo-signup

# Apply migrations
npx supabase db push --linked

# Generate types
npx supabase gen types typescript --linked > src/types/database.types.ts

# Start dev server
npm run dev
```

## Next Steps

After completing this feature:

1. Run `/tasks` command to generate ordered task list
2. Follow TDD workflow for each task
3. Commit tests + implementation together
4. Run code review before merging
5. Deploy to production

---

## Enhancement: Custom Demo Signup Emails (2025-10-29)

### Quick Setup

**1. Configure Resend API Key**:
```bash
# Set Resend API key in Supabase Edge Function secrets
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**2. Verify Sender Address**:
- Log in to [Resend Dashboard](https://resend.com/dashboard)
- Navigate to Settings → Domains
- Verify `demo@pipetrak.co` is listed as verified sender
- If not verified: Follow Resend's domain verification process (DNS records)

**3. Deploy Updated Edge Function**:
```bash
npx supabase functions deploy demo-signup
```

**4. Test Email Delivery**:
```bash
# Submit demo signup form on homepage
# Check inbox for custom-branded email
# Click magic link → should redirect to /dashboard
```

### Email Template Editing

**File Location**: `supabase/functions/demo-signup/email-template.ts`

**Function**:
```typescript
export function generateDemoEmailHtml(
  fullName: string,
  magicLinkUrl: string,
  demoExpiresAt: string
): string {
  // ... HTML template with variables
}
```

**To Edit Content**:
1. Open `supabase/functions/demo-signup/email-template.ts`
2. Modify HTML string directly (inline styles only)
3. Redeploy Edge Function: `npx supabase functions deploy demo-signup`

**Content Sections**:
- Header: "Welcome to PipeTrak!"
- Welcome Message: Brand introduction
- CTA Button: "Access Your Demo Project →" (magic link)
- Quick Start Guide: 4 features to explore
- Footer: Support contact + website link

### Debugging Email Issues

**Check Resend Delivery**:
```bash
# View Resend Dashboard logs
# https://resend.com/dashboard
# → Logs tab → Filter by email or date
```

**Check Edge Function Logs**:
```bash
npx supabase functions logs demo-signup --limit 50
```

**Common Issues**:

1. **Email not received**:
   - Check spam folder
   - Verify sender address (`demo@pipetrak.co`) is verified in Resend dashboard
   - Check Resend logs for delivery failure
   - Check Edge Function logs for API errors

2. **"Unauthorized" error from Resend**:
   - Verify `RESEND_API_KEY` is set correctly: `npx supabase secrets list`
   - Re-set if needed: `npx supabase secrets set RESEND_API_KEY=...`

3. **"Forbidden" error (403) from Resend**:
   - Sender address not verified
   - Go to Resend Dashboard → Settings → Domains
   - Complete domain verification (add DNS records)

4. **Rate limit exceeded (429)**:
   - Check Resend plan limits (100/day free, 3,000/month paid)
   - Upgrade plan if hitting limits regularly
   - Check for abuse (multiple signups from same IP)

### Email Delivery Monitoring

**Key Metrics**:
- Email delivery rate: Target >95% (SC-008)
- Resend API response time: Target <2 seconds
- Magic link click-through rate: Baseline to establish

**Where to Monitor**:
1. **Resend Dashboard**: https://resend.com/dashboard
   - View delivery stats, bounce rates, spam complaints
2. **Edge Function Logs**: `npx supabase functions logs demo-signup`
   - Track API errors, response times
3. **Rate Limit Events**: Query `rate_limit_events` table for abuse patterns

### Testing Checklist (Enhancement-Specific)

- [ ] Email template renders correctly with all variables
- [ ] Email delivers via Resend (not Supabase SMTP)
- [ ] Email contains welcome message + quick start guide
- [ ] Magic link redirects to dashboard with auth session
- [ ] Email renders in Gmail, Outlook, Apple Mail
- [ ] Error handling: Resend API failure doesn't block signup
- [ ] RESEND_API_KEY missing throws startup error

### Performance Targets (Enhancement)

| Metric | Target | Impact |
|--------|--------|--------|
| Email template generation | <100ms | +10ms vs baseline |
| Resend API call | <2 seconds | +500ms-1s vs baseline |
| Total signup flow | <10 seconds | <1s impact (within budget) |

## Support

- **Spec Questions**: See [spec.md](./spec.md)
- **Technical Decisions**: See [research.md](./research.md)
- **API Details**: See [contracts/demo-signup-api.md](./contracts/demo-signup-api.md), [contracts/resend-api.md](./contracts/resend-api.md), [contracts/supabase-admin-api.md](./contracts/supabase-admin-api.md)
- **Database Schema**: See [data-model.md](./data-model.md)
- **Design Document**: See `docs/plans/2025-10-29-custom-demo-signup-emails-design.md`
