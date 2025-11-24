# Project-Wide Production Safety Strategy

**Purpose:** Comprehensive plan to prevent production issues across the entire PipeTrak V2 application

**Status:** Recommendations - Not yet implemented

---

## 1. Testing Strategy

### Critical User Journeys (E2E Tests Needed)

These are the flows users depend on daily. Breaking any of these = production incident.

#### Authentication & Onboarding
- [ ] **User registration flow**
  - Sign up → Email verification → Profile setup → Join project
  - Test: New user can register and access project

- [ ] **Login and session management**
  - Login → Dashboard → Logout → Login again
  - Test: Sessions persist, logout works, re-auth succeeds

#### Component Management (Core Feature)
- [ ] **Component creation flow**
  - Import CSV → Components created → Display in table → Edit metadata
  - Test: Bulk import works, data displays, edits save

- [ ] **Component milestone updates**
  - Open drawing → Check milestone → Progress updates → View refreshes
  - Test: Full data flow from UI → DB → Trigger → View → UI

- [ ] **Component metadata assignment**
  - Select components → Assign area/system/package → Verify in drawing table
  - Test: Bulk assignment works, cache invalidates, displays correctly

#### Drawing Management
- [ ] **Drawing import and display**
  - Import drawings → Parse metadata → Display in table → Filter/sort
  - Test: CSV import works, metadata extracted, table renders

- [ ] **Drawing progress calculation**
  - Update component → Drawing progress recalculates → Displays in table
  - Test: Progress aggregation accurate, materialized view refreshes

#### Package Workflows
- [ ] **Test package creation and assignment**
  - Create package → Assign components → View package detail → Check readiness
  - Test: Package workflow complete, readiness calculates correctly

- [ ] **Package lifecycle (Feature 030)**
  - Open → In Progress → Ready for Test → Testing → Complete
  - Test: State transitions work, permissions enforced

#### Reporting
- [ ] **PDF report generation**
  - Select report type → Generate → Download → Verify contents
  - Test: All report types work, PDFs contain correct data

- [ ] **Weekly progress reports**
  - View report → Filter by date → Export → Verify calculations
  - Test: Progress calculations match expected values

#### Team Management
- [ ] **User invitation flow**
  - Send invite → User accepts → Permissions applied → Access verified
  - Test: Invitation email sent, signup works, roles enforced

### Test Pyramid Structure

```
                    E2E Tests (10-15)
                   Critical user journeys
                  Slow, expensive, high value
                 /                      \
                /                        \
        Integration Tests (50-100)        \
       Feature workflows, API tests        \
      Hooks + DB, Component + State         \
     /                                        \
    /                                          \
   Unit Tests (200-500)                        Manual QA
  Pure functions, components,                  Exploratory
 utilities, business logic                     New features
```

**Target Coverage:**
- Unit tests: 80% overall, 90% for critical business logic
- Integration tests: All hooks, all RPC functions
- E2E tests: 15 critical user journeys

---

## 2. CI/CD Pipeline

### GitHub Actions Workflow (Expand Existing)

Current pipeline is good but needs additions:

```yaml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - Lint code (✅ Already exists)

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - Type check (✅ Already exists)

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - Run unit tests (✅ Already exists)
      - Upload coverage report
      - Fail if coverage < 70% (✅ Already exists)

  integration-tests: # ⚠️ NEEDS TO BE ADDED
    runs-on: ubuntu-latest
    steps:
      - Setup Supabase local
      - Run migrations
      - Seed test data
      - Run integration tests
      - Verify database state

  e2e-tests: # ⚠️ NEEDS TO BE ADDED
    runs-on: ubuntu-latest
    steps:
      - Deploy to preview environment
      - Run Playwright E2E tests
      - Record videos on failure

  build:
    runs-on: ubuntu-latest
    steps:
      - Build application (✅ Already exists)
      - Check bundle size
      - Fail if size > threshold

  security-scan: # ⚠️ NEEDS TO BE ADDED
    runs-on: ubuntu-latest
    steps:
      - npm audit
      - Check for vulnerable dependencies
      - Fail on high/critical vulnerabilities

  deploy-staging: # ⚠️ NEEDS TO BE ADDED
    if: branch == 'develop'
    needs: [lint, typecheck, unit-tests, integration-tests, e2e-tests, build]
    steps:
      - Deploy to staging environment
      - Run smoke tests
      - Notify team

  deploy-production:
    if: branch == 'main'
    needs: [lint, typecheck, unit-tests, integration-tests, e2e-tests, build]
    steps:
      - Deploy to production (✅ Auto via Vercel)
      - Wait 5 minutes
      - Run production smoke tests # ⚠️ ADD THIS
      - Monitor error rates # ⚠️ ADD THIS
```

---

## 3. Staging Environment Strategy

### Current State
- ⚠️ **No dedicated staging environment mentioned in CLAUDE.md**
- Migrations are tested on remote database directly
- Frontend deploys straight to production via Vercel

### Required Setup

#### 3.1 Staging Database
```bash
# Create staging project in Supabase Dashboard
# Link to staging
supabase link --project-ref <staging-project-ref>

# Update .env.staging
VITE_SUPABASE_URL=<staging-url>
VITE_SUPABASE_ANON_KEY=<staging-key>
```

#### 3.2 Staging Deployment
```bash
# Vercel staging environment
# Configure in vercel.json
{
  "env": {
    "VITE_SUPABASE_URL": "@staging-supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@staging-supabase-key"
  }
}
```

#### 3.3 Staging Data
- **Seed script with realistic test data**
- Copy of production schema (anonymized user data)
- Representative dataset (1000+ components, 50+ drawings, 10+ projects)

#### 3.4 Staging Workflow
```
1. Develop feature locally
2. Push to 'develop' branch
3. Auto-deploy to staging
4. Run automated tests on staging
5. Manual QA on staging
6. Merge to 'main' if passing
7. Auto-deploy to production
```

---

## 4. Monitoring & Observability

### 4.1 Error Tracking (CRITICAL - Not Currently Implemented)

**Recommended:** Sentry or LogRocket

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE, // 'development' | 'staging' | 'production'
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**What to track:**
- JavaScript errors (unhandled exceptions)
- Failed mutations (Supabase RPC errors)
- Failed queries (data fetch errors)
- Performance issues (slow page loads)
- User session replays for bug reproduction

### 4.2 Application Metrics

**Recommended:** Vercel Analytics + Custom Events

```typescript
// Track critical events
analytics.track('milestone_updated', {
  component_type: 'spool',
  milestone: 'Erect',
  success: true,
});

analytics.track('pdf_generated', {
  report_type: 'field_weld',
  component_count: 50,
  generation_time_ms: 1234,
});
```

**Key metrics to monitor:**
- Daily active users
- Milestone updates per day
- Failed mutations per hour
- Average page load time
- PDF generation success rate
- CSV import success rate

### 4.3 Database Monitoring

**Supabase Dashboard Metrics:**
- Query performance (slow queries > 1s)
- Connection pool usage
- RLS policy performance
- Storage usage

**Custom alerts:**
- All projects showing 0% progress (today's bug would trigger this)
- High failed RPC call rate
- Materialized view staleness (last refresh > 5 minutes)
- Unusual spike in data mutations

### 4.4 Alert Configuration

```yaml
# Example alert rules
alerts:
  - name: "Zero Progress Detected"
    condition: "avg(project.avg_percent_complete) < 1 for 5 minutes"
    severity: critical
    notify: ["team@pipetrak.com", "slack:#alerts"]

  - name: "High Error Rate"
    condition: "error_count > 50 per minute"
    severity: high
    notify: ["team@pipetrak.com"]

  - name: "Failed Mutations Spike"
    condition: "failed_mutations > 10 per minute"
    severity: medium
    notify: ["slack:#monitoring"]

  - name: "Slow Page Load"
    condition: "p95_load_time > 3000ms"
    severity: low
    notify: ["slack:#performance"]
```

---

## 5. Code Quality & Review Process

### 5.1 Pre-Commit Hooks (Husky + lint-staged)

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.sql": [
      "sql-lint",
      "check-migration-checklist.js" // ⚠️ ADD THIS
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test && npm run build"
    }
  }
}
```

### 5.2 Code Review Requirements

**All PRs must have:**
- [ ] **Description** - What changed and why
- [ ] **Test plan** - How was this tested?
- [ ] **Screenshots** - For UI changes
- [ ] **Database changes** - Migration checklist if applicable
- [ ] **Breaking changes** - Impact analysis if type changes

**Approval requirements:**
- **Small changes** (< 100 lines): 1 approval
- **Medium changes** (100-500 lines): 1 approval + passing CI
- **Large changes** (> 500 lines): 2 approvals + passing CI
- **Database migrations**: 2 approvals (backend + frontend)
- **Data type changes**: Impact analysis + 2 approvals + staging verification

### 5.3 Branch Strategy

```
main (production)
  ↑
  merge after staging verification
  ↑
develop (staging)
  ↑
  merge after code review
  ↑
feature/feature-name (local development)
```

**Rules:**
- **main** - Protected, requires passing CI + approvals
- **develop** - Protected, auto-deploys to staging
- **feature/*** - Personal branches, deleted after merge

---

## 6. Deployment Process

### 6.1 Database Migrations

**Current process is good, enhance with:**

```bash
# 1. Create migration
supabase migration new feature_name

# 2. Write migration + impact analysis (if type change)

# 3. Test locally
./db-push.sh

# 4. Deploy to staging
SUPABASE_PROJECT_REF=staging ./db-push.sh

# 5. Run staging tests
npm run test:e2e:staging

# 6. Manual verification on staging
# (Follow checklist from PRODUCTION-SAFETY.md)

# 7. Deploy to production (only after staging passes)
./db-push.sh

# 8. Monitor for 15 minutes
```

### 6.2 Frontend Deployments

**Current (Vercel auto-deploy) is good, add:**

```yaml
# vercel.json
{
  "github": {
    "enabled": true,
    "silent": false
  },
  "build": {
    "env": {
      "VITE_ENABLE_MONITORING": "true"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

**Post-deploy verification:**
```bash
# Automated smoke tests (add this script)
npm run smoke-test:production

# Checks:
# - Home page loads (200 OK)
# - Login page loads
# - API health check passes
# - No console errors on critical pages
```

### 6.3 Rollback Procedure

**Frontend (Vercel):**
```bash
# Instant rollback via Vercel dashboard
# OR via CLI:
vercel rollback
```

**Database (migrations):**
```bash
# Create rollback migration
supabase migration new rollback_feature_name

# Write DOWN migration (reverse of UP)
# Push to production
./db-push.sh
```

---

## 7. Documentation Standards

### 7.1 Required Documentation

**For every feature:**
- [ ] **Architecture decision record** (docs/adr/XXX-feature-name.md)
- [ ] **API documentation** (if new RPCs added)
- [ ] **User guide update** (if user-facing feature)
- [ ] **KNOWLEDGE-BASE.md entry** (if critical pattern)

**For every migration:**
- [ ] **Migration comment** (what and why)
- [ ] **Impact analysis** (if data type change)
- [ ] **Rollback procedure** (if complex migration)

### 7.2 Runbooks

Create docs/runbooks/ with:
- `production-incident.md` - What to do when production breaks
- `rollback-procedure.md` - How to rollback safely
- `database-access.md` - How to query production database safely
- `user-impersonation.md` - How to debug user-specific issues

---

## 8. Security

### 8.1 Dependency Management

```bash
# Weekly automated check
npm audit

# Automatic PRs for updates (Dependabot)
# Configure in .github/dependabot.yml
```

### 8.2 Secret Management

**Never commit:**
- Service role keys
- API keys
- Database passwords
- Signing certificates

**Use environment variables:**
```bash
# .env (gitignored)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=... # OK to expose (anon key)
SUPABASE_SERVICE_ROLE_KEY=... # NEVER expose in frontend
```

### 8.3 RLS Audit

**Quarterly audit:**
- [ ] Review all RLS policies
- [ ] Test with multiple user contexts
- [ ] Verify SECURITY DEFINER functions have permission checks
- [ ] Check for RLS bypass vulnerabilities

---

## 9. Performance

### 9.1 Performance Budgets

**Set limits:**
- Initial page load: < 2 seconds (3G network)
- Time to interactive: < 3 seconds
- Largest contentful paint: < 2.5 seconds
- Bundle size: < 500KB (main chunk)

**Monitor in CI:**
```bash
# Add to GitHub Actions
npm run build
npx bundlesize
# Fails if bundle size exceeds budget
```

### 9.2 Database Query Optimization

**Monthly review:**
- Slow queries (> 1s execution time)
- Missing indexes
- N+1 query patterns
- Materialized view refresh performance

---

## 10. Incident Response

### 10.1 Severity Levels

**P0 - Critical (< 30 min response)**
- Application completely down
- Data loss occurring
- Security breach

**P1 - High (< 2 hours response)**
- Major feature broken (today's milestone bug)
- Performance severely degraded
- Affecting multiple users

**P2 - Medium (< 1 day response)**
- Minor feature broken
- Workaround available
- Affecting single user

**P3 - Low (< 1 week response)**
- Cosmetic issues
- Feature request
- Documentation issue

### 10.2 Incident Response Process

1. **Detect** - Monitoring alerts, user report
2. **Assess** - Severity level, impact, affected users
3. **Communicate** - Notify team, update status page
4. **Mitigate** - Rollback or hotfix
5. **Resolve** - Root cause fix, deploy, verify
6. **Post-mortem** - Document in docs/incidents/YYYY-MM-DD-description.md

### 10.3 Post-Mortem Template

```markdown
# Incident: [Title]
**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2/P3
**Duration:** X hours
**Affected Users:** X users / X projects

## Timeline
- HH:MM - Incident detected
- HH:MM - Team notified
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Impact
- What broke
- How many users affected
- Data loss? (yes/no)

## Root Cause
- Technical explanation
- Why didn't our safeguards catch this?

## Resolution
- What was the fix?
- Is it permanent or temporary?

## Action Items
- [ ] Item 1 (assigned to: person, due: date)
- [ ] Item 2
- [ ] Item 3

## Lessons Learned
- What worked well
- What could be improved
- Process changes needed
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
- [ ] Set up Sentry for error tracking
- [ ] Add pre-commit hooks (Husky + lint-staged)
- [ ] Create staging environment
- [ ] Write 5 critical E2E tests
- [ ] Add production smoke tests
- [ ] Create incident response runbook

### Phase 2: Testing Infrastructure (2-4 weeks)
- [ ] Increase unit test coverage to 80%
- [ ] Write 20 integration tests (all hooks + RPCs)
- [ ] Add remaining E2E tests (15 total)
- [ ] Set up test data seeding for staging
- [ ] Add CI/CD integration tests stage

### Phase 3: Monitoring & Alerts (1-2 weeks)
- [ ] Configure Sentry alerts
- [ ] Set up custom monitoring dashboard
- [ ] Add database performance monitoring
- [ ] Create alert rules
- [ ] Set up on-call rotation

### Phase 4: Process Improvements (Ongoing)
- [ ] Enforce 2-approval rule for migrations
- [ ] Require staging verification for all deploys
- [ ] Quarterly RLS audits
- [ ] Monthly performance reviews
- [ ] Bi-weekly dependency updates

---

## Success Metrics

**Track quarterly:**
- **Mean time to detect (MTTD):** < 5 minutes
- **Mean time to resolve (MTTR):** < 2 hours
- **Incidents per quarter:** < 5 P1+
- **Test coverage:** > 80%
- **Failed deployments:** < 5%
- **Rollback rate:** < 2%

---

## Conclusion

This is a **comprehensive production safety strategy** for the entire PipeTrak V2 project. It goes far beyond just milestone testing to cover:

- Testing all critical user journeys
- CI/CD automation
- Staging environment
- Error tracking & monitoring
- Code quality & review
- Deployment safety
- Incident response

**Priority:** Start with Phase 1 (Quick Wins) to get immediate safety improvements, then gradually implement the rest.

**Remember:** Production safety is not a one-time task - it's an ongoing process of improvement, monitoring, and learning from incidents.
