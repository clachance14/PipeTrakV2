/**
 * Forgot Password Page
 * Feature: Password Reset Flow
 * Purpose: Allow users who can't log in to request password reset email
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getSuggestedEmail } from '@/lib/validation'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null)

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)

    // Check for typos and set suggestion
    const suggestion = getSuggestedEmail(newEmail)
    setSuggestedEmail(suggestion)
  }

  const handleUseSuggestion = () => {
    if (suggestedEmail) {
      setEmail(suggestedEmail)
      setSuggestedEmail(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      // Get the redirect URL based on current origin
      const redirectTo = `${window.location.origin}/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        throw resetError
      }

      setSuccess(true)
    } catch (err: any) {
      // Show the actual error message from Supabase
      setError(err?.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {success ? (
          <div className="rounded bg-green-50 p-4">
            <div className="flex">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">
                  Check your email
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
                </p>
                <p className="mt-3 text-sm text-green-700">
                  Please check your inbox and spam folder. Didn't receive an email? Check for typos or{' '}
                  <Link to="/register" className="font-medium underline">
                    create a new account
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />

              {/* Typo Detection Banner */}
              {suggestedEmail && (
                <div className="mt-2 rounded bg-yellow-50 border border-yellow-200 p-3">
                  <p className="text-sm text-yellow-800">
                    Did you mean{' '}
                    <button
                      type="button"
                      onClick={handleUseSuggestion}
                      className="font-medium text-yellow-900 underline hover:text-yellow-700"
                    >
                      {suggestedEmail}
                    </button>?
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2.5"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
