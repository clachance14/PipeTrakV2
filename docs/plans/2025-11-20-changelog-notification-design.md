# Changelog Notification Feature

**Created**: 2025-11-20
**Status**: Approved
**Implementation Branch**: TBD

## Problem

Users need to know what changed in the app when new versions deploy. Currently, no mechanism notifies users of updates or new features.

## Solution

Show users a modal dialog with release notes the first time they log in after a new version deploys. The modal displays GitHub release commit messages formatted as a categorized changelog.

## Requirements

- Display once per version (not every login)
- Show GitHub release notes in a modal dialog
- Use semantic versioning for version comparison
- Track which version each user last viewed
- Degrade gracefully if GitHub API fails

## Architecture

### Client-Side GitHub API Approach

The app fetches the latest GitHub release via the GitHub REST API. The system compares the release version with the user's last viewed version stored in Supabase. If a newer version exists, the app shows a modal with the release notes.

**Why client-side?**
- Simple implementation (no backend needed)
- Sufficient rate limits (60 requests/hour per IP for public repos)
- Version data updates without app redeployment

### Data Flow

1. User logs in
2. App fetches latest GitHub release: `GET /repos/:owner/:repo/releases/latest`
3. App compares release version with user's `last_viewed_release` from database
4. If newer release exists, app shows modal with release notes
5. User dismisses modal
6. App updates user's `last_viewed_release` in database

### Version Comparison

The system uses semantic versioning (semver) to compare versions. Git tags follow semver format (e.g., "v1.2.0", "v2.0.0-beta.1"). The semver library handles comparison logic, including pre-release versions.

### Error Handling

All errors degrade gracefully. The changelog is an enhancement, not a critical feature.

**GitHub API failures:**
- Rate limit exceeded → Skip modal silently
- Network timeout → Retry once, then skip
- No releases exist (404) → Skip modal
- Invalid response → Log error, skip modal

**Supabase failures:**
- Failed to update `last_viewed_release` → Show modal again next login
- RLS policy violation → Log error, skip update

**Version comparison edge cases:**
- Invalid semver format → Use string comparison fallback or skip
- Null `last_viewed_release` → Treat as "0.0.0" (first-time user)
- Equal versions → Don't show modal

## Database Schema

### Migration: Add `last_viewed_release` Column

```sql
-- Add column to track last viewed release version
ALTER TABLE users
ADD COLUMN last_viewed_release TEXT;

-- Add index for query performance
CREATE INDEX idx_users_last_viewed_release
ON users(last_viewed_release);

-- RLS: Reuse existing policies (users can update own row)
```

**Schema details:**
- Column: `last_viewed_release` (TEXT, nullable)
- Format: Semver string without "v" prefix (e.g., "1.2.0", "2.0.0-beta.1")
- Null = user hasn't viewed any release notification
- Updated when user dismisses modal

## Component Structure

### New Components

**`ChangelogModal` (`src/components/ChangelogModal.tsx`)**

Modal dialog that displays release notes.

- Uses Shadcn Dialog component
- Props: `release` (GitHub release object), `isOpen`, `onClose`
- Displays: release tag, publish date, formatted commit messages
- Mobile-responsive: full-screen on mobile, centered dialog on desktop
- Accessible: keyboard navigation, ARIA labels, focus management

**`useChangelog` Hook (`src/hooks/useChangelog.ts`)**

Custom hook that manages changelog logic.

- Fetches latest GitHub release via TanStack Query
- Compares versions using semver library
- Returns: `{ shouldShowModal, release, markAsViewed }`
- Handles loading/error states
- Caches GitHub API response (1 hour stale-while-revalidate)

### Integration Point

Add `useChangelog` hook to `Layout.tsx` or `ProtectedRoute.tsx`:

- Renders only for authenticated users
- Checks once per session (not on every route change)
- Renders `ChangelogModal` when new version detected

## API Integration

### GitHub REST API

**Endpoint:** `https://api.github.com/repos/:owner/:repo/releases/latest`

**Response:**
```json
{
  "tag_name": "v1.2.0",
  "name": "Version 1.2.0",
  "published_at": "2025-11-20T10:30:00Z",
  "body": "## Features\n- Add weld log filtering\n\n## Bug Fixes\n- Fix date sorting"
}
```

**Rate limits:**
- Unauthenticated: 60 requests/hour per IP
- Authenticated: 5,000 requests/hour (optional GitHub token)

**Configuration:**
- Store GitHub repo owner/name in environment variable or hardcode
- Example: `VITE_GITHUB_REPO=owner/repo`

### Supabase Queries

**Fetch user's last viewed release:**
```typescript
const { data } = await supabase
  .from('users')
  .select('last_viewed_release')
  .eq('id', userId)
  .single()
```

**Update user's last viewed release:**
```typescript
const { error } = await supabase
  .from('users')
  .update({ last_viewed_release: version })
  .eq('id', userId)
```

## State Management

- **TanStack Query**: GitHub API calls, Supabase queries/mutations
- **Local component state**: Modal open/close
- **No global state needed**: Feature is ephemeral (session-scoped)

## Testing Strategy

### Unit Tests

**`useChangelog.test.ts`**
- Mock GitHub API responses (success, 404, rate limit, network error)
- Mock Supabase queries and mutations
- Test version comparison with various semver formats
- Test edge cases: null values, invalid semver, pre-release versions
- Coverage target: 80%+ (lib directory standard)

**`ChangelogModal.test.tsx`**
- Renders release notes correctly
- Calls `onClose` when dismissed
- Mobile responsiveness (viewport testing)
- Accessibility: keyboard navigation, ARIA labels, focus trap
- Coverage target: 60%+ (component standard)

### Integration Tests

**`tests/integration/changelog.test.ts`**
- Mock GitHub API with MSW (Mock Service Worker)
- Mock Supabase with test client
- Test full flow: login → new release → modal shown → dismiss → version updated
- Test no new release scenario
- Test error scenarios (API failures, Supabase failures)

### TDD Workflow

1. Write failing test
2. Implement minimum code to pass
3. Refactor while tests pass
4. Commit tests and implementation together

## Dependencies

**New packages:**
- `semver` - Semantic versioning comparison
- `@types/semver` - TypeScript types for semver

**Existing packages:**
- `@tanstack/react-query` - API state management
- Shadcn Dialog component - Modal UI
- Supabase client - Database operations

## Implementation Checklist

- [ ] Write design document (this file)
- [ ] Create database migration
- [ ] Install semver package
- [ ] Write tests for `useChangelog` hook (TDD)
- [ ] Implement `useChangelog` hook
- [ ] Write tests for `ChangelogModal` component (TDD)
- [ ] Implement `ChangelogModal` component
- [ ] Create Supabase mutation for updating `last_viewed_release`
- [ ] Integrate into app layout
- [ ] Write integration tests
- [ ] Update documentation (CLAUDE.md if needed)
- [ ] Commit and push
- [ ] Create pull request

## Open Questions

- [ ] Which GitHub repo to use? (owner/repo in env var vs hardcoded)
- [ ] GitHub token for higher rate limits? (optional, adds complexity)
- [ ] Show pre-release versions or stable only?
- [ ] Format commit messages or show raw GitHub body?

## Future Enhancements

- Admin UI to manually create/edit release notes
- Categorize commits automatically (Features, Bug Fixes, etc.)
- Allow users to view changelog history (not just latest)
- Support multiple projects with different release schedules
- Email notifications for critical updates
