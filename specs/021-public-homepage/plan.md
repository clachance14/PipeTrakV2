# Implementation Plan: Custom Demo Signup Emails via Resend

**Branch**: `021-public-homepage` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-public-homepage/spec.md` (Enhancement to Feature 021)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace Supabase's default magic link email with custom-branded emails sent via Resend for demo user signups. Generate magic link token using `supabase.auth.admin.generateLink()` in the existing `demo-signup` Edge Function, then call Resend API with custom HTML email template containing welcome message, PipeTrak value proposition, quick start guide, and authentication link. Email template stored in dedicated TypeScript file for easy editing.

## Technical Context

**Language/Version**: TypeScript (Deno runtime for Supabase Edge Functions)
**Primary Dependencies**:
- Supabase JS Client v2 (Auth Admin API for magic link generation)
- Resend API (email delivery service)
- Existing `demo-signup` Edge Function infrastructure

**Storage**: N/A (enhancement to existing Edge Function, no new database tables)
**Testing**: Vitest (unit tests for email template function), manual E2E testing (signup flow + email delivery)
**Target Platform**: Supabase Edge Functions (Deno runtime on edge compute)
**Project Type**: Web (Edge Function enhancement)
**Performance Goals**:
- Email generation <100ms
- Resend API call <2 seconds
- Total demo signup flow remains <10 seconds (SC-007)

**Constraints**:
- Email delivery rate >95% (SC-008)
- Resend API has 100 emails/day limit on free tier (verify plan tier)
- Email size <1MB (Resend limit, template is ~5KB)

**Scale/Scope**:
- 1 new TypeScript file (email-template.ts)
- ~150 lines of code (email template + API integration)
- Modify existing demo-signup/index.ts (~30 line change)
- 1 environment variable (RESEND_API_KEY)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety First
✅ **PASS** - TypeScript strict mode applies (Deno runtime for Edge Functions)
- Email template function has typed parameters (fullName: string, magicLinkUrl: string, demoExpiresAt: string)
- Resend API response typed appropriately
- No type assertions needed

### Principle II: Component-Driven Development
✅ **PASS** - N/A (Edge Function, not React components)

### Principle III: Testing Discipline
✅ **PASS** - TDD workflow for email template
- Unit test for `generateDemoEmailHtml()` function (template rendering)
- E2E test for complete signup flow with Resend delivery
- Tests written before implementation

### Principle IV: Supabase Integration Patterns
✅ **PASS** - Follows established patterns
- Uses existing `demo-signup` Edge Function infrastructure
- Environment variable validation (RESEND_API_KEY checked at startup)
- No new database tables (no RLS concerns)
- Uses Supabase Auth Admin API (`admin.generateLink()`)

### Principle V: Specify Workflow Compliance
✅ **PASS** - Following complete workflow
- `/specify` → spec.md updated with requirements (FR-027 through FR-035)
- `/plan` → This file (plan.md being created now)
- `/tasks` → Will generate ordered task breakdown
- `/implement` → Will execute with per-task commits
- Design document created: `docs/plans/2025-10-29-custom-demo-signup-emails-design.md`

**Constitution Version**: 1.0.2
**Overall Status**: ✅ ALL GATES PASSED

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
supabase/functions/demo-signup/
├── index.ts              # Main Edge Function (MODIFIED)
├── email-template.ts     # NEW: generateDemoEmailHtml() function
├── validation.ts         # Existing (unchanged)
├── rate-limiter.ts       # Existing (unchanged)
└── demo-template.ts      # Existing (unchanged)

tests/unit/supabase-functions/
└── email-template.test.ts  # NEW: Unit tests for email generation

tests/integration/demo-signup/
└── resend-integration.test.ts  # NEW: E2E test with Resend (optional)

docs/plans/
└── 2025-10-29-custom-demo-signup-emails-design.md  # EXISTING: Design doc
```

**Structure Decision**: This is an enhancement to existing Edge Function infrastructure. All code changes are confined to the `supabase/functions/demo-signup/` directory. The new `email-template.ts` file provides a clean separation of concerns for email content, making future edits straightforward. Tests follow the existing pattern in `tests/` directory.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. All gates passed.
