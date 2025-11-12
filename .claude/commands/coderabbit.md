---
description: Run AI-powered code review using CodeRabbit CLI on staged changes, specific files, or entire branch
---

The user can provide optional arguments to customize the review scope. Parse $ARGUMENTS before proceeding.

User input:

$ARGUMENTS

# CodeRabbit Review Command

## 1. Parse Arguments and Determine Review Scope

**Default behavior** (no arguments): Review all staged changes
- If nothing staged, prompt user to stage files first

**Supported argument patterns**:
- `--base <branch>`: Review all changes in current branch vs specified branch (e.g., `--base main`)
- `<file-path>`: Review specific file or directory (e.g., `src/components/settings/`)
- `--staged`: Explicitly review staged changes (same as default)
- `--plain`: Use detailed output mode with fix suggestions
- `--prompt-only`: Use token-efficient output mode

**Examples**:
- `/coderabbit` → Review staged changes
- `/coderabbit --base main` → Review entire branch vs main
- `/coderabbit src/hooks/useProjectTemplates.ts` → Review specific file
- `/coderabbit src/components/settings/ --plain` → Review directory with detailed output

## 2. Pre-Flight Checks

Before running review:
- Verify CodeRabbit CLI is installed (`coderabbit --version`)
- Verify authenticated (`coderabbit auth status`)
- Check current git status to show what will be reviewed
- If reviewing specific files, verify they exist

## 3. Execute CodeRabbit Review

Run the appropriate `coderabbit review` command based on parsed arguments:

```bash
# Default: staged changes
coderabbit review

# With base branch
coderabbit review --base <branch>

# Specific files/directories
coderabbit review <path>

# With output mode flags
coderabbit review --plain
coderabbit review --prompt-only
```

## 4. Parse and Present Results

**Present the review results clearly**:
1. **Summary**: Number of issues found, severity breakdown
2. **Critical Issues**: Security vulnerabilities, bugs, breaking changes
3. **Improvements**: Code quality, performance, maintainability suggestions
4. **Style Issues**: Formatting, naming conventions, best practices

**For each issue, include**:
- File path and line number (use `file_path:line_number` format)
- Issue description
- Suggested fix (if provided)
- Severity level

## 5. Offer Next Steps

After presenting results, offer actionable next steps:
- **If issues found**: "Would you like me to fix these issues?"
- **If critical issues**: "I recommend addressing the critical issues before committing"
- **If all clear**: "Code looks good! Ready to commit?"

## 6. Integration with Workflow

**Suggested usage points**:
- Before creating commits (quality gate)
- After completing implementation tasks
- Before pushing to remote (pre-PR check)
- During `/implement` phases (continuous review)

## Notes

- CodeRabbit CLI is free with rate limits
- Reviews run locally but use cloud AI models
- Results are not stored unless explicitly saved
- Short alias `cr` can be used instead of `coderabbit`
