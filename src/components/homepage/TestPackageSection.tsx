// Test Package Section Component
// Feature: 021-public-homepage (enhancement)
// Description: Brief highlights of test package management

export function TestPackageSection() {
  return (
    <section
      id="test-packages"
      className="py-16 bg-slate-800"
      role="region"
      aria-label="Test package management"
    >
      <div className="max-w-4xl mx-auto px-6">
        {/* Icon and Heading */}
        <div className="flex items-center justify-center mb-6">
          <svg
            className="w-12 h-12 text-blue-500 mr-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <h2 className="text-4xl font-bold text-white">
            Test Package Management
          </h2>
        </div>

        {/* Description */}
        <div className="text-center mb-8 space-y-4">
          <p className="text-lg text-slate-300 leading-relaxed">
            Organize components into logical test packages that mirror your project's turnover strategy. Group by system, area, or functional boundaries to align with how your project team plans commissioning and startup.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed">
            Track completion status at the package level to know exactly which systems are ready for turnover. Automated rollup calculations show package progress based on component milestones, making it easy to identify what's holding up handover.
          </p>
        </div>

        {/* Key Features */}
        <div className="bg-slate-700/30 rounded-lg p-8 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-4 text-center">
            Test Package Features
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="flex items-start text-slate-300">
              <svg
                className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Group components into test packages by system or area</span>
            </li>
            <li className="flex items-start text-slate-300">
              <svg
                className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Track turnover milestones at the package level</span>
            </li>
            <li className="flex items-start text-slate-300">
              <svg
                className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Automated progress calculations from component milestones</span>
            </li>
            <li className="flex items-start text-slate-300">
              <svg
                className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>System completion status for turnover planning</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
