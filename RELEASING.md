# Release Process

This document describes how to create a new release for PipeTrak V2.

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) to automatically determine version bumps:

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

### Types and Version Bumps

| Type | Version Bump | Example |
|------|-------------|---------|
| `feat:` | MINOR (1.0.0 → 1.1.0) | `feat: add changelog notification modal` |
| `fix:` | PATCH (1.0.0 → 1.0.1) | `fix: correct date sorting in weld log` |
| `BREAKING CHANGE:` | MAJOR (1.0.0 → 2.0.0) | `feat!: remove old weld log` or footer with `BREAKING CHANGE:` |
| `perf:` | PATCH | `perf: improve weld log query performance` |
| Other types | No bump | `docs:`, `chore:`, `test:`, `refactor:`, `style:`, `ci:`, `build:` |

### Examples

**Minor version bump (new feature):**
```bash
git commit -m "feat: add QC weld completion alerts"
```

**Patch version bump (bug fix):**
```bash
git commit -m "fix: resolve timezone issue in weld dates"
```

**Major version bump (breaking change) - Option 1:**
```bash
git commit -m "feat!: redesign weld log interface

BREAKING CHANGE: Old weld log bookmarks will not work with new interface"
```

**Major version bump (breaking change) - Option 2:**
```bash
git commit -m "feat: redesign weld log interface" -m "BREAKING CHANGE: Old weld log bookmarks will not work"
```

**Non-versioned commit (internal change):**
```bash
git commit -m "chore: update dependencies"
git commit -m "docs: add release process documentation"
git commit -m "test: add tests for changelog modal"
```

## Creating a Release

### 1. Review Commits

Check what's changed since the last release:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

### 2. Generate Release Notes

Use the `/release` command in Claude Code:

```
/release
```

This will:
- Analyze commits since last tag
- **Suggest the next version** based on conventional commits
- Generate user-friendly release notes
- Group changes by category (Features, Improvements, Bug Fixes)

### 3. Bump Version

Update package.json to the suggested version:

```bash
npm version <major|minor|patch>  # Based on /release suggestion
# Example: npm version minor  # 1.1.0 → 1.2.0
```

### 4. Create Git Tag

```bash
git tag -a v<version> -m "Release v<version>"
# Example: git tag -a v1.2.0 -m "Release v1.2.0"
```

### 5. Push to GitHub

```bash
git push origin <branch-name>
git push origin v<version>
# Example: git push origin main
#          git push origin v1.2.0
```

### 6. Create GitHub Release

Go to https://github.com/clachance14/PipeTrakV2/releases/new

- **Tag:** Select the tag you just pushed (e.g., v1.2.0)
- **Title:** Version 1.2.0
- **Description:** Paste the release notes from `/release` command
- Click **Publish release**

### 7. Verify

- Check that the GitHub release appears
- Next time a user logs in, they'll see the changelog modal!

## Quick Reference

```bash
# Step-by-step release
/release                           # Generate notes + get version suggestion
npm version <major|minor|patch>    # Update package.json
git push origin <branch>           # Push commits
git push origin v<version>         # Push tag
# Create GitHub release (use notes from /release)
```

## Version Bump Decision Tree

```
Do commits have BREAKING CHANGE? → MAJOR (2.0.0)
Do commits have feat:? → MINOR (1.1.0)
Do commits have fix: or perf:? → PATCH (1.0.1)
Only docs/chore/test/etc? → No release needed
```

## Troubleshooting

**Q: I forgot to use conventional commits. What now?**
A: The `/release` command will still work! It uses AI to categorize commits, but you'll need to manually decide the version bump.

**Q: Can I combine multiple types in one release?**
A: Yes! The highest-priority change determines the version:
- feat + fix → MINOR (features beat fixes)
- BREAKING CHANGE + feat + fix → MAJOR (breaking changes beat everything)

**Q: How often should we release?**
A: Whenever you have user-facing changes ready. Could be weekly, per-feature, or when you have enough fixes batched together.

## Best Practices

1. ✅ Use conventional commits for all user-facing changes
2. ✅ Batch related changes into logical releases
3. ✅ Test thoroughly before releasing
4. ✅ Write clear, user-friendly release notes
5. ✅ Release regularly (don't let too many changes pile up)
6. ❌ Don't release on broken builds
7. ❌ Don't skip version numbers
8. ❌ Don't modify version tags after pushing
