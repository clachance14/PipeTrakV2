---
description: Generate user-friendly release notes and suggest version bump
---

Generate release notes for the next version of PipeTrak V2 using conventional commits.

**Requirements:**
- Analyze commits since last git tag using conventional commit format
- **Suggest next version number** (MAJOR.MINOR.PATCH) based on commit types
- Only include user-facing changes (features, improvements, bug fixes)
- Use simple, non-technical language that end users can understand
- Group changes into clear categories: Features, Improvements, Bug Fixes
- Exclude technical/internal changes (chore, docs, test, refactor, style, build, ci)
- Format for GitHub release body (markdown)

**Process:**
1. Get commits since last git tag using: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
2. Analyze conventional commit types:
   - `BREAKING CHANGE:` or `feat!:` or `fix!:` → Suggest MAJOR bump
   - `feat:` → Suggest MINOR bump
   - `fix:` or `perf:` → Suggest PATCH bump
   - Other types → Skip
3. **Determine suggested version**: Highest priority change wins (MAJOR > MINOR > PATCH)
4. Filter out non-user-facing commits
5. Translate technical commit messages into user-friendly descriptions
6. Group by category
7. Format as markdown

**Output format:**

Start with version suggestion:
```
📦 Suggested next version: 1.2.0 (MINOR)
Current version: 1.1.0

Reason: Found 3 feat: commits, 2 fix: commits
```

Then the release notes:
```markdown
## Features
- Brief description of new feature in plain language
- Another new feature

## Improvements
- Description of improvement
- Another improvement

## Bug Fixes
- What bug was fixed (from user perspective)
- Another bug fix
```

**Version Bump Rules:**
- MAJOR (2.0.0): Found `BREAKING CHANGE:`, `feat!:`, or `fix!:` commits
- MINOR (1.2.0): Found `feat:` commits (no breaking changes)
- PATCH (1.1.1): Found only `fix:` or `perf:` commits (no features)
- NONE: Found only `chore:`, `docs:`, `test:`, etc. (suggest waiting for user-facing changes)

**Guidelines for user-friendly language:**
- Instead of "Add useChangelog hook" → "New update notifications when you log in"
- Instead of "Fix RLS policy" → "Fixed permission issue preventing access"
- Instead of "Refactor component" → (Skip - internal change)
- Instead of "Update types" → (Skip - technical change)
- Focus on WHAT changed for the user, not HOW it was implemented

**Next Steps:**
After presenting the version suggestion and release notes, provide the exact commands:
```bash
npm version <suggested-bump>  # e.g., npm version minor
git push origin <branch-name>
git push origin v<new-version>
# Then create GitHub release at: https://github.com/clachance14/PipeTrakV2/releases/new
# Use the generated notes above
```
