// Features Carousel Component
// Feature: 021-public-homepage (enhancement)
// Description: Horizontal carousel for key feature sections with left/right navigation

import { useState, useEffect } from 'react'
import { ReportingSection } from './ReportingSection'
import { FieldWeldSection } from './FieldWeldSection'
import { TestPackageSection } from './TestPackageSection'
import { TeamManagementSection } from './TeamManagementSection'

interface CarouselSlide {
  id: string
  component: React.ReactNode
  label: string
}

const slides: CarouselSlide[] = [
  {
    id: 'reporting',
    component: <ReportingSection />,
    label: 'Reporting & Analytics'
  },
  {
    id: 'field-welds',
    component: <FieldWeldSection />,
    label: 'Field Weld & Welder Tracking'
  },
  {
    id: 'test-packages',
    component: <TestPackageSection />,
    label: 'Test Package Management'
  },
  {
    id: 'team-management',
    component: <TeamManagementSection />,
    label: 'Team Management & Permissions'
  }
]

export function FeaturesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  const goToSlide = (index: number) => {
    setActiveIndex(index)
  }

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative" role="region" aria-label="Key features carousel">
      {/* Title & Counter - Makes it clear it's a carousel */}
      <div className="text-center mb-6">
        <p className="text-slate-400 text-sm font-medium">
          Feature {activeIndex + 1} of {slides.length}
        </p>
        <h3 className="text-white text-xl md:text-2xl font-semibold mt-2">
          {slides[activeIndex]?.label}
        </h3>
      </div>

      {/* Slide Indicators (Dots) - Moved to top for better visibility */}
      <div className="flex justify-center gap-2 mb-6">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === activeIndex
                ? 'w-12 h-3 bg-blue-500'
                : 'w-3 h-3 bg-slate-500 hover:bg-slate-400'
            }`}
            aria-label={`Go to ${slide.label}`}
            aria-current={index === activeIndex ? 'true' : 'false'}
            style={{ minWidth: '12px', minHeight: '12px' }}
          />
        ))}
      </div>

      {/* Carousel Container */}
      <div className="relative px-12 md:px-16">
        <div className="relative overflow-hidden rounded-lg">
          {/* Slides */}
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="w-full flex-shrink-0"
                aria-hidden={index !== activeIndex}
              >
                {slide.component}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons - Moved outside content area */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 md:p-3 transition-all duration-200 hover:scale-110 shadow-lg"
          aria-label="Previous feature"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 md:p-3 transition-all duration-200 hover:scale-110 shadow-lg"
          aria-label="Next feature"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
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
        </button>
      </div>

      {/* Swipe hint for mobile */}
      <div className="text-center mt-6 md:hidden">
        <p className="text-slate-400 text-xs flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          Swipe or tap arrows to see more features
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </p>
      </div>

      {/* Screen Reader Announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Showing {slides[activeIndex]?.label}, slide {activeIndex + 1} of {slides.length}
      </div>
    </div>
  )
}
