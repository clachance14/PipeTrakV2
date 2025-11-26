// Demo Mode Banner Component
// Feature: 031-one-click-demo-access
// Description: Persistent banner shown when user is logged in as demo account

import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const DEMO_EMAIL = 'demo@pipetrak.co'

/**
 * Check if the current user is the demo account
 */
export function isDemoUser(email: string | undefined): boolean {
  return email?.toLowerCase() === DEMO_EMAIL
}

/**
 * Persistent banner displayed when user is logged into the demo account.
 * Shows a message about demo mode and a CTA to sign up for a real account.
 */
export function DemoModeBanner() {
  const { user } = useAuth()

  // Only show banner for demo user
  if (!user || !isDemoUser(user.email)) {
    return null
  }

  return (
    <div
      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2"
      role="banner"
      aria-label="Demo mode notification"
      data-tour="demo-banner"
    >
      <div className="mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">
            You&apos;re exploring the demo.
          </span>
          <span className="hidden sm:inline text-amber-100">
            Data resets nightly.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-amber-100">
            Ready for your own?
          </span>
          <Link
            to="/register"
            className="inline-flex items-center gap-1 px-3 py-1 bg-white text-amber-600 rounded-md font-semibold hover:bg-amber-50 transition-colors"
            style={{ minHeight: '32px' }}
          >
            Sign Up Free
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
