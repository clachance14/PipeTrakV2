// Feature Cards Component
// Feature: 021-public-homepage
// Tasks: T023-T027
// Description: 3 feature highlight cards with animations, responsive layout, and accessibility

import { useStaggeredScroll } from '@/lib/animations'

interface FeatureCard {
  icon: React.ReactNode
  title: string
  description: string
}

const features: FeatureCard[] = [
  {
    icon: (
      <svg
        className="w-12 h-12 text-blue-500"
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
    ),
    title: 'Mobile-First Updates',
    description: 'Update milestones directly from the field with touch-optimized mobile interface. No more waiting until you are back at the office.'
  },
  {
    icon: (
      <svg
        className="w-12 h-12 text-blue-500"
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
    ),
    title: 'Real-Time Tracking',
    description: 'See project progress update instantly as teams mark milestones complete. Know exactly where every component stands at any moment.'
  },
  {
    icon: (
      <svg
        className="w-12 h-12 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    title: 'Complete Audit Trail',
    description: 'Every milestone update is logged with timestamp and user. Perfect for QA documentation, client reporting, and regulatory compliance.'
  }
]

export function FeatureCards() {
  const containerRef = useStaggeredScroll(':scope > div', 150, 0.1) as React.RefObject<HTMLDivElement>

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-6"
      role="list"
      aria-label="Feature highlights"
    >
      {features.map((feature, index) => (
        <div
          key={index}
          className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-8 hover:bg-slate-700/70 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl opacity-0"
          role="listitem"
          tabIndex={0}
          aria-label={`${feature.title}: ${feature.description}`}
        >
          {/* Icon */}
          <div className="mb-6 flex justify-center" aria-hidden="true">
            {feature.icon}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-white mb-4 text-center">
            {feature.title}
          </h3>

          {/* Description */}
          <p className="text-slate-300 text-center leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  )
}
