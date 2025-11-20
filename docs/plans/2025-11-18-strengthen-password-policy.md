# Strengthen Password Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen password requirements to prevent weak passwords and brute force attacks

**Architecture:** Update PASSWORD_VALIDATION_CONFIG to enforce complexity requirements (uppercase, lowercase, numbers, special characters) and increase minimum length to 12 characters. Update validation functions to check complexity. Update UI components to show real-time feedback.

**Tech Stack:** TypeScript, React, Zod schemas

**OWASP Reference:** [Authentication Cheat Sheet - Password Strength Controls](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#implement-proper-password-strength-controls)

**Priority:** 🟠 HIGH

---

## Current Vulnerability

**File:** `specs/017-user-profile-management/contracts/password-change.types.ts:15-33`

```typescript
export const PASSWORD_VALIDATION_CONFIG = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: false,  // ❌ Weak
  REQUIRE_LOWERCASE: false,  // ❌ Weak
  REQUIRE_NUMBER: false,      // ❌ Weak
  REQUIRE_SPECIAL: false      // ❌ Weak
} as const
```

**Risk:** Weak passwords vulnerable to dictionary attacks, brute force, and password spraying.

**OWASP Recommendation:**
- Minimum length: 12 characters (15+ recommended)
- Require uppercase, lowercase, numbers, and special characters
- Check against common password lists (future enhancement)

---

## Task 1: Update Password Configuration

**Files:**
- Modify: `specs/017-user-profile-management/contracts/password-change.types.ts:15-33`

**Step 1: Write failing test for new password requirements**

Create `specs/017-user-profile-management/contracts/password-change.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  PASSWORD_VALIDATION_CONFIG,
  validateNewPassword,
  analyzePasswordStrength,
  PasswordStrength
} from './password-change.types'

describe('Password Policy - Strengthened Requirements', () => {
  it('should require minimum 12 characters', () => {
    expect(PASSWORD_VALIDATION_CONFIG.MIN_LENGTH).toBe(12)
  })

  it('should require uppercase letters', () => {
    expect(PASSWORD_VALIDATION_CONFIG.REQUIRE_UPPERCASE).toBe(true)
  })

  it('should require lowercase letters', () => {
    expect(PASSWORD_VALIDATION_CONFIG.REQUIRE_LOWERCASE).toBe(true)
  })

  it('should require numbers', () => {
    expect(PASSWORD_VALIDATION_CONFIG.REQUIRE_NUMBER).toBe(true)
  })

  it('should require special characters', () => {
    expect(PASSWORD_VALIDATION_CONFIG.REQUIRE_SPECIAL).toBe(true)
  })

  it('should reject passwords without uppercase', () => {
    const result = validateNewPassword('password123!')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('uppercase')
  })

  it('should reject passwords without lowercase', () => {
    const result = validateNewPassword('PASSWORD123!')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('lowercase')
  })

  it('should reject passwords without numbers', () => {
    const result = validateNewPassword('Password!@#$')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('number')
  })

  it('should reject passwords without special characters', () => {
    const result = validateNewPassword('Password1234')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('special')
  })

  it('should accept password meeting all requirements', () => {
    const result = validateNewPassword('MySecurePass123!')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject passwords under 12 characters', () => {
    const result = validateNewPassword('Short1!')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('12')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test specs/017-user-profile-management/contracts/password-change.test.ts
```

Expected: Tests fail with "Expected: 12, Received: 8" and validation errors not implemented

**Step 3: Update PASSWORD_VALIDATION_CONFIG**

Modify `specs/017-user-profile-management/contracts/password-change.types.ts:15-33`:

```typescript
/**
 * Password validation rules (OWASP compliant)
 */
export const PASSWORD_VALIDATION_CONFIG = {
  /** Minimum password length (OWASP recommendation: 12+ chars) */
  MIN_LENGTH: 12,

  /** Maximum password length (reasonable upper bound) */
  MAX_LENGTH: 128,

  /** Require uppercase letter (A-Z) */
  REQUIRE_UPPERCASE: true,

  /** Require lowercase letter (a-z) */
  REQUIRE_LOWERCASE: true,

  /** Require number (0-9) */
  REQUIRE_NUMBER: true,

  /** Require special character (!@#$%^&* etc) */
  REQUIRE_SPECIAL: true
} as const
```

**Step 4: Update validateNewPassword function**

Modify `specs/017-user-profile-management/contracts/password-change.types.ts:143-169`:

```typescript
/**
 * Validate new password (length and complexity requirements)
 */
export function validateNewPassword(password: string): PasswordValidation {
  if (!password || password.length === 0) {
    return {
      valid: false,
      error: 'New password is required',
      field: 'newPassword'
    }
  }

  // Check length requirements
  if (password.length < PASSWORD_VALIDATION_CONFIG.MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_VALIDATION_CONFIG.MIN_LENGTH} characters`,
      field: 'newPassword'
    }
  }

  if (password.length > PASSWORD_VALIDATION_CONFIG.MAX_LENGTH) {
    return {
      valid: false,
      error: `Password must be no more than ${PASSWORD_VALIDATION_CONFIG.MAX_LENGTH} characters`,
      field: 'newPassword'
    }
  }

  // Check complexity requirements
  if (PASSWORD_VALIDATION_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter (A-Z)',
      field: 'newPassword'
    }
  }

  if (PASSWORD_VALIDATION_CONFIG.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter (a-z)',
      field: 'newPassword'
    }
  }

  if (PASSWORD_VALIDATION_CONFIG.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number (0-9)',
      field: 'newPassword'
    }
  }

  if (PASSWORD_VALIDATION_CONFIG.REQUIRE_SPECIAL && !/[^a-zA-Z0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*)',
      field: 'newPassword'
    }
  }

  return { valid: true }
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test specs/017-user-profile-management/contracts/password-change.test.ts
```

Expected: All tests pass

**Step 6: Type check**

```bash
tsc -b
```

Expected: No errors

**Step 7: Commit**

```bash
git add specs/017-user-profile-management/contracts/password-change.types.ts specs/017-user-profile-management/contracts/password-change.test.ts
git commit -m "feat: strengthen password policy requirements

- Increase minimum length from 8 to 12 characters
- Enable uppercase letter requirement
- Enable lowercase letter requirement
- Enable number requirement
- Enable special character requirement
- Update validateNewPassword with complexity checks
- Add comprehensive test coverage

OWASP: Authentication - Password Strength Controls"
```

---

## Task 2: Update Registration Password Validation

**Files:**
- Read: `src/pages/RegistrationPage.tsx` (find password validation)
- Modify: Password validation logic

**Step 1: Find registration password validation**

```bash
grep -n "password" src/pages/RegistrationPage.tsx | head -20
```

**Step 2: Check if using Zod schema**

```bash
grep -n "z\." src/pages/RegistrationPage.tsx | head -20
```

**Step 3: Update Zod schema if present**

If using Zod, update the password schema:

```typescript
import { z } from 'zod'
import { PASSWORD_VALIDATION_CONFIG } from '@/specs/017-user-profile-management/contracts/password-change.types'

const registrationSchema = z.object({
  // ... other fields
  password: z
    .string()
    .min(PASSWORD_VALIDATION_CONFIG.MIN_LENGTH,
      `Password must be at least ${PASSWORD_VALIDATION_CONFIG.MIN_LENGTH} characters`)
    .max(PASSWORD_VALIDATION_CONFIG.MAX_LENGTH)
    .refine((val) => /[A-Z]/.test(val), {
      message: 'Password must contain at least one uppercase letter'
    })
    .refine((val) => /[a-z]/.test(val), {
      message: 'Password must contain at least one lowercase letter'
    })
    .refine((val) => /[0-9]/.test(val), {
      message: 'Password must contain at least one number'
    })
    .refine((val) => /[^a-zA-Z0-9]/.test(val), {
      message: 'Password must contain at least one special character'
    }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})
```

**Step 4: Test registration with weak password**

Run dev server:
```bash
npm run dev
```

Navigate to registration page and try:
- Password: `password` → Should show error "must be 12 characters"
- Password: `passwordlong` → Should show error "must contain uppercase"
- Password: `PASSWORDlong` → Should show error "must contain number"
- Password: `Password123` → Should show error "must contain special character"
- Password: `Password123!` → Should accept

**Step 5: Commit registration updates**

```bash
git add src/pages/RegistrationPage.tsx
git commit -m "feat: apply strengthened password policy to registration

- Update registration form validation with new requirements
- Show real-time feedback for password complexity
- Align with PASSWORD_VALIDATION_CONFIG"
```

---

## Task 3: Update Password Reset Flow

**Files:**
- Read: `src/pages/PasswordResetPage.tsx` or similar
- Modify: Password reset validation

**Step 1: Find password reset files**

```bash
find src -name "*password*" -o -name "*reset*" | grep -i "\\.tsx$"
```

**Step 2: Read password reset implementation**

```bash
cat src/pages/PasswordResetPage.tsx  # or whatever file found
```

**Step 3: Update password reset validation**

Apply same Zod schema pattern as registration:

```typescript
import { PASSWORD_VALIDATION_CONFIG } from '@/specs/017-user-profile-management/contracts/password-change.types'

const resetSchema = z.object({
  newPassword: z
    .string()
    .min(PASSWORD_VALIDATION_CONFIG.MIN_LENGTH)
    .refine((val) => /[A-Z]/.test(val), 'Password must contain uppercase letter')
    .refine((val) => /[a-z]/.test(val), 'Password must contain lowercase letter')
    .refine((val) => /[0-9]/.test(val), 'Password must contain number')
    .refine((val) => /[^a-zA-Z0-9]/.test(val), 'Password must contain special character'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})
```

**Step 4: Test password reset flow**

1. Request password reset email
2. Click reset link
3. Try weak password
4. Verify validation errors show

**Step 5: Commit password reset updates**

```bash
git add src/pages/PasswordResetPage.tsx
git commit -m "feat: apply strengthened password policy to reset flow

- Update password reset validation
- Ensure consistency with registration and change flows"
```

---

## Task 4: Add Password Requirements UI Component

**Files:**
- Create: `src/components/PasswordRequirements.tsx`
- Create: `src/components/PasswordRequirements.test.tsx`

**Step 1: Write test for PasswordRequirements component**

Create `src/components/PasswordRequirements.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PasswordRequirements } from './PasswordRequirements'

describe('PasswordRequirements', () => {
  it('should show all requirements as unchecked for empty password', () => {
    render(<PasswordRequirements password="" />)

    expect(screen.getByText(/12 characters/)).toBeInTheDocument()
    expect(screen.getByText(/uppercase letter/)).toBeInTheDocument()
    expect(screen.getByText(/lowercase letter/)).toBeInTheDocument()
    expect(screen.getByText(/number/)).toBeInTheDocument()
    expect(screen.getByText(/special character/)).toBeInTheDocument()
  })

  it('should show length requirement as met', () => {
    render(<PasswordRequirements password="PasswordTest1!" />)

    const lengthReq = screen.getByText(/12 characters/)
    expect(lengthReq).toHaveClass('text-green-600') // or your success class
  })

  it('should show all requirements as met for valid password', () => {
    render(<PasswordRequirements password="SecurePassword123!" />)

    expect(screen.getByText(/12 characters/)).toHaveClass('text-green-600')
    expect(screen.getByText(/uppercase letter/)).toHaveClass('text-green-600')
    expect(screen.getByText(/lowercase letter/)).toHaveClass('text-green-600')
    expect(screen.getByText(/number/)).toHaveClass('text-green-600')
    expect(screen.getByText(/special character/)).toHaveClass('text-green-600')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test src/components/PasswordRequirements.test.tsx
```

Expected: Component doesn't exist yet

**Step 3: Create PasswordRequirements component**

Create `src/components/PasswordRequirements.tsx`:

```typescript
import { CheckCircle2, Circle } from 'lucide-react'
import { PASSWORD_VALIDATION_CONFIG } from '@/specs/017-user-profile-management/contracts/password-change.types'

interface PasswordRequirementsProps {
  password: string
}

interface Requirement {
  label: string
  met: boolean
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements: Requirement[] = [
    {
      label: `At least ${PASSWORD_VALIDATION_CONFIG.MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_VALIDATION_CONFIG.MIN_LENGTH
    },
    {
      label: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'One lowercase letter (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      label: 'One number (0-9)',
      met: /[0-9]/.test(password)
    },
    {
      label: 'One special character (!@#$%^&*)',
      met: /[^a-zA-Z0-9]/.test(password)
    }
  ]

  const allMet = requirements.every(req => req.met)

  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-gray-700 dark:text-gray-300">
        Password requirements:
      </p>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`flex items-center gap-2 ${
              req.met
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {req.met ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
      {allMet && (
        <p className="text-green-600 dark:text-green-400 font-medium pt-2">
          ✓ All requirements met
        </p>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npm test src/components/PasswordRequirements.test.tsx
```

Expected: All tests pass

**Step 5: Commit PasswordRequirements component**

```bash
git add src/components/PasswordRequirements.tsx src/components/PasswordRequirements.test.tsx
git commit -m "feat: add PasswordRequirements UI component

- Display password requirements with visual indicators
- Show check marks for met requirements
- Real-time feedback as user types
- Test coverage included"
```

---

## Task 5: Integrate PasswordRequirements into Forms

**Files:**
- Modify: `src/pages/RegistrationPage.tsx`
- Modify: `src/pages/PasswordResetPage.tsx`
- Modify: Password change form component (if exists)

**Step 1: Add to registration form**

Modify `src/pages/RegistrationPage.tsx`:

```typescript
import { PasswordRequirements } from '@/components/PasswordRequirements'

// Inside the form JSX, after password input:
<div className="space-y-2">
  <label htmlFor="password">Password</label>
  <input
    id="password"
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    // ... other props
  />

  {/* Show requirements when password field is focused or has value */}
  {(password.length > 0 || isPasswordFocused) && (
    <PasswordRequirements password={password} />
  )}
</div>
```

**Step 2: Test registration UI**

```bash
npm run dev
```

Navigate to registration:
1. Click in password field
2. See requirements appear
3. Type characters and watch requirements update
4. Verify visual feedback is clear

**Step 3: Add to password reset form**

Repeat for `src/pages/PasswordResetPage.tsx` with same pattern.

**Step 4: Add to password change form**

Repeat for password change form component.

**Step 5: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit form integrations**

```bash
git add src/pages/RegistrationPage.tsx src/pages/PasswordResetPage.tsx
git commit -m "feat: integrate PasswordRequirements into all password forms

- Add to registration form
- Add to password reset form
- Add to password change form
- Real-time visual feedback for users"
```

---

## Task 6: Update Documentation

**Files:**
- Create: `docs/security/PASSWORD-POLICY.md`
- Modify: `CLAUDE.md` to reference new policy

**Step 1: Create password policy documentation**

Create `docs/security/PASSWORD-POLICY.md`:

```markdown
# Password Policy

## Overview

PipeTrak V2 enforces OWASP-compliant password requirements to protect user accounts from brute force attacks, dictionary attacks, and credential stuffing.

## Requirements

All passwords must meet these requirements:

- **Minimum length**: 12 characters
- **Maximum length**: 128 characters
- **Uppercase letters**: At least one (A-Z)
- **Lowercase letters**: At least one (a-z)
- **Numbers**: At least one (0-9)
- **Special characters**: At least one (!@#$%^&* etc)

## Implementation

### Configuration

Password requirements are centralized in:
`specs/017-user-profile-management/contracts/password-change.types.ts`

```typescript
export const PASSWORD_VALIDATION_CONFIG = {
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true
}
```

### Validation Functions

- `validateNewPassword()` - Validates password meets all requirements
- `analyzePasswordStrength()` - Scores password strength (0-100)
- `validatePasswordChangeForm()` - Full form validation

### UI Components

- `PasswordRequirements` - Visual checklist showing requirement status
- Real-time feedback as user types
- Color-coded indicators (gray → green)

## Applied To

Password policy is enforced in:

1. **User Registration** (`src/pages/RegistrationPage.tsx`)
2. **Password Reset** (`src/pages/PasswordResetPage.tsx`)
3. **Password Change** (profile settings)
4. **Admin User Creation** (if applicable)

## Testing

Test coverage includes:

- Unit tests for validation functions
- Component tests for PasswordRequirements UI
- Integration tests for registration flow
- Integration tests for password reset flow

Run tests:
```bash
npm test password
```

## OWASP Compliance

This policy follows OWASP Authentication Cheat Sheet recommendations:
- ✅ Minimum 12 character length (15+ recommended)
- ✅ Complexity requirements
- ✅ No maximum length restrictions (within reason)
- ✅ Clear error messages
- 🔄 Password breach database check (future enhancement)
- 🔄 Password history (future enhancement)

## User Education

- Password requirements shown before user types
- Real-time feedback while typing
- Clear error messages on validation failure
- No vague "weak password" messages

## Future Enhancements

1. **Breach Detection**: Check passwords against haveibeenpwned.com API
2. **Password History**: Prevent reuse of last 5 passwords
3. **Passphrase Support**: Encourage longer passphrases over complex short passwords
4. **Password Manager Detection**: Detect and encourage password manager usage

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)
```

**Step 2: Update CLAUDE.md**

Add to `CLAUDE.md` in the "Security" or "Authentication" section:

```markdown
### Password Policy

All passwords must meet OWASP-compliant requirements:
- Minimum 12 characters
- Uppercase, lowercase, numbers, special characters required
- See [docs/security/PASSWORD-POLICY.md](docs/security/PASSWORD-POLICY.md)
```

**Step 3: Commit documentation**

```bash
git add docs/security/PASSWORD-POLICY.md CLAUDE.md
git commit -m "docs: add password policy documentation

- Document OWASP-compliant requirements
- List implementation details
- Add testing instructions
- Reference in CLAUDE.md"
```

---

## Verification Checklist

- [ ] PASSWORD_VALIDATION_CONFIG updated to require 12+ chars and complexity
- [ ] validateNewPassword checks all complexity requirements
- [ ] Tests pass for password validation
- [ ] Registration form enforces new policy
- [ ] Password reset form enforces new policy
- [ ] Password change form enforces new policy
- [ ] PasswordRequirements component displays requirements
- [ ] Real-time feedback works in all forms
- [ ] Documentation updated
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Changes committed

---

## Rollback Plan

If users report issues:

1. **Temporarily relax requirements:**
   ```typescript
   MIN_LENGTH: 8,
   REQUIRE_UPPERCASE: false,
   // etc.
   ```

2. **Keep UI component** - It still provides helpful guidance

3. **Investigate issue:**
   - Are error messages clear?
   - Is UI feedback working?
   - Are legitimate passwords being rejected?

4. **Re-enable with fixes**

---

## Migration Considerations

### Existing Users with Weak Passwords

Existing users with passwords not meeting new requirements should:
- Still be able to log in (don't lock them out)
- Be prompted to update password on next login
- See banner: "Your password doesn't meet our new security requirements. Please update it."

This requires:
- [ ] Database flag: `password_needs_update: boolean`
- [ ] Login flow check for weak password
- [ ] Force password change dialog

**Note**: Consider implementing this as a follow-up task.

---

## Success Criteria

✅ Password policy enforces 12+ character minimum
✅ All complexity requirements enforced
✅ Real-time UI feedback in all password forms
✅ Clear error messages guide users
✅ Tests pass with >80% coverage
✅ Documentation complete
✅ No regressions in auth flows

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#implement-proper-password-strength-controls)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Microsoft Password Guidance](https://www.microsoft.com/en-us/research/publication/password-guidance/)
