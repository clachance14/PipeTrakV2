// Scroll Indicator Component
// Feature: 021-public-homepage
// Task: T015
// Description: Animated bouncing chevron at bottom center to indicate scrollable content

export function ScrollIndicator() {
  return (
    <div
      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce"
      aria-hidden="true"
    >
      <svg
        className="w-8 h-8 text-white/70"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  )
}
