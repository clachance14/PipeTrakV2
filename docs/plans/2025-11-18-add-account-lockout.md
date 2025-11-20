# Add Account Lockout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement progressive account lockout after failed login attempts to prevent brute force password attacks

**Architecture:** Create `failed_login_attempts` table with RLS. Track failed attempts per email/IP. Implement progressive delays (5s, 15s, 60s). Lock account after 5 failures for 15 minutes. Add unlock functionality for admins. Notify users of lockout.

**Tech Stack:** PostgreSQL, Supabase, TypeScript, React

**OWASP Reference:** [Authentication Cheat Sheet - Account Lockout](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#account-lockout)

**Priority:** 🟠 HIGH

---

## Current Vulnerability

**Issue:** No account lockout mechanism

**Risk:**
- Unlimited brute force password attempts
- Credential stuffing attacks
- Account takeover

**OWASP Recommendation:**
- Lock after 5 failed attempts
- 15-30 minute lockout duration
- Progressive delays before lockout
- Notify user of lockout

---

## Task 1: Create Failed Login Attempts Table

**Files:**
- Create: `supabase/migrations/20251118000001_create_failed_login_attempts.sql`

**Step 1: Write migration for failed_login_attempts table**

Create `supabase/migrations/20251118000001_create_failed_login_attempts.sql`:

```sql
-- ============================================================================
-- Failed Login Attempts Tracking
-- ============================================================================
-- Purpose: Track failed login attempts for account lockout protection
-- Created: 2025-11-18
-- OWASP: Authentication - Account Lockout

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,

  -- Indexes for performance
  CONSTRAINT failed_login_attempts_email_key UNIQUE (email)
);

-- Create index for email lookups
CREATE INDEX idx_failed_login_attempts_email ON public.failed_login_attempts(email);

-- Create index for cleanup (remove old attempts)
CREATE INDEX idx_failed_login_attempts_attempt_time ON public.failed_login_attempts(attempt_time);

-- Add RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can read/write (security-sensitive data)
-- Regular users should NOT see failed login attempts
CREATE POLICY "Service role full access on failed_login_attempts"
  ON public.failed_login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Authenticated users can see ONLY their own lockout status
CREATE POLICY "Users can view own lockout status"
  ON public.failed_login_attempts
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt()->>'email');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INT;
  v_locked_until TIMESTAMPTZ;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Define time window (5 minutes)
  v_window_start := NOW() - INTERVAL '5 minutes';

  -- Get or create record
  INSERT INTO public.failed_login_attempts (email, ip_address, user_agent, attempt_time)
  VALUES (p_email, p_ip_address, p_user_agent, NOW())
  ON CONFLICT (email) DO UPDATE
  SET
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    attempt_time = NOW();

  -- Count attempts in last 5 minutes
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM public.failed_login_attempts
  WHERE email = p_email
    AND attempt_time > v_window_start;

  -- Determine lockout
  IF v_attempt_count >= 5 THEN
    -- Lock for 15 minutes
    v_locked_until := NOW() + INTERVAL '15 minutes';

    UPDATE public.failed_login_attempts
    SET locked_until = v_locked_until
    WHERE email = p_email;

    RETURN jsonb_build_object(
      'locked', true,
      'attempts', v_attempt_count,
      'locked_until', v_locked_until,
      'message', 'Account locked due to multiple failed login attempts'
    );
  END IF;

  RETURN jsonb_build_object(
    'locked', false,
    'attempts', v_attempt_count,
    'remaining', 5 - v_attempt_count
  );
END;
$$;

-- Function: Check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until
  INTO v_locked_until
  FROM public.failed_login_attempts
  WHERE email = p_email;

  -- No record found
  IF v_locked_until IS NULL THEN
    RETURN jsonb_build_object('locked', false);
  END IF;

  -- Lockout expired
  IF v_locked_until < NOW() THEN
    -- Clear lockout
    UPDATE public.failed_login_attempts
    SET locked_until = NULL
    WHERE email = p_email;

    RETURN jsonb_build_object('locked', false);
  END IF;

  -- Still locked
  RETURN jsonb_build_object(
    'locked', true,
    'locked_until', v_locked_until,
    'message', format('Account locked until %s', v_locked_until::TEXT)
  );
END;
$$;

-- Function: Clear failed login attempts (on successful login)
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(
  p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE email = p_email;
END;
$$;

-- Function: Admin unlock account
CREATE OR REPLACE FUNCTION public.admin_unlock_account(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if caller is admin
  v_user_role := (auth.jwt()->>'role')::TEXT;

  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission denied: Only admins can unlock accounts';
  END IF;

  -- Clear lockout
  UPDATE public.failed_login_attempts
  SET locked_until = NULL
  WHERE email = p_email;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Account %s has been unlocked', p_email)
  );
END;
$$;

-- Function: Cleanup old failed login attempts (run daily)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete attempts older than 30 days
  DELETE FROM public.failed_login_attempts
  WHERE attempt_time < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.record_failed_login_attempt TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_failed_login_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlock_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts TO service_role;

-- Add comment
COMMENT ON TABLE public.failed_login_attempts IS 'Tracks failed login attempts for account lockout protection';
COMMENT ON FUNCTION public.record_failed_login_attempt IS 'Records failed login attempt and checks if account should be locked';
COMMENT ON FUNCTION public.is_account_locked IS 'Checks if account is currently locked';
COMMENT ON FUNCTION public.clear_failed_login_attempts IS 'Clears failed login attempts on successful login';
COMMENT ON FUNCTION public.admin_unlock_account IS 'Admin function to manually unlock locked accounts';
COMMENT ON FUNCTION public.cleanup_old_login_attempts IS 'Cleanup function to remove old login attempt records';
```

**Step 2: Apply migration**

```bash
./db-push.sh
```

Expected: Migration applied successfully

**Step 3: Verify tables and functions created**

```bash
supabase db diff --schema public --linked
```

Expected: No differences (migration applied)

**Step 4: Test RPC functions**

Create `test_account_lockout.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAccountLockout() {
  const testEmail = 'test@example.com'

  console.log('Testing account lockout...\n')

  // Test 5 failed attempts
  for (let i = 1; i <= 5; i++) {
    const { data, error } = await supabase.rpc('record_failed_login_attempt', {
      p_email: testEmail,
      p_ip_address: '192.168.1.1',
    })

    if (error) {
      console.error(`Attempt ${i} error:`, error)
    } else {
      console.log(`Attempt ${i}:`, data)
    }
  }

  // Check if locked
  const { data: lockStatus, error: lockError } = await supabase.rpc('is_account_locked', {
    p_email: testEmail,
  })

  if (lockError) {
    console.error('Lock check error:', lockError)
  } else {
    console.log('\nLock status:', lockStatus)
  }

  // Clear lockout
  const { data: clearData, error: clearError } = await supabase.rpc('clear_failed_login_attempts', {
    p_email: testEmail,
  })

  if (clearError) {
    console.error('Clear error:', clearError)
  } else {
    console.log('\nLockout cleared successfully')
  }
}

testAccountLockout()
```

Run:
```bash
node test_account_lockout.mjs
```

Expected:
```
Attempt 1: { locked: false, attempts: 1, remaining: 4 }
Attempt 2: { locked: false, attempts: 2, remaining: 3 }
Attempt 3: { locked: false, attempts: 3, remaining: 2 }
Attempt 4: { locked: false, attempts: 4, remaining: 1 }
Attempt 5: { locked: true, attempts: 5, locked_until: '2025-11-18T15:45:00Z' }

Lock status: { locked: true, locked_until: '2025-11-18T15:45:00Z' }

Lockout cleared successfully
```

**Step 5: Generate TypeScript types**

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

**Step 6: Commit migration**

```bash
git add supabase/migrations/20251118000001_create_failed_login_attempts.sql src/types/database.types.ts
git commit -m "feat: add failed login attempts tracking and account lockout

- Create failed_login_attempts table with RLS
- Add record_failed_login_attempt RPC (progressive lockout)
- Add is_account_locked RPC (check lockout status)
- Add clear_failed_login_attempts RPC (on successful login)
- Add admin_unlock_account RPC (admin override)
- Add cleanup_old_login_attempts RPC (maintenance)
- Lock after 5 attempts for 15 minutes
- Generate updated TypeScript types

OWASP: Authentication - Account Lockout"
```

---

## Task 2: Integrate Account Lockout into Login Flow

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Or: Modify login page directly

**Step 1: Create hook for account lockout**

Create `src/hooks/useAccountLockout.ts`:

```typescript
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface LockoutStatus {
  locked: boolean
  locked_until?: string
  message?: string
}

interface FailedAttemptResult {
  locked: boolean
  attempts?: number
  remaining?: number
  locked_until?: string
  message?: string
}

/**
 * Check if account is locked
 */
export function useAccountLockoutStatus(email: string | null) {
  return useQuery({
    queryKey: ['account-lockout', email],
    queryFn: async () => {
      if (!email) return { locked: false }

      const { data, error } = await supabase.rpc('is_account_locked', {
        p_email: email,
      })

      if (error) throw error
      return data as LockoutStatus
    },
    enabled: !!email,
    refetchInterval: 60000, // Check every minute
  })
}

/**
 * Record failed login attempt
 */
export function useRecordFailedAttempt() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.rpc('record_failed_login_attempt', {
        p_email: email,
        p_ip_address: null, // Could get from header in production
      })

      if (error) throw error
      return data as FailedAttemptResult
    },
  })
}

/**
 * Clear failed attempts (on successful login)
 */
export function useClearFailedAttempts() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.rpc('clear_failed_login_attempts', {
        p_email: email,
      })

      if (error) throw error
    },
  })
}

/**
 * Admin unlock account
 */
export function useAdminUnlockAccount() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.rpc('admin_unlock_account', {
        p_email: email,
      })

      if (error) throw error
      return data
    },
  })
}
```

**Step 2: Write tests for lockout hook**

Create `src/hooks/useAccountLockout.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAccountLockoutStatus, useRecordFailedAttempt } from './useAccountLockout'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useAccountLockout', () => {
  it('should check lockout status', async () => {
    const { result } = renderHook(() => useAccountLockoutStatus('test@example.com'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveProperty('locked')
  })

  it('should record failed attempt', async () => {
    const { result } = renderHook(() => useRecordFailedAttempt(), { wrapper })

    result.current.mutate('test@example.com')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveProperty('locked')
    expect(result.current.data).toHaveProperty('attempts')
  })
})
```

**Step 3: Integrate into AuthContext**

Modify `src/contexts/AuthContext.tsx`:

```typescript
import { useRecordFailedAttempt, useClearFailedAttempts, useAccountLockoutStatus } from '@/hooks/useAccountLockout'
import { logger, authLogger } from '@/lib/logger'

// In signIn function:
async function signIn(email: string, password: string) {
  try {
    // Check if account is locked BEFORE attempting sign in
    const { data: lockStatus } = await supabase.rpc('is_account_locked', {
      p_email: email,
    })

    if (lockStatus?.locked) {
      const lockedUntil = new Date(lockStatus.locked_until)
      const minutesRemaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)

      throw new Error(
        `Account is temporarily locked due to multiple failed login attempts. ` +
        `Please try again in ${minutesRemaining} minutes.`
      )
    }

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Record failed attempt
      const { data: attemptResult } = await supabase.rpc('record_failed_login_attempt', {
        p_email: email,
      })

      if (attemptResult?.locked) {
        throw new Error(attemptResult.message || 'Account locked due to multiple failed attempts')
      }

      if (attemptResult?.remaining !== undefined) {
        const remaining = attemptResult.remaining
        if (remaining <= 2) {
          // Warn user
          throw new Error(
            `Invalid credentials. ${remaining} attempts remaining before account is locked.`
          )
        }
      }

      throw error
    }

    // Clear failed attempts on successful login
    await supabase.rpc('clear_failed_login_attempts', {
      p_email: email,
    })

    authLogger.loginSuccess(data.user.id)
    setUser(data.user)
  } catch (error) {
    authLogger.loginFailed(error.message)
    throw error
  }
}
```

**Step 4: Test login with lockout**

```bash
npm run dev
```

Test:
1. Try logging in with wrong password 5 times
2. On 3rd attempt, see warning about remaining attempts
3. On 5th attempt, see lockout message
4. Wait 15 minutes OR clear lockout manually
5. Try logging in again

**Step 5: Commit AuthContext changes**

```bash
git add src/contexts/AuthContext.tsx src/hooks/useAccountLockout.ts src/hooks/useAccountLockout.test.ts
git commit -m "feat: integrate account lockout into login flow

- Check lockout status before attempting login
- Record failed attempts on login failure
- Clear attempts on successful login
- Warn users when approaching lockout
- Show remaining time when locked"
```

---

## Task 3: Add Account Lockout UI

**Files:**
- Create: `src/components/AccountLockedDialog.tsx`
- Modify: `src/pages/LoginPage.tsx`

**Step 1: Create AccountLockedDialog component**

Create `src/components/AccountLockedDialog.tsx`:

```typescript
import { AlertCircle, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AccountLockedDialogProps {
  lockedUntil: Date
  onClose?: () => void
}

export function AccountLockedDialog({ lockedUntil, onClose }: AccountLockedDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const diff = lockedUntil.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Your account is now unlocked')
        onClose?.()
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}m ${seconds}s`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [lockedUntil, onClose])

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2 flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-100">
            Account Temporarily Locked
          </h3>
          <p className="text-sm text-red-800 dark:text-red-200">
            Your account has been temporarily locked due to multiple failed login attempts.
            This is a security measure to protect your account.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-red-900 dark:text-red-100">
            <Clock className="h-4 w-4" />
            <span>Time remaining: {timeRemaining}</span>
          </div>
          <div className="mt-4 space-y-2 text-sm text-red-800 dark:text-red-200">
            <p className="font-medium">What can you do?</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Wait for the lockout period to expire</li>
              <li>Reset your password if you've forgotten it</li>
              <li>Contact support if you believe this was an error</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Integrate into LoginPage**

Modify `src/pages/LoginPage.tsx`:

```typescript
import { AccountLockedDialog } from '@/components/AccountLockedDialog'
import { useAccountLockoutStatus } from '@/hooks/useAccountLockout'
import { useState } from 'react'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [attemptedEmail, setAttemptedEmail] = useState<string | null>(null)

  // Check lockout status
  const { data: lockoutStatus } = useAccountLockoutStatus(attemptedEmail)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptedEmail(email)

    // Try login...
  }

  return (
    <div className="login-page">
      {lockoutStatus?.locked && lockoutStatus.locked_until && (
        <AccountLockedDialog
          lockedUntil={new Date(lockoutStatus.locked_until)}
          onClose={() => setAttemptedEmail(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        {/* Login form fields */}
      </form>
    </div>
  )
}
```

**Step 3: Test lockout UI**

1. Trigger account lockout
2. See AccountLockedDialog with countdown
3. Verify countdown updates every second
4. Verify dialog disappears when lockout expires

**Step 4: Commit lockout UI**

```bash
git add src/components/AccountLockedDialog.tsx src/pages/LoginPage.tsx
git commit -m "feat: add account lockout UI with countdown

- Create AccountLockedDialog component
- Show lockout status and remaining time
- Real-time countdown timer
- Helpful guidance for locked users
- Auto-dismiss when lockout expires"
```

---

## Task 4: Add Admin Unlock Functionality

**Files:**
- Create: `src/pages/AdminUnlockAccountPage.tsx` (or add to existing admin panel)

**Step 1: Create admin unlock interface**

Add to admin panel or create `src/pages/AdminUnlockAccountPage.tsx`:

```typescript
import { useState } from 'react'
import { useAdminUnlockAccount } from '@/hooks/useAccountLockout'
import { toast } from 'sonner'

export function AdminUnlockAccountSection() {
  const [email, setEmail] = useState('')
  const unlockAccount = useAdminUnlockAccount()

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await unlockAccount.mutateAsync(email)
      toast.success(`Account ${email} has been unlocked`)
      setEmail('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unlock account')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Unlock Account</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Manually unlock a locked account to allow the user to login immediately.
      </p>

      <form onSubmit={handleUnlock} className="space-y-4">
        <div>
          <label htmlFor="unlock-email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            id="unlock-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={unlockAccount.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {unlockAccount.isPending ? 'Unlocking...' : 'Unlock Account'}
        </button>
      </form>
    </div>
  )
}
```

**Step 2: Add to admin routes**

Ensure admin users can access unlock functionality.

**Step 3: Test admin unlock**

1. Lock a test account
2. Login as admin
3. Use unlock feature
4. Verify account can login immediately

**Step 4: Commit admin unlock UI**

```bash
git add src/pages/AdminUnlockAccountPage.tsx
git commit -m "feat: add admin account unlock interface

- Create unlock form for admins
- Validate admin permissions
- Show success/error feedback
- Allow immediate account recovery"
```

---

## Task 5: Add Lockout Notifications

**Files:**
- Create: `supabase/functions/send-lockout-notification/index.ts` (optional)

**Step 1: Create email notification Edge Function**

Create `supabase/functions/send-lockout-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { email, locked_until } = await req.json()

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just log
    console.log(`Lockout notification for ${email} until ${locked_until}`)

    // Example email content:
    const emailContent = `
      Your account has been temporarily locked due to multiple failed login attempts.

      Lockout expires: ${new Date(locked_until).toLocaleString()}

      If this wasn't you, please reset your password immediately.
    `

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 2: Call notification function on lockout**

Modify `record_failed_login_attempt` RPC or call from client after lockout detected.

**Step 3: Deploy notification function**

```bash
supabase functions deploy send-lockout-notification --linked
```

**Step 4: Commit notification**

```bash
git add supabase/functions/send-lockout-notification/
git commit -m "feat: add lockout email notification

- Create Edge Function for lockout emails
- Notify users when account is locked
- Include lockout expiration time
- Suggest password reset if unauthorized"
```

---

## Verification Checklist

- [ ] `failed_login_attempts` table created with RLS
- [ ] RPC functions created and tested
- [ ] Failed attempts recorded on login failure
- [ ] Account locked after 5 attempts
- [ ] Lockout expires after 15 minutes
- [ ] Attempts cleared on successful login
- [ ] AccountLockedDialog shows with countdown
- [ ] Admin unlock functionality works
- [ ] TypeScript types generated
- [ ] Tests pass
- [ ] Documentation updated

---

## Rollback Plan

If lockout causes issues:

1. **Disable lockout checks temporarily:**
   ```typescript
   // In AuthContext, comment out lockout check
   // const lockStatus = await supabase.rpc('is_account_locked', ...)
   ```

2. **Unlock all accounts:**
   ```sql
   UPDATE public.failed_login_attempts SET locked_until = NULL;
   ```

3. **Adjust lockout threshold:**
   ```sql
   -- In RPC function, change from 5 to 10 attempts
   IF v_attempt_count >= 10 THEN
   ```

4. **Remove lockout entirely:**
   ```bash
   # Create rollback migration
   # DROP TABLE failed_login_attempts CASCADE;
   ```

---

## Success Criteria

✅ Account locked after 5 failed attempts
✅ Lockout expires after 15 minutes automatically
✅ Users see clear lockout message with countdown
✅ Users warned when approaching lockout (3+ attempts)
✅ Successful login clears failed attempts
✅ Admins can manually unlock accounts
✅ Tests verify lockout behavior
✅ No legitimate users locked out incorrectly
✅ All auth flows still work correctly

---

## Future Enhancements

1. **Adaptive Lockout**
   - Longer lockout for repeat offenders
   - Shorter lockout for first-time

2. **IP-Based Tracking**
   - Track attempts by IP address
   - Block suspicious IPs at gateway

3. **CAPTCHA Integration**
   - Show CAPTCHA after 2 failed attempts
   - Reduce lockout threshold if CAPTCHA passed

4. **Security Alerts**
   - Email users about lockout events
   - Alert if lockout from unusual location
   - Dashboard for admins to monitor lockouts

5. **Password Reset Integration**
   - Automatically suggest password reset on lockout
   - Temporary unlock via email verification

---

## References

- [OWASP Authentication Cheat Sheet - Account Lockout](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#account-lockout)
- [NIST SP 800-63B - Account Lockout](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [CWE-307: Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)
