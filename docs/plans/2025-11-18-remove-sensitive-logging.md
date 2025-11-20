# Remove Sensitive Logging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove or sanitize sensitive information from console logs to prevent information disclosure in production

**Architecture:** Create environment-aware logging utility that filters sensitive data in production. Audit all console.log/console.error calls. Replace with structured logging utility. Configure to suppress sensitive logs in production builds.

**Tech Stack:** TypeScript, environment variables, React

**OWASP Reference:** [Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

**Priority:** 🟠 HIGH

---

## Current Vulnerability

**File:** `src/contexts/AuthContext.tsx:39, 48`

```typescript
console.error('Error fetching user role:', error)  // ❌ Exposes error details
console.error('Error signing in:', error)          // ❌ Exposes error details
```

**Risk:** Error messages may contain:
- Stack traces revealing file paths
- Database error messages
- API endpoints and structure
- User IDs or email addresses
- Session tokens or credentials

**OWASP Guidance:** Log detailed errors server-side only. Client-side logs should be generic in production.

---

## Task 1: Create Logging Utility

**Files:**
- Create: `src/lib/logger.ts`
- Create: `src/lib/logger.test.ts`

**Step 1: Write tests for logging utility**

Create `src/lib/logger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from './logger'

describe('Logger Utility', () => {
  let consoleLogSpy: vi.SpyInstance
  let consoleErrorSpy: vi.SpyInstance
  let consoleWarnSpy: vi.SpyInstance

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Development Mode', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should log info messages in development', () => {
      logger.info('Test message', { data: 'test' })
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Test message'),
        { data: 'test' }
      )
    })

    it('should log error details in development', () => {
      const error = new Error('Test error')
      logger.error('Error occurred', error)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should log warnings in development', () => {
      logger.warn('Warning message')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })

  describe('Production Mode', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
    })

    it('should NOT log info messages in production', () => {
      logger.info('Test message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should log generic error without details in production', () => {
      const error = new Error('Database connection failed')
      logger.error('Error occurred', error)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Error occurred')
      )
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Database connection failed')
      )
    })

    it('should still log warnings in production', () => {
      logger.warn('Critical warning')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })

  describe('Sensitive Data Filtering', () => {
    it('should redact email addresses', () => {
      logger.info('User logged in: user@example.com')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('[REDACTED_EMAIL]')
      )
    })

    it('should redact tokens', () => {
      logger.info('Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('[REDACTED_TOKEN]')
      )
    })

    it('should redact UUIDs (potential user IDs)', () => {
      logger.info('User ID: 550e8400-e29b-41d4-a716-446655440000')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('[REDACTED_UUID]')
      )
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test src/lib/logger.test.ts
```

Expected: Logger doesn't exist yet

**Step 3: Create logging utility**

Create `src/lib/logger.ts`:

```typescript
/**
 * Environment-aware logging utility
 * Prevents sensitive information disclosure in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development'
const isTest = import.meta.env.MODE === 'test'

/**
 * Patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  // Email addresses
  { pattern: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[REDACTED_EMAIL]' },

  // JWT tokens (eyJ... format)
  { pattern: /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, replacement: '[REDACTED_TOKEN]' },

  // UUIDs (potential user IDs, session IDs)
  { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: '[REDACTED_UUID]' },

  // API keys (starts with common prefixes)
  { pattern: /(?:api[_-]?key|apikey|key)[:\s]*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi, replacement: 'api_key: [REDACTED_API_KEY]' },

  // Password fields in objects
  { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password": "[REDACTED]"' },

  // Authorization headers
  { pattern: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/gi, replacement: 'Authorization: Bearer [REDACTED_TOKEN]' },
]

/**
 * Sanitize message by removing/redacting sensitive information
 */
function sanitize(message: string): string {
  let sanitized = message

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement)
  }

  return sanitized
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`
}

/**
 * Sanitize context object by removing sensitive fields
 */
function sanitizeContext(context: LogContext): LogContext {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization']
  const sanitized: LogContext = {}

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'string') {
      sanitized[key] = sanitize(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value as LogContext)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Logger utility with environment-aware behavior
 */
export const logger = {
  /**
   * Info level: Development only
   */
  info(message: string, context?: LogContext) {
    if (!isDevelopment && !isTest) return

    const sanitizedMessage = sanitize(message)
    const formatted = formatMessage('info', sanitizedMessage)

    if (context) {
      const sanitizedContext = sanitizeContext(context)
      console.log(formatted, sanitizedContext)
    } else {
      console.log(formatted)
    }
  },

  /**
   * Warning level: All environments (sanitized)
   */
  warn(message: string, context?: LogContext) {
    const sanitizedMessage = sanitize(message)
    const formatted = formatMessage('warn', sanitizedMessage)

    if (context) {
      const sanitizedContext = sanitizeContext(context)
      console.warn(formatted, sanitizedContext)
    } else {
      console.warn(formatted)
    }
  },

  /**
   * Error level: All environments (generic in production)
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const sanitizedMessage = sanitize(message)
    const formatted = formatMessage('error', sanitizedMessage)

    if (isDevelopment || isTest) {
      // Development: Show full error details
      console.error(formatted, error, context)
    } else {
      // Production: Generic message only, no stack trace
      console.error(formatted)

      // Optionally send to error tracking service here
      // Example: Sentry.captureException(error)
    }
  },

  /**
   * Debug level: Development only
   */
  debug(message: string, context?: LogContext) {
    if (!isDevelopment && !isTest) return

    const sanitizedMessage = sanitize(message)
    const formatted = formatMessage('debug', sanitizedMessage)

    if (context) {
      const sanitizedContext = sanitizeContext(context)
      console.debug(formatted, sanitizedContext)
    } else {
      console.debug(formatted)
    }
  },
}

/**
 * Type-safe logger for auth events
 */
export const authLogger = {
  loginSuccess(userId: string) {
    logger.info('User login successful', { userId })
  },

  loginFailed(reason: string) {
    logger.warn('User login failed', { reason: sanitize(reason) })
  },

  logoutSuccess() {
    logger.info('User logged out')
  },

  sessionExpired() {
    logger.warn('Session expired')
  },

  tokenRefreshFailed(error: Error) {
    logger.error('Token refresh failed', error)
  },
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test src/lib/logger.test.ts
```

Expected: All tests pass

**Step 5: Commit logging utility**

```bash
git add src/lib/logger.ts src/lib/logger.test.ts
git commit -m "feat: add environment-aware logging utility

- Create logger with development/production modes
- Automatically redact sensitive data (emails, tokens, UUIDs)
- Suppress verbose logs in production
- Add specialized auth logger
- Comprehensive test coverage

OWASP: Error Handling - Information Disclosure Prevention"
```

---

## Task 2: Audit and Replace Console Logs

**Files:**
- Search: All TypeScript/TSX files
- Modify: Replace console.* with logger.*

**Step 1: Find all console statements**

```bash
grep -r "console\." src/ --include="*.ts" --include="*.tsx" -n > console-audit.txt
cat console-audit.txt
```

**Step 2: Categorize findings**

Review `console-audit.txt` and categorize:
- Authentication/session logs
- Error logging
- Debug logging
- Info logging

**Step 3: Replace console statements in AuthContext**

Modify `src/contexts/AuthContext.tsx`:

```typescript
import { logger, authLogger } from '@/lib/logger'

// Replace:
console.error('Error fetching user role:', error)
// With:
logger.error('Error fetching user role', error)

// Replace:
console.error('Error signing in:', error)
// With:
authLogger.loginFailed(error.message)

// Replace:
console.log('User signed in:', user)
// With:
authLogger.loginSuccess(user.id)

// Replace:
console.log('User signed out')
// With:
authLogger.logoutSuccess()
```

**Step 4: Test auth flow still works**

```bash
npm run dev
```

Test:
1. Login → Check console (dev shows logs, production doesn't show sensitive data)
2. Logout → Check logs
3. Trigger auth error → Check error logged generically

**Step 5: Commit AuthContext changes**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "refactor: replace console logs with logger in AuthContext

- Use authLogger for authentication events
- Remove sensitive error details from production
- Maintain development debugging capability"
```

---

## Task 3: Replace Logs in Hooks and Components

**Files:**
- Modify: All hooks in `src/hooks/`
- Modify: Components with console statements

**Step 1: Audit hooks directory**

```bash
grep -r "console\." src/hooks/ -n
```

**Step 2: Create replacement script**

For each hook file:
1. Import logger
2. Replace console.log → logger.info
3. Replace console.error → logger.error
4. Replace console.warn → logger.warn
5. Replace console.debug → logger.debug

**Step 3: Test hooks still function**

```bash
npm test src/hooks/
```

Expected: All tests pass

**Step 4: Audit components**

```bash
grep -r "console\." src/components/ -n
```

**Step 5: Replace in components**

Same pattern as hooks.

**Step 6: Commit hook and component changes**

```bash
git add src/hooks/ src/components/
git commit -m "refactor: replace console logs with logger in hooks and components

- Standardize logging across application
- Remove sensitive data exposure risk
- Improve production log cleanliness"
```

---

## Task 4: Add ESLint Rule to Prevent Console Usage

**Files:**
- Modify: `.eslintrc.cjs` or `eslint.config.js`

**Step 1: Read current ESLint config**

```bash
cat .eslintrc.cjs  # or eslint.config.js
```

**Step 2: Add no-console rule**

Modify ESLint config:

```javascript
module.exports = {
  // ... existing config
  rules: {
    // ... existing rules
    'no-console': ['warn', {
      allow: ['warn', 'error']  // Allow console.warn and console.error for fallback
    }],
  },
}
```

**Step 3: Run ESLint to find remaining violations**

```bash
npm run lint
```

Expected: See warnings for any remaining console.log statements

**Step 4: Fix remaining violations**

Replace any remaining console statements found by linter.

**Step 5: Commit ESLint rule**

```bash
git add .eslintrc.cjs
git commit -m "chore: add ESLint rule to prevent console usage

- Warn on console.log, console.debug
- Allow console.warn and console.error as fallback
- Enforce use of logger utility"
```

---

## Task 5: Add Production Log Testing

**Files:**
- Create: `tests/integration/logging/production-logs.test.ts`

**Step 1: Write production log test**

Create `tests/integration/logging/production-logs.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { logger } from '@/lib/logger'

describe('Production Logging Behavior', () => {
  const originalEnv = import.meta.env.MODE

  afterEach(() => {
    // Restore environment
    import.meta.env.MODE = originalEnv
  })

  it('should not expose sensitive data in production', () => {
    import.meta.env.MODE = 'production'
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    logger.info('User email: user@example.com logged in')

    // Should redact email
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('user@example.com')
    )

    consoleLogSpy.mockRestore()
  })

  it('should not log error stack traces in production', () => {
    import.meta.env.MODE = 'production'
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Database connection failed: postgres://...')
    logger.error('Database error', error)

    // Should not expose error details
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ message: expect.any(String) })
    )

    consoleErrorSpy.mockRestore()
  })

  it('should redact JWT tokens', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    logger.info(`User token: ${token}`)

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('[REDACTED_TOKEN]')
    )

    consoleLogSpy.mockRestore()
  })
})
```

**Step 2: Run test**

```bash
npm test tests/integration/logging/production-logs.test.ts
```

Expected: All tests pass

**Step 3: Commit test**

```bash
git add tests/integration/logging/production-logs.test.ts
git commit -m "test: add production logging security tests

- Verify sensitive data is redacted
- Ensure error details hidden in production
- Test JWT token redaction"
```

---

## Task 6: Add Error Monitoring Service (Optional)

**Files:**
- Create: `src/lib/error-monitoring.ts`
- Modify: `src/lib/logger.ts` to integrate

**Step 1: Choose error monitoring service**

Options:
- Sentry (most popular)
- LogRocket
- Rollbar
- Custom solution

For this plan, we'll set up Sentry integration.

**Step 2: Install Sentry SDK**

```bash
npm install @sentry/react @sentry/vite-plugin
```

**Step 3: Create error monitoring wrapper**

Create `src/lib/error-monitoring.ts`:

```typescript
import * as Sentry from '@sentry/react'

const isDevelopment = import.meta.env.DEV

/**
 * Initialize error monitoring (call in main.tsx)
 */
export function initErrorMonitoring() {
  if (isDevelopment) {
    console.log('[Dev] Error monitoring disabled in development')
    return
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1, // 10% of transactions

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }

      // Redact sensitive URL parameters
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/token=[^&]+/g, 'token=[REDACTED]')
      }

      return event
    },

    ignoreErrors: [
      // Ignore browser extension errors
      'Non-Error promise rejection captured',
      // Ignore network errors (user offline)
      'NetworkError',
      'Failed to fetch',
    ],
  })
}

/**
 * Log error to monitoring service
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (isDevelopment) {
    console.error('[Dev] Would send to Sentry:', error, context)
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}
```

**Step 4: Integrate with logger**

Modify `src/lib/logger.ts`, in the error function:

```typescript
import { captureError } from './error-monitoring'

// In logger.error():
if (!isDevelopment) {
  console.error(formatted)

  // Send to error monitoring
  if (error instanceof Error) {
    captureError(error, context)
  }
}
```

**Step 5: Initialize in main.tsx**

Modify `src/main.tsx`:

```typescript
import { initErrorMonitoring } from './lib/error-monitoring'

initErrorMonitoring()

// ... rest of app initialization
```

**Step 6: Test error monitoring**

Trigger an error and verify it shows up in Sentry dashboard.

**Step 7: Commit error monitoring**

```bash
git add src/lib/error-monitoring.ts src/lib/logger.ts src/main.tsx package.json
git commit -m "feat: integrate Sentry error monitoring

- Add error-monitoring wrapper for Sentry
- Filter sensitive data before sending
- Integrate with logger utility
- Development mode disabled"
```

---

## Verification Checklist

- [ ] Logger utility created with environment awareness
- [ ] Sensitive patterns redacted (emails, tokens, UUIDs)
- [ ] All console.* statements replaced in AuthContext
- [ ] All console.* statements replaced in hooks
- [ ] All console.* statements replaced in components
- [ ] ESLint rule added to prevent future console usage
- [ ] Production log tests pass
- [ ] Error monitoring integrated (optional)
- [ ] Documentation updated
- [ ] All tests pass
- [ ] Lint passes
- [ ] Type checking passes

---

## Rollback Plan

If logging changes cause issues:

1. **Logger utility issue:**
   - Revert to console.error temporarily
   - Fix logger, redeploy

2. **Missing logs for debugging:**
   - Temporarily enable production logging
   - Add specific debug logs where needed

3. **Error monitoring issues:**
   - Disable Sentry in environment
   - Fall back to logger only

---

## Success Criteria

✅ No sensitive information in production logs
✅ Development logs remain verbose for debugging
✅ ESLint prevents new console.log usage
✅ Error monitoring captures production errors securely
✅ Tests verify log sanitization
✅ All auth flows still work correctly
✅ No console errors or warnings

---

## References

- [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Sentry Security](https://docs.sentry.io/security-legal-pii/security/)
