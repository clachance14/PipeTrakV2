---
description: Generate user-friendly release notes from recent commits
---

Generate release notes for the next version of PipeTrak V2.

**Requirements:**
- Only include user-facing changes (features, improvements, bug fixes)
- Use simple, non-technical language that end users can understand
- Group changes into clear categories: Features, Improvements, Bug Fixes
- Exclude technical/internal changes (refactoring, tests, types, config, etc.)
- Format for GitHub release body (markdown)

**Process:**
1. Get commits since the last git tag (or last 30 days if no tags)
2. Filter out non-user-facing commits (chore, docs, test, refactor, style, build, ci)
3. Translate technical commit messages into user-friendly descriptions
4. Group by category
5. Format as markdown

**Output format:**
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

**Guidelines for user-friendly language:**
- Instead of "Add useChangelog hook" → "New update notifications when you log in"
- Instead of "Fix RLS policy" → "Fixed permission issue preventing access"
- Instead of "Refactor component" → (Skip - internal change)
- Instead of "Update types" → (Skip - technical change)
- Focus on WHAT changed for the user, not HOW it was implemented

After generating the notes, ask if the user wants to:
1. Copy to clipboard
2. Create the GitHub release directly (if gh CLI is available)
3. Save to a file
