// Demo Loading Transition Component
// Feature: 031-one-click-demo-access
// Description: Full-screen loading overlay shown during demo login with progressive messages

import { useState, useEffect } from 'react'

interface DemoLoadingTransitionProps {
  isVisible: boolean
}

const LOADING_MESSAGES = [
  'Setting up your demo...',
  'Loading sample project data...',
  'Preparing dashboard...',
  'Almost ready...'
]

/**
 * Full-screen loading overlay displayed during demo login process.
 * Shows progressive messages to keep user engaged during the login flow.
 */
export function DemoLoadingTransition({ isVisible }: DemoLoadingTransitionProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  // Cycle through loading messages every 1.5 seconds
  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0)
      return
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const nextIndex = prev + 1
        // Stay on last message if we've shown all
        return nextIndex < LOADING_MESSAGES.length ? nextIndex : prev
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) {
    return null
  }

  const currentMessage = LOADING_MESSAGES[messageIndex] ?? LOADING_MESSAGES[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Loading demo"
    >
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        {/* Animated PipeTrak logo/spinner */}
        <div className="relative">
          {/* Outer ring */}
          <div className="h-20 w-20 rounded-full border-4 border-slate-600" />
          {/* Spinning ring */}
          <div className="absolute inset-0 h-20 w-20 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
        </div>

        {/* Brand */}
        <div className="text-3xl font-bold text-white">
          PipeTrak
        </div>

        {/* Loading message with fade transition */}
        <div
          className="text-lg text-slate-300 min-h-[28px] transition-opacity duration-300"
          aria-live="polite"
        >
          {currentMessage}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2" aria-hidden="true">
          {LOADING_MESSAGES.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                index <= messageIndex ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
