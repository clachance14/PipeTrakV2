/**
 * Reset Password Page
 * Feature: Password Reset Flow
 * Purpose: Allow users to set new password after clicking email reset link
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  validateNewPassword,
  validatePasswordConfirmation,
  analyzePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
} from '@/lib/password-validation'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

type RecoveryState = 'verifying' | 'ready' | 'expired'

export function ResetPasswordPage() {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('verifying')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Listen for PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, _session: Session | null) => {
        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryState('ready')
        } else if (event === 'SIGNED_OUT' && recoveryState === 'verifying') {
          // If signed out and still verifying, token is invalid/expired
          setRecoveryState('expired')
        }
      }
    )

    // Set timeout to show expired state if no recovery event after 2 seconds
    const timeout = setTimeout(() => {
      if (recoveryState === 'verifying') {
        setRecoveryState('expired')
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [recoveryState])

  const passwordAnalysis = password ? analyzePasswordStrength(password) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password
    const passwordValidation = validateNewPassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Invalid password')
      return
    }

    // Validate confirmation
    const confirmValidation = validatePasswordConfirmation(password, confirmPassword)
    if (!confirmValidation.valid) {
      setError(confirmValidation.error || 'Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      // Success! Redirect to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      // Show the actual error message from Supabase
      setError(err?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Set New Password
          </h2>
          {recoveryState === 'verifying' && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Verifying your reset link...
            </p>
          )}
          {recoveryState === 'ready' && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your new password below
            </p>
          )}
        </div>

        {recoveryState === 'verifying' && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        )}

        {recoveryState === 'expired' && (
          <div className="rounded bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">
              Invalid or Expired Reset Link
            </h3>
            <p className="mt-2 text-sm text-red-700">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2.5"
              >
                Request New Reset Link
              </Button>
            </div>
          </div>
        )}

        {recoveryState === 'ready' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter new password"
              />

              {/* Password Strength Indicator */}
              {passwordAnalysis && password.length > 0 && (
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${passwordAnalysis.score}%`,
                        backgroundColor: getStrengthColor(passwordAnalysis.strength),
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Strength: {getStrengthLabel(passwordAnalysis.strength)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Confirm new password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2.5"
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
