/**
 * Password Validation Utilities
 * Feature: 017-user-profile-management
 * Purpose: Re-export password validation functions for use in components
 *
 * Note: The actual implementation is in contracts/password-change.types.ts
 * This file provides a cleaner import path for components.
 */

export {
  PASSWORD_VALIDATION_CONFIG,
  PasswordStrength,
  type PasswordStrengthAnalysis,
  type PasswordValidation,
  type PasswordChangeRequest,
  type PasswordChangeResponse,
  validateCurrentPassword,
  validateNewPassword,
  validatePasswordConfirmation,
  validatePasswordsDifferent,
  validatePasswordChangeForm,
  analyzePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
} from '../../specs/017-user-profile-management/contracts/password-change.types'
