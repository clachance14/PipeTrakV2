// Hero Section Component
// Feature: 021-public-homepage
// Task: T014
// Description: Full-screen hero with headline, tagline, 3 value proposition bullets, and 2 CTAs

import { useNavigate } from 'react-router-dom'
import { useSmoothScroll } from '@/lib/animations'

export function HeroSection() {
  const navigate = useNavigate()
  const smoothScroll = useSmoothScroll()

  const handleTryDemo = () => {
    navigate('/demo-signup')
  }

  const handleViewFeatures = () => {
    smoothScroll('features')
  }

  return (
    <section
      className="relative h-screen flex items-center justify-center overflow-hidden"
      role="banner"
      aria-label="Hero section"
    >
      {/* Background gradient with overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Logo/Wordmark (top-left) */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-3 md:px-12 md:py-4">
        <div className="text-white text-xl md:text-2xl font-bold tracking-tight">
          PipeTrak
        </div>
        <a
          href="/login"
          className="text-white hover:text-slate-300 transition-colors px-3 py-2 text-sm font-medium flex items-center justify-center"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          Login
        </a>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-24 md:pt-0 md:px-6 text-center">
        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight">
          Track Every Pipe.
          <br />
          From Takeoff to Turnover.
        </h1>

        {/* Tagline */}
        <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-slate-300 mb-4 sm:mb-6 md:mb-10 max-w-3xl mx-auto px-2">
          Industrial pipe tracking for construction teams who demand visibility, efficiency, and control.
        </p>

        {/* Value Propositions (3 bullets) */}
        <div
          className="flex flex-col md:flex-row gap-3 md:gap-6 mb-4 sm:mb-6 md:mb-12 justify-center items-center"
          role="list"
          aria-label="Key features"
        >
          <div className="flex items-center gap-2" role="listitem">
            <svg
              className="w-5 h-5 md:w-6 md:h-6 text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-white font-medium text-sm md:text-base">Real-Time Visibility</span>
          </div>

          <div className="flex items-center gap-2" role="listitem">
            <svg
              className="w-5 h-5 md:w-6 md:h-6 text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="text-white font-medium text-sm md:text-base">Mobile-First Updates</span>
          </div>

          <div className="flex items-center gap-2" role="listitem">
            <svg
              className="w-5 h-5 md:w-6 md:h-6 text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-white font-medium text-sm md:text-base">Complete Audit Trail</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center items-stretch sm:items-center px-2">
          <button
            onClick={handleTryDemo}
            className="px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base md:text-lg shadow-lg hover:shadow-xl"
            style={{ minHeight: '44px' }}
            aria-label="Try PipeTrak demo project"
          >
            Try Demo Project
          </button>

          <button
            onClick={handleViewFeatures}
            className="px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 bg-transparent border-2 border-blue-400 text-blue-400 rounded-lg hover:bg-blue-400/10 transition-colors font-semibold text-sm sm:text-base md:text-lg"
            style={{ minHeight: '44px' }}
            aria-label="View PipeTrak features"
          >
            View Features
          </button>
        </div>
      </div>
    </section>
  )
}
