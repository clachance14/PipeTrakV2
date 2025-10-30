// Demo Signup Form Component
// Feature: 021-public-homepage
// Task: T035, T053, T054
// Description: Email + name fields with validation, mobile responsive, WCAG 2.1 AA accessible

import { useState, FormEvent } from 'react'

interface DemoSignupFormProps {
  onSubmit: (email: string, fullName: string) => void
  isLoading: boolean
}

export function DemoSignupForm({ onSubmit, isLoading }: DemoSignupFormProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [errors, setErrors] = useState<{ email?: string; fullName?: string }>({})

  const validateForm = (): boolean => {
    const newErrors: { email?: string; fullName?: string } = {}

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(email.trim(), fullName.trim())
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8"
      noValidate
      aria-label="Demo signup form"
    >
      <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">
        Try PipeTrak Demo
      </h2>

      <p className="text-slate-600 mb-8 text-center">
        Get instant access to a fully-featured demo project with 200 sample components. No credit card required.
      </p>

      {/* Email Field */}
      <div className="mb-6">
        <label
          htmlFor="demo-email"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Email Address
        </label>
        <input
          id="demo-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            errors.email ? 'border-red-500' : 'border-slate-300'
          }`}
          style={{ minHeight: '48px' }}
          placeholder="you@company.com"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          autoComplete="email"
          required
        />
        {errors.email && (
          <p
            id="email-error"
            className="mt-2 text-sm text-red-600"
            role="alert"
          >
            {errors.email}
          </p>
        )}
      </div>

      {/* Full Name Field */}
      <div className="mb-8">
        <label
          htmlFor="demo-fullname"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Full Name
        </label>
        <input
          id="demo-fullname"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            errors.fullName ? 'border-red-500' : 'border-slate-300'
          }`}
          style={{ minHeight: '48px' }}
          placeholder="John Smith"
          aria-invalid={errors.fullName ? 'true' : 'false'}
          aria-describedby={errors.fullName ? 'fullname-error' : undefined}
          autoComplete="name"
          required
        />
        {errors.fullName && (
          <p
            id="fullname-error"
            className="mt-2 text-sm text-red-600"
            role="alert"
          >
            {errors.fullName}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold transition-colors"
        style={{ minHeight: '56px' }}
        aria-label={isLoading ? 'Creating demo account...' : 'Create demo account'}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Creating Demo Account...
          </span>
        ) : (
          'Get Instant Access'
        )}
      </button>

      <p className="mt-6 text-xs text-slate-500 text-center">
        By signing up, you agree to our{' '}
        <a href="/legal/terms" className="text-blue-600 hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/legal/privacy" className="text-blue-600 hover:underline">
          Privacy Policy
        </a>
        . Demo accounts expire after 7 days.
      </p>
    </form>
  )
}
