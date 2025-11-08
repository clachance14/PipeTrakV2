// Reporting Section Component
// Feature: 021-public-homepage (enhancement)
// Description: Brief highlights of reporting capabilities

export function ReportingSection() {
  return (
    <section
      className="py-16 bg-slate-800"
      role="region"
      aria-label="Reporting and analytics"
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-4xl font-bold text-white">
            Reporting & Analytics
          </h2>
        </div>

        {/* Description */}
        <div className="text-center mb-8 space-y-4">
          <p className="text-lg text-slate-300 leading-relaxed">
            Generate comprehensive progress reports that show exactly where your project stands. Group components by Area, System, or Test Package to get the view that matters most to your stakeholders.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed">
            Export reports in multiple formats for client deliverables, management reviews, schedule updates, or further analysis. All reports include earned value calculations across your milestone tracking system, making it easy to communicate progress to project schedulers and planning teams.
          </p>
        </div>

        {/* Key Features */}
        <div className="bg-slate-700/30 rounded-lg p-8 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-4 text-center">
            Reporting Features
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
              <span>Weekly progress reports by Area, System, or Test Package</span>
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
              <span>Export to PDF, Excel, and CSV formats</span>
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
              <span>Earned value calculations across all milestones</span>
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
              <span>Performance optimized for 10,000+ component datasets</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
