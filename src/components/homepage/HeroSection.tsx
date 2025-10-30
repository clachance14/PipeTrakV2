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

  const handleLearnMore = () => {
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
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 md:px-12">
        <div className="text-white text-2xl font-bold tracking-tight">
          PipeTrak
        </div>
        <a
          href="/login"
          className="text-white hover:text-slate-300 transition-colors px-4 py-2 text-sm font-medium"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          Login
        </a>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Track Every Pipe.
          <br />
          From Takeoff to Turnover.
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto">
          Industrial pipe tracking for construction teams who demand visibility, efficiency, and control.
        </p>

        {/* Value Propositions (3 bullets) */}
        <div
          className="flex flex-col md:flex-row gap-6 mb-12 justify-center items-center"
          role="list"
          aria-label="Key features"
        >
          <div className="flex items-center gap-3" role="listitem">
            <svg
              className="w-6 h-6 text-blue-400 flex-shrink-0"
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
            <span className="text-white font-medium">Real-Time Visibility</span>
          </div>

          <div className="flex items-center gap-3" role="listitem">
            <svg
              className="w-6 h-6 text-blue-400 flex-shrink-0"
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
            <span className="text-white font-medium">Mobile-First Updates</span>
          </div>

          <div className="flex items-center gap-3" role="listitem">
            <svg
              className="w-6 h-6 text-blue-400 flex-shrink-0"
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
            <span className="text-white font-medium">Complete Audit Trail</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleTryDemo}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
            style={{ minWidth: '200px', minHeight: '56px' }}
            aria-label="Try PipeTrak demo project"
          >
            Try Demo Project
          </button>

          <button
            onClick={handleLearnMore}
            className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
            style={{ minWidth: '200px', minHeight: '56px' }}
            aria-label="Learn more about PipeTrak features"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  )
}
