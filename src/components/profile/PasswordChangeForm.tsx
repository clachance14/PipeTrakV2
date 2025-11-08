/**
 * Password Change Form Component
 * Feature: 017-user-profile-management
 * Purpose: Allow users to change their password with validation
 */

import { useState } from 'react'
import { useChangePassword } from '@/hooks/useChangePassword'
import {
  validatePasswordChangeForm,
  analyzePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
  type PasswordChangeRequest,
} from '@/lib/password-validation'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const { mutate, isPending } = useChangePassword()

  // Analyze password strength as user types
  const strengthAnalysis = newPassword ? analyzePasswordStrength(newPassword) : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const request: PasswordChangeRequest = {
      currentPassword,
      newPassword,
      confirmPassword,
    }

    // Validate form
    const validation = validatePasswordChangeForm(request)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid input')
      return
    }

    // Submit password change
    mutate(request, {
      onSuccess: () => {
        toast.success('Password updated successfully')
        // Clear form
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setValidationError(null)
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update password')
        setValidationError(error.message)
      },
    })
  }

  return (
    <div className="border-t border-slate-200 pt-6 mt-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Enter current password"
              disabled={isPending}
              aria-label="Current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
            >
              {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Enter new password (min 8 characters)"
              disabled={isPending}
              aria-label="New password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {strengthAnalysis && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Password Strength</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: getStrengthColor(strengthAnalysis.strength) }}
                >
                  {getStrengthLabel(strengthAnalysis.strength)}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${strengthAnalysis.score}%`,
                    backgroundColor: getStrengthColor(strengthAnalysis.strength),
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Confirm new password"
              disabled={isPending}
              aria-label="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <p className="text-sm text-red-600" role="alert">
            {validationError}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}
