// Field Weld Section Component
// Feature: 021-public-homepage (enhancement)
// Description: Brief highlights of field weld and welder tracking

export function FieldWeldSection() {
  return (
    <section
      id="field-welds"
      className="py-16 bg-slate-900"
      role="region"
      aria-label="Field weld and welder tracking"
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h2 className="text-4xl font-bold text-white">
            Field Weld & Welder Tracking
          </h2>
        </div>

        {/* Description */}
        <div className="text-center mb-8 space-y-4">
          <p className="text-lg text-slate-300 leading-relaxed">
            Track every field weld from assignment through completion. Assign specific welders to field welds, record NDE (Non-Destructive Examination) results, and document any repairs with complete history.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed">
            Monitor welder performance across your project with detailed analytics. See which welders are most productive, track reject rates, and identify training opportunities before they become quality issues.
          </p>
        </div>

        {/* Key Features */}
        <div className="bg-slate-700/30 rounded-lg p-8 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-4 text-center">
            Field Weld Features
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
              <span>Assign welders to specific field welds with touch-friendly interface</span>
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
              <span>Track NDE results (pass, fail, pending)</span>
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
              <span>Complete repair history with timestamps and user tracking</span>
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
              <span>Welder performance analytics and productivity tracking</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
