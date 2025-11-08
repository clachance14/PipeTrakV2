/**
 * TypeScript Contracts: Password Change Operations
 *
 * Feature: 017-user-profile-management
 * Purpose: Type-safe interfaces for Supabase Auth password update operations
 */

// ============================================================================
// Password Configuration
// ============================================================================

/**
 * Password validation rules
 */
export const PASSWORD_VALIDATION_CONFIG = {
  /** Minimum password length (Supabase Auth default) */
  MIN_LENGTH: 8,

  /** Maximum password length (reasonable upper bound) */
  MAX_LENGTH: 128,

  /** Require uppercase letter */
  REQUIRE_UPPERCASE: false,  // Not enforced in MVP

  /** Require lowercase letter */
  REQUIRE_LOWERCASE: false,  // Not enforced in MVP

  /** Require number */
  REQUIRE_NUMBER: false,  // Not enforced in MVP

  /** Require special character */
  REQUIRE_SPECIAL: false  // Not enforced in MVP
} as const

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  /** Current password (for verification) */
  currentPassword: string

  /** New password */
  newPassword: string

  /** Confirm new password */
  confirmPassword: string
}

/**
 * Password change response (success)
 */
export interface PasswordChangeResponse {
  /** Success message */
  message: string

  /** User still logged in (session maintained) */
  sessionMaintained: boolean

  /** Timestamp of password change */
  changedAt: string  // ISO 8601 datetime
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Password strength levels
 */
export enum PasswordStrength {
  /** Very weak password (< 8 characters) */
  VERY_WEAK = 'VERY_WEAK',

  /** Weak password (8-10 characters, no complexity) */
  WEAK = 'WEAK',

  /** Fair password (11-14 characters or 8+ with some complexity) */
  FAIR = 'FAIR',

  /** Good password (15+ characters or 10+ with complexity) */
  GOOD = 'GOOD',

  /** Strong password (20+ characters or 15+ with high complexity) */
  STRONG = 'STRONG'
}

/**
 * Password strength analysis result
 */
export interface PasswordStrengthAnalysis {
  /** Strength level */
  strength: PasswordStrength

  /** Numeric score (0-100) */
  score: number

  /** Feedback messages for user */
  feedback: string[]

  /** Does password meet minimum requirements */
  meetsMinimum: boolean
}

/**
 * Password validation result
 */
export interface PasswordValidation {
  /** Validation passed */
  valid: boolean

  /** Error message if invalid */
  error?: string

  /** Field with error (for focusing) */
  field?: 'currentPassword' | 'newPassword' | 'confirmPassword'
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate current password (not empty)
 */
export function validateCurrentPassword(password: string): PasswordValidation {
  if (!password || password.trim().length === 0) {
    return {
      valid: false,
      error: 'Current password is required',
      field: 'currentPassword'
    }
  }
  return { valid: true }
}

/**
 * Validate new password (length requirements)
 */
export function validateNewPassword(password: string): PasswordValidation {
  if (!password || password.length === 0) {
    return {
      valid: false,
      error: 'New password is required',
      field: 'newPassword'
    }
  }

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

  return { valid: true }
}

/**
 * Validate password confirmation (matches new password)
 */
export function validatePasswordConfirmation(
  newPassword: string,
  confirmPassword: string
): PasswordValidation {
  if (!confirmPassword || confirmPassword.length === 0) {
    return {
      valid: false,
      error: 'Please confirm your new password',
      field: 'confirmPassword'
    }
  }

  if (newPassword !== confirmPassword) {
    return {
      valid: false,
      error: 'Passwords do not match',
      field: 'confirmPassword'
    }
  }

  return { valid: true }
}

/**
 * Validate new password is different from current
 */
export function validatePasswordsDifferent(
  currentPassword: string,
  newPassword: string
): PasswordValidation {
  if (currentPassword === newPassword) {
    return {
      valid: false,
      error: 'New password must be different from current password',
      field: 'newPassword'
    }
  }

  return { valid: true }
}

/**
 * Validate entire password change form
 */
export function validatePasswordChangeForm(
  request: PasswordChangeRequest
): PasswordValidation {
  // Validate current password
  const currentValidation = validateCurrentPassword(request.currentPassword)
  if (!currentValidation.valid) return currentValidation

  // Validate new password
  const newValidation = validateNewPassword(request.newPassword)
  if (!newValidation.valid) return newValidation

  // Validate confirmation
  const confirmValidation = validatePasswordConfirmation(
    request.newPassword,
    request.confirmPassword
  )
  if (!confirmValidation.valid) return confirmValidation

  // Validate passwords are different
  const differentValidation = validatePasswordsDifferent(
    request.currentPassword,
    request.newPassword
  )
  if (!differentValidation.valid) return differentValidation

  return { valid: true }
}

/**
 * Analyze password strength (basic algorithm)
 */
export function analyzePasswordStrength(password: string): PasswordStrengthAnalysis {
  let score = 0
  const feedback: string[] = []

  // Length scoring
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 20
  if (password.length >= 16) score += 20
  if (password.length >= 20) score += 20

  // Complexity scoring
  if (/[a-z]/.test(password)) score += 5
  if (/[A-Z]/.test(password)) score += 5
  if (/[0-9]/.test(password)) score += 5
  if (/[^a-zA-Z0-9]/.test(password)) score += 5  // Special characters

  // Determine strength level
  let strength: PasswordStrength
  if (score < 20) {
    strength = PasswordStrength.VERY_WEAK
    feedback.push('Password is too short')
  } else if (score < 40) {
    strength = PasswordStrength.WEAK
    feedback.push('Consider using a longer password')
  } else if (score < 60) {
    strength = PasswordStrength.FAIR
    feedback.push('Password is acceptable but could be stronger')
  } else if (score < 80) {
    strength = PasswordStrength.GOOD
    feedback.push('Good password strength')
  } else {
    strength = PasswordStrength.STRONG
    feedback.push('Excellent password strength')
  }

  // Additional feedback
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters for better security')
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers for better security')
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Add special characters for better security')
  }

  return {
    strength,
    score,
    feedback,
    meetsMinimum: password.length >= PASSWORD_VALIDATION_CONFIG.MIN_LENGTH
  }
}

/**
 * Get color for password strength indicator
 */
export function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.VERY_WEAK:
      return 'red'
    case PasswordStrength.WEAK:
      return 'orange'
    case PasswordStrength.FAIR:
      return 'yellow'
    case PasswordStrength.GOOD:
      return 'lightgreen'
    case PasswordStrength.STRONG:
      return 'green'
  }
}

/**
 * Get label for password strength
 */
export function getStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.VERY_WEAK:
      return 'Very Weak'
    case PasswordStrength.WEAK:
      return 'Weak'
    case PasswordStrength.FAIR:
      return 'Fair'
    case PasswordStrength.GOOD:
      return 'Good'
    case PasswordStrength.STRONG:
      return 'Strong'
  }
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useChangePassword hook
 * Uses TanStack Query's useMutation return type
 */
export interface UseChangePasswordResult {
  /** Mutation function to change password */
  mutate: (request: PasswordChangeRequest) => void

  /** Async mutation function (returns promise) */
  mutateAsync: (request: PasswordChangeRequest) => Promise<PasswordChangeResponse>

  /** Mutation loading state */
  isPending: boolean

  /** Mutation success state */
  isSuccess: boolean

  /** Mutation error state */
  isError: boolean

  /** Mutation error */
  error: Error | null

  /** Reset mutation state */
  reset: () => void
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Password change error codes
 */
export enum PasswordChangeErrorCode {
  /** Current password is incorrect */
  INVALID_CURRENT_PASSWORD = 'INVALID_CURRENT_PASSWORD',

  /** New password doesn't meet requirements */
  WEAK_PASSWORD = 'WEAK_PASSWORD',

  /** Passwords don't match */
  PASSWORDS_MISMATCH = 'PASSWORDS_MISMATCH',

  /** Same as current password */
  SAME_PASSWORD = 'SAME_PASSWORD',

  /** Supabase Auth error */
  AUTH_ERROR = 'AUTH_ERROR',

  /** Network error */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Session expired */
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Password change error (custom error class)
 */
export class PasswordChangeError extends Error {
  /** Error code */
  code: PasswordChangeErrorCode

  /** Original error (if any) */
  originalError?: Error

  constructor(
    code: PasswordChangeErrorCode,
    message: string,
    originalError?: Error
  ) {
    super(message)
    this.name = 'PasswordChangeError'
    this.code = code
    this.originalError = originalError
  }
}

/**
 * Create user-friendly error message from error code
 */
export function getPasswordErrorMessage(code: PasswordChangeErrorCode): string {
  switch (code) {
    case PasswordChangeErrorCode.INVALID_CURRENT_PASSWORD:
      return 'Current password is incorrect. Please try again.'
    case PasswordChangeErrorCode.WEAK_PASSWORD:
      return `Password must be at least ${PASSWORD_VALIDATION_CONFIG.MIN_LENGTH} characters.`
    case PasswordChangeErrorCode.PASSWORDS_MISMATCH:
      return 'Passwords do not match. Please try again.'
    case PasswordChangeErrorCode.SAME_PASSWORD:
      return 'New password must be different from current password.'
    case PasswordChangeErrorCode.AUTH_ERROR:
      return 'Failed to update password. Please try again.'
    case PasswordChangeErrorCode.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.'
    case PasswordChangeErrorCode.SESSION_EXPIRED:
      return 'Your session has expired. Please log in again.'
    case PasswordChangeErrorCode.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for PasswordChangeForm component
 */
export interface PasswordChangeFormProps {
  /** Callback when password change succeeds */
  onSuccess?: () => void

  /** Callback when password change fails */
  onError?: (error: PasswordChangeError) => void

  /** Show/hide password toggle enabled */
  allowPasswordVisibilityToggle?: boolean

  /** Collapsible form (accordion) */
  collapsible?: boolean

  /** Initially collapsed (if collapsible) */
  defaultCollapsed?: boolean
}

// ============================================================================
// Example Usage (Documentation)
// ============================================================================

/**
 * Example: Using useChangePassword hook
 *
 * ```typescript
 * import { useChangePassword, validatePasswordChangeForm } from './contracts/password-change.types'
 *
 * function PasswordChangeForm() {
 *   const [currentPassword, setCurrentPassword] = useState('')
 *   const [newPassword, setNewPassword] = useState('')
 *   const [confirmPassword, setConfirmPassword] = useState('')
 *
 *   const { mutate, isPending, isSuccess, error } = useChangePassword()
 *
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault()
 *
 *     const request = { currentPassword, newPassword, confirmPassword }
 *     const validation = validatePasswordChangeForm(request)
 *
 *     if (!validation.valid) {
 *       toast.error(validation.error)
 *       return
 *     }
 *
 *     mutate(request)
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         type="password"
 *         value={currentPassword}
 *         onChange={(e) => setCurrentPassword(e.target.value)}
 *         placeholder="Current password"
 *       />
 *       <input
 *         type="password"
 *         value={newPassword}
 *         onChange={(e) => setNewPassword(e.target.value)}
 *         placeholder="New password"
 *       />
 *       <input
 *         type="password"
 *         value={confirmPassword}
 *         onChange={(e) => setConfirmPassword(e.target.value)}
 *         placeholder="Confirm new password"
 *       />
 *       <button type="submit" disabled={isPending}>
 *         {isPending ? 'Changing...' : 'Change Password'}
 *       </button>
 *       {isSuccess && <p>Password changed successfully!</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </form>
 *   )
 * }
 * ```
 */

/**
 * Example: Password strength indicator
 *
 * ```typescript
 * import { analyzePasswordStrength, getStrengthColor, getStrengthLabel } from './contracts/password-change.types'
 *
 * function PasswordStrengthIndicator({ password }: { password: string }) {
 *   const analysis = analyzePasswordStrength(password)
 *
 *   return (
 *     <div>
 *       <div className="strength-bar">
 *         <div
 *           className="strength-fill"
 *           style={{
 *             width: `${analysis.score}%`,
 *             backgroundColor: getStrengthColor(analysis.strength)
 *           }}
 *         />
 *       </div>
 *       <p>{getStrengthLabel(analysis.strength)}</p>
 *       <ul>
 *         {analysis.feedback.map((msg, i) => (
 *           <li key={i}>{msg}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   )
 * }
 * ```
 */
