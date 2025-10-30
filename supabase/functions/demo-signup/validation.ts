// Validation Utilities
// Feature: 021-public-homepage
// Task: T009
// Description: Email and input validation for demo signup

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate email format
 * Uses standard email regex pattern
 *
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // Standard email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return emailRegex.test(email) && email.length <= 255
}

/**
 * Validate full name
 * Must be 1-100 characters, trimmed of whitespace
 *
 * @param fullName - Full name to validate
 * @returns true if valid, false otherwise
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
 *
 * @param email - Email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalize full name
 * Trims whitespace and removes extra spaces
 *
 * @param fullName - Full name to normalize
 * @returns Normalized full name
 */
export function normalizeFullName(fullName: string): string {
  return fullName
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
}

/**
 * Validate demo signup request body
 * Returns validation errors if any
 *
 * @param body - Request body to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateDemoSignupRequest(body: any): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate email
  if (!body.email) {
    errors.push({
      field: 'email',
      message: 'Email is required'
    })
  } else if (!isValidEmail(body.email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format'
    })
  }

  // Validate full_name
  if (!body.full_name) {
    errors.push({
      field: 'full_name',
      message: 'Full name is required'
    })
  } else if (!isValidFullName(body.full_name)) {
    errors.push({
      field: 'full_name',
      message: 'Full name must be 1-100 characters'
    })
  }

  return errors
}

/**
 * Sanitize input to prevent XSS
 * Basic sanitization - removes HTML tags and dangerous characters
 *
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous characters
    .trim()
}
