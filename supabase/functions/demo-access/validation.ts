// Validation Utilities
// Feature: 031-one-click-demo-access
// Description: Input validation for demo access requests

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate email format
 * Uses standard email regex pattern
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Validate full name
 * Must be 1-100 characters, trimmed of whitespace
 */
export function isValidFullName(fullName: string): boolean {
  if (!fullName || typeof fullName !== 'string') {
    return false
  }

  const trimmed = fullName.trim()
  return trimmed.length >= 1 && trimmed.length <= 100
}

/**
 * Normalize email address
 * Converts to lowercase and trims whitespace
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalize full name
 * Trims whitespace and removes extra spaces
 */
export function normalizeFullName(fullName: string): string {
  return fullName
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Validate demo access request body
 * Returns validation errors if any
 */
export function validateDemoAccessRequest(body: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (!body || typeof body !== 'object') {
    errors.push({
      field: 'body',
      message: 'Request body is required'
    })
    return errors
  }

  const data = body as Record<string, unknown>

  // Validate email
  if (!data.email) {
    errors.push({
      field: 'email',
      message: 'Email is required'
    })
  } else if (!isValidEmail(data.email as string)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format'
    })
  }

  // Validate full_name
  if (!data.full_name) {
    errors.push({
      field: 'full_name',
      message: 'Full name is required'
    })
  } else if (!isValidFullName(data.full_name as string)) {
    errors.push({
      field: 'full_name',
      message: 'Full name must be 1-100 characters'
    })
  }

  return errors
}
