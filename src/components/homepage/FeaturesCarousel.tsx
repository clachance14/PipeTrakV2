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
      {/* Carousel Container */}
      <div className="relative overflow-hidden">
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

        {/* Navigation Buttons */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-3 transition-all duration-200 hover:scale-110 shadow-lg"
          aria-label="Previous feature"
          style={{ minWidth: '48px', minHeight: '48px' }}
        >
          <svg
            className="w-6 h-6"
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
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-3 transition-all duration-200 hover:scale-110 shadow-lg"
          aria-label="Next feature"
          style={{ minWidth: '48px', minHeight: '48px' }}
        >
          <svg
            className="w-6 h-6"
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

      {/* Slide Indicators (Dots) */}
      <div className="flex justify-center gap-3 mt-8 pb-8">
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

      {/* Screen Reader Announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Showing {slides[activeIndex]?.label}, slide {activeIndex + 1} of {slides.length}
      </div>
    </div>
  )
}
