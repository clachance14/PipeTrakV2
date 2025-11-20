# Add Content Security Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Content Security Policy (CSP) headers to prevent XSS attacks and unauthorized script execution

**Architecture:** Add CSP meta tag to index.html with restrictive directives. Configure allowed sources for scripts, styles, images, and connections. Test application functionality to ensure CSP doesn't break features. Add reporting mechanism for CSP violations.

**Tech Stack:** HTML meta tags, Vite configuration, React application

**OWASP Reference:** [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

**Priority:** 🔴 CRITICAL

---

## Current Vulnerability

**File:** `index.html`

**Issue:** No Content Security Policy configured, allowing any script to execute.

**Risk:** XSS attacks can inject and execute malicious scripts, steal user data, or perform unauthorized actions.

---

## Task 1: Add Basic CSP Meta Tag

**Files:**
- Modify: `index.html`
- Read: `vite.config.ts` to understand build configuration

**Step 1: Read current index.html**

```bash
cat index.html
```

**Step 2: Add CSP meta tag to index.html**

Modify `index.html` in the `<head>` section, before the `<title>` tag:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Content Security Policy -->
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: https://*.supabase.co;
      font-src 'self' data:;
      connect-src 'self' https://*.supabase.co wss://*.supabase.co;
      frame-src 'none';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      upgrade-insecure-requests;
    ">

    <title>PipeTrak V2</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Note:** We start with `'unsafe-inline'` and `'unsafe-eval'` to ensure the app works, then tighten in Task 3.

**Step 3: Test application starts**

Run:
```bash
npm run dev
```

Navigate to: `http://localhost:5173`

Expected: Application loads without console errors

**Step 4: Check browser console for CSP violations**

Open browser DevTools Console tab.

Expected: May see CSP warnings, but application should function.

**Step 5: Commit basic CSP**

```bash
git add index.html
git commit -m "feat: add initial Content Security Policy

- Add CSP meta tag to index.html
- Allow Supabase domains for scripts and connections
- Use unsafe-inline and unsafe-eval initially
- Next step: tighten policy and remove unsafe directives

OWASP: Content Security Policy"
```

---

## Task 2: Test Application Functionality with CSP

**Files:**
- Test: All major application features

**Step 1: Test authentication flow**

1. Navigate to login page
2. Attempt login with test credentials
3. Check for CSP violations in console
4. Verify successful authentication

Expected: Login works, no CSP blocks

**Step 2: Test Supabase realtime connections**

1. Navigate to a page with live data (e.g., components table)
2. Make changes in Supabase dashboard
3. Verify realtime updates work
4. Check console for WebSocket CSP issues

Expected: Realtime updates work, no CSP blocks on `wss://*.supabase.co`

**Step 3: Test image loading**

1. Navigate to pages with images (if any)
2. Check that all images load correctly
3. Look for blocked image requests in console

Expected: All images load

**Step 4: Test third-party integrations**

1. Test any third-party scripts (analytics, monitoring, etc.)
2. Check console for blocked requests
3. Add domains to CSP if needed

Expected: All integrations work or are properly blocked

**Step 5: Document CSP violations**

Create `docs/security/CSP-VIOLATIONS.md`:

```markdown
# CSP Violations During Testing

Date: 2025-11-18

## Allowed Violations
- `unsafe-inline` for styles: Required by Tailwind CSS
- `unsafe-inline` for scripts: Required by Vite in development
- `unsafe-eval`: Required by Vite HMR in development

## Blocked Violations (Expected)
- External scripts from unknown domains
- Inline event handlers (onclick, etc.)
- javascript: URIs

## Action Items
- [ ] Remove unsafe-inline for scripts in production build
- [ ] Remove unsafe-eval in production build
- [ ] Use nonce or hash for inline styles if possible
```

**Step 6: Commit test results**

```bash
git add docs/security/CSP-VIOLATIONS.md
git commit -m "docs: document CSP testing results and violations"
```

---

## Task 3: Tighten CSP for Production

**Files:**
- Create: `scripts/generate-csp.js`
- Modify: `vite.config.ts`
- Modify: `index.html` (for production builds)

**Step 1: Create environment-specific CSP**

Create `scripts/generate-csp.js`:

```javascript
/**
 * Generate Content Security Policy based on environment
 */
export function generateCSP(isDevelopment) {
  const basePolicy = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "https://*.supabase.co"],
    'style-src': ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
    'img-src': ["'self'", "data:", "blob:", "https://*.supabase.co"],
    'font-src': ["'self'", "data:"],
    'connect-src': ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
  }

  // Development needs unsafe-inline and unsafe-eval for Vite HMR
  if (isDevelopment) {
    basePolicy['script-src'].push("'unsafe-inline'", "'unsafe-eval'")
  }

  // Convert to CSP string
  return Object.entries(basePolicy)
    .map(([directive, sources]) =>
      sources.length > 0
        ? `${directive} ${sources.join(' ')}`
        : directive
    )
    .join('; ')
}
```

**Step 2: Update Vite config to inject CSP**

Modify `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { generateCSP } from './scripts/generate-csp'

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'
  const csp = generateCSP(isDevelopment)

  return {
    plugins: [
      react(),
      {
        name: 'html-inject-csp',
        transformIndexHtml(html) {
          return html.replace(
            '<head>',
            `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
          )
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
```

**Step 3: Remove manual CSP from index.html**

Remove the CSP meta tag from `index.html` (it will be injected by Vite):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- CSP will be injected by Vite -->
    <title>PipeTrak V2</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 4: Test development build**

```bash
npm run dev
```

Expected: Application works with CSP injected (check view-source)

**Step 5: Test production build**

```bash
npm run build
npm run preview
```

Expected: Application works without unsafe-inline/unsafe-eval for scripts

**Step 6: Commit production CSP**

```bash
git add scripts/generate-csp.js vite.config.ts index.html
git commit -m "feat: implement environment-specific CSP

- Create CSP generator script
- Inject CSP via Vite plugin
- Remove unsafe-inline/unsafe-eval in production
- Keep unsafe directives only for development HMR

OWASP: Content Security Policy"
```

---

## Task 4: Add CSP Reporting

**Files:**
- Modify: `scripts/generate-csp.js`
- Create: `supabase/functions/csp-report/index.ts`

**Step 1: Create CSP report endpoint**

Create `supabase/functions/csp-report/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || '*',
  'Access-Control-Allow-Headers': 'content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const report = await req.json()

    console.log('CSP Violation Report:', {
      documentUri: report['csp-report']?.['document-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      sourceFile: report['csp-report']?.['source-file'],
      lineNumber: report['csp-report']?.['line-number'],
      timestamp: new Date().toISOString(),
    })

    // In production, you might want to store these in a database
    // or send to a monitoring service

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing CSP report:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process report' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
```

**Step 2: Deploy CSP report function**

```bash
supabase functions deploy csp-report --linked
```

**Step 3: Add report-uri to CSP generator**

Modify `scripts/generate-csp.js`:

```javascript
export function generateCSP(isDevelopment) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''

  const basePolicy = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "https://*.supabase.co"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "data:", "blob:", "https://*.supabase.co"],
    'font-src': ["'self'", "data:"],
    'connect-src': ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
    'report-uri': [`${supabaseUrl}/functions/v1/csp-report`],
  }

  if (isDevelopment) {
    basePolicy['script-src'].push("'unsafe-inline'", "'unsafe-eval'")
  }

  return Object.entries(basePolicy)
    .map(([directive, sources]) =>
      sources.length > 0
        ? `${directive} ${sources.join(' ')}`
        : directive
    )
    .join('; ')
}
```

**Step 4: Test CSP reporting**

1. Intentionally violate CSP (try to load external script in console)
2. Check Supabase function logs:
   ```bash
   supabase functions logs csp-report --linked
   ```
3. Verify violation report is received

Expected: Violation logged in function logs

**Step 5: Commit CSP reporting**

```bash
git add scripts/generate-csp.js supabase/functions/csp-report/
git commit -m "feat: add CSP violation reporting

- Create csp-report Edge Function
- Add report-uri directive to CSP
- Log violations for monitoring
- Ready for integration with monitoring service

OWASP: Content Security Policy"
```

---

## Task 5: Add Additional Security Headers via Deployment Platform

**Files:**
- Documentation: How to configure in Vercel/Netlify

**Step 1: Create security headers configuration**

Create `docs/security/SECURITY-HEADERS.md`:

```markdown
# Security Headers Configuration

## Vercel Configuration

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

## Testing Security Headers

Use https://securityheaders.com to scan your deployed site.

Target Grade: A+

## Header Explanations

- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Enables browser XSS filter (legacy but harmless)
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features
- **Strict-Transport-Security**: Enforces HTTPS
```

**Step 2: Create vercel.json**

Create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

**Step 3: Test headers locally**

```bash
npm run preview
curl -I http://localhost:4173
```

Note: These headers won't show locally, only after Vercel deployment

**Step 4: Deploy and verify**

After deploying to Vercel:

```bash
curl -I https://your-app.vercel.app
```

Expected: All security headers present in response

**Step 5: Commit Vercel configuration**

```bash
git add vercel.json docs/security/SECURITY-HEADERS.md
git commit -m "feat: add security headers configuration for Vercel

- Add X-Frame-Options, X-Content-Type-Options
- Add Strict-Transport-Security for HTTPS
- Add Permissions-Policy to restrict browser features
- Document header purposes

OWASP: HTTP Headers Security"
```

---

## Verification Checklist

- [ ] CSP meta tag present in built HTML
- [ ] Development build includes unsafe-inline/unsafe-eval for scripts
- [ ] Production build removes unsafe directives
- [ ] Application functions correctly with CSP enabled
- [ ] Supabase connections (API and WebSocket) work
- [ ] Images load correctly
- [ ] Styles apply correctly
- [ ] CSP violations are reported to Edge Function
- [ ] Security headers configured in vercel.json
- [ ] Documentation updated
- [ ] All tests pass
- [ ] Changes committed

---

## Rollback Plan

If CSP breaks application:

1. **Quick fix:** Disable CSP temporarily
   ```html
   <!-- Comment out CSP in index.html -->
   <!-- <meta http-equiv="Content-Security-Policy" content="..."> -->
   ```

2. **Check console:** Identify which directive is blocking legitimate resources

3. **Adjust CSP:** Add missing domains or directives

4. **Test incrementally:** Enable one directive at a time

---

## Success Criteria

✅ Application functions correctly with CSP enabled
✅ Development build works with Vite HMR
✅ Production build has restrictive CSP (no unsafe-inline for scripts)
✅ CSP violations are logged
✅ Security headers scan shows A+ grade
✅ No console errors related to CSP
✅ All Supabase connections work
✅ Documentation is complete

---

## References

- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers Scanner](https://securityheaders.com/)
