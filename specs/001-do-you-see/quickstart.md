# Quickstart: Sprint 0 Infrastructure Verification

**Purpose**: Verify that Sprint 0 infrastructure is correctly configured and all 7 success criteria are met.

**Target Audience**: Developers setting up local environment for the first time, or validating Sprint 0 completion.

**Expected Time**: 10-15 minutes (assuming Supabase project already provisioned)

---

## Prerequisites

- ✅ Node.js 20+ installed (`node --version`)
- ✅ npm 10+ installed (`npm --version`)
- ✅ Git installed and repository cloned
- ✅ Supabase staging project provisioned by project lead (URL and anon key available)

---

## Step 1: Install Dependencies

```bash
npm install
```

**Expected Output**:
```
added 847 packages in 23s
```

**Verification**: No errors, `node_modules/` directory created

---

## Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Expected Output**: `.env` file created with valid Supabase URL and key

**Verification**: `.env` file exists, `VITE_SUPABASE_URL` starts with `https://`, key is non-empty

---

## Step 3: Install Supabase CLI

```bash
npm install -g supabase
```

**Expected Output**:
```
added 1 package in 2s
```

**Verification**:
```bash
supabase --version
```

Output should be `1.x.x` or higher

---

## Step 4: Initialize Supabase Local Development

```bash
# Initialize supabase directory (if not already done)
supabase init

# Link to staging project (use project ref from Supabase dashboard)
supabase link --project-ref <your-project-ref>
```

**Expected Output**:
```
Finished supabase init.
Linked to project <your-project-ref>
```

**Verification**: `supabase/config.toml` file exists

---

## Step 5: Apply Database Migrations

```bash
supabase db reset
```

**Expected Output**:
```
Applying migration 00001_initial_schema.sql...
Seeding data...
Finished supabase db reset.
```

**Verification**:
```bash
supabase db diff
```

Output should be `No schema changes detected.`

---

## Step 6: Generate TypeScript Types

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

**Expected Output**: No console output (silent success)

**Verification**:
```bash
cat src/types/database.types.ts | head -20
```

Should show TypeScript type definitions starting with:
```typescript
export type Json =
  | string
  | number
  ...
```

---

## Step 7: Run Type Check

```bash
tsc -b
```

**Expected Output**: No output (silent success means types are valid)

**Verification**: Exit code 0, no TypeScript errors

---

## Step 8: Run Tests with Coverage

```bash
npm test
```

**Expected Output**:
```
✓ src/contexts/AuthContext.test.tsx (3 tests)
  ✓ AuthContext
    ✓ provides session when authenticated
    ✓ provides null when unauthenticated
    ✓ calls sign Out on logout

✓ src/components/ProtectedRoute.test.tsx (2 tests)
  ✓ ProtectedRoute
    ✓ redirects when unauthenticated
    ✓ renders children when authenticated

Test Files  2 passed (2)
     Tests  5 passed (5)
  Start at  14:32:45
  Duration  1.2s

% Coverage report from v8
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   82.14 |    75.00 |   85.71 |   82.14 |
 contexts/          |   90.00 |    80.00 |  100.00 |   90.00 |
  AuthContext.tsx   |   90.00 |    80.00 |  100.00 |   90.00 |
 components/        |   75.00 |    66.67 |   75.00 |   75.00 |
  ProtectedRoute.tsx|   75.00 |    66.67 |   75.00 |   75.00 |
--------------------|---------|----------|---------|---------|
```

**Verification**:
- ✅ All tests pass (5/5)
- ✅ Coverage ≥70% overall
- ✅ Coverage ≥80% for src/contexts/ (if src/lib/ has files)
- ✅ Coverage ≥60% for src/components/

---

## Step 9: Run Build

```bash
npm run build
```

**Expected Output**:
```
vite v6.0.5 building for production...
✓ 847 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-BwR4T2xk.css   12.34 kB │ gzip:  3.21 kB
dist/assets/index-CpY3hXzQ.js   143.22 kB │ gzip: 46.18 kB
✓ built in 2.34s
```

**Verification**:
- ✅ Build succeeds (exit code 0)
- ✅ `dist/` directory created
- ✅ `dist/index.html` exists
- ✅ Build time <2 minutes

---

## Step 10: Verify CI Pipeline

```bash
# Push changes to feature branch
git add .
git commit -m "test: verify Sprint 0 infrastructure"
git push origin 001-do-you-see
```

**Expected Output**: GitHub Actions workflow triggers automatically

**Verification**:
1. Navigate to https://github.com/<your-org>/<your-repo>/actions
2. Find workflow run for your commit
3. Verify all 4 steps pass:
   - ✅ Lint (`npm run lint`)
   - ✅ Type Check (`tsc -b`)
   - ✅ Test (`npm test -- --coverage`)
   - ✅ Build (`npm run build`)
4. Pipeline completes in <5 minutes
5. If any step fails, error logs are accessible via Actions UI

---

## Step 11: Verify Vercel Deployment

**Expected Output**: Vercel preview deployment succeeds automatically after CI passes

**Verification**:
1. Check GitHub PR or commit status for Vercel deployment link
2. Click preview URL (should be https://pipetrak-v2-<branch>.vercel.app)
3. Verify app loads without errors
4. Verify routing works (navigate to `/` shows login page)

---

## Success Criteria (7 of 7)

- [x] **CI Pipeline Green**: All checks (lint, type-check, test, build) pass on main branch
- [x] **Test Coverage Met**: `npm test` reports ≥70% overall coverage, ≥80% for src/lib/, ≥60% for src/components/
- [x] **Supabase Accessible**: Staging environment reachable with `.env` configured, can run migrations
- [x] **Types Generated**: `src/types/database.types.ts` exists with types for organizations, users, projects tables
- [x] **Auth Tests Passing**: AuthContext and ProtectedRoute have ≥80% test coverage with all tests green
- [x] **Deployment Working**: Vercel staging deployment succeeds and serves functional app
- [x] **Documentation Current**: CLAUDE.md includes setup instructions, coverage requirements, CI overview

---

## Troubleshooting

### Issue: `npm test` fails with "Cannot find module '@/lib/supabase'"`
**Solution**: Verify path aliases are configured in `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

### Issue: `supabase db reset` fails with "connection refused"
**Solution**: Ensure Docker is running and `supabase start` has been executed (for local development)

### Issue: Coverage below 70%
**Solution**: Run `npm test -- --coverage --reporter=html` and open `coverage/index.html` to identify uncovered lines

### Issue: CI pipeline times out
**Solution**: Check GitHub Actions logs for slow step. Add caching if `npm ci` is slow:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

### Issue: Vercel deployment fails with "Build failed"
**Solution**: Verify `.env.example` is committed and Vercel environment variables are configured in dashboard

---

## Next Steps

After all 11 steps pass:
1. ✅ Sprint 0 infrastructure is complete
2. ✅ Ready to proceed to Sprint 1 (full database schema, business logic)
3. ✅ Run `/tasks` to generate implementation tasks for next sprint

**Congratulations!** Your development environment is production-ready.
