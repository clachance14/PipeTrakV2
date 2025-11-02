// Homepage Component
// Feature: 021-public-homepage
// Task: T017
// Description: Compose HeroSection, ScrollIndicator, HomepageFooter with responsive layout

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HeroSection } from '@/components/homepage/HeroSection'
import { ScrollIndicator } from '@/components/homepage/ScrollIndicator'
import { HomepageFooter } from '@/components/homepage/HomepageFooter'
import { FeatureCards } from '@/components/homepage/FeatureCards'
import { FeaturesCarousel } from '@/components/homepage/FeaturesCarousel'
import { FeatureDeepDive } from '@/components/homepage/FeatureDeepDive'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Auto-redirect authenticated users to dashboard (User Story 3 requirement)
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  // SEO Meta Tags (T058)
  useEffect(() => {
    document.title = 'PipeTrak - Industrial Pipe Tracking for Construction Teams'

    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Track every pipe from takeoff to turnover. Real-time visibility, mobile-first updates, and complete audit trail for industrial construction projects.')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = 'Track every pipe from takeoff to turnover. Real-time visibility, mobile-first updates, and complete audit trail for industrial construction projects.'
      document.head.appendChild(meta)
    }
  }, [])

  // Don't render homepage content if user is authenticated (will redirect)
  if (user) {
    return null
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Hero Section with Scroll Indicator */}
        <div className="relative">
          <HeroSection />
          <ScrollIndicator />
        </div>

        {/* Feature Highlights Section (Phase 4 - User Story 2) */}
        <section
          id="features"
          className="py-20 bg-slate-800"
          role="region"
          aria-label="Feature highlights"
        >
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Everything You Need to Track Your Project
            </h2>
            <FeatureCards />
          </div>
        </section>

        {/* Key Features Section with Carousel */}
        <div id="reporting" className="bg-slate-900">
          <div className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
            <h2 className="text-5xl font-bold text-white mb-4">
              Key Features
            </h2>
            <p className="text-xl text-slate-400 mb-8">
              Comprehensive tools designed for industrial construction teams
            </p>
          </div>

          <FeaturesCarousel />
        </div>

        {/* Feature Deep-Dive Section */}
        <section
          id="deep-dive"
          className="py-20 bg-slate-900"
          role="region"
          aria-label="Feature deep-dives"
        >
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-4xl font-bold text-white text-center mb-6">
              How PipeTrak Works
            </h2>
            <p className="text-xl text-slate-400 text-center mb-12 max-w-3xl mx-auto">
              From material takeoff to final turnover, PipeTrak provides the tools you need to track every component through every milestone.
            </p>
            <FeatureDeepDive />
          </div>
        </section>

        {/* Footer */}
        <HomepageFooter />
      </div>
    </ErrorBoundary>
  )
}
