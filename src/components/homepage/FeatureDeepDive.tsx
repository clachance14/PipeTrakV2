// Feature Deep-Dive Component
// Feature: 021-public-homepage (enhancement)
// Description: Educational deep-dive cards explaining key PipeTrak capabilities

import { useStaggeredScroll } from '@/lib/animations'

interface DeepDiveFeature {
  icon: React.ReactNode
  title: string
  description: string[]
  benefits: string[]
}

const deepDiveFeatures: DeepDiveFeature[] = [
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
    title: 'Drawing & Component Management',
    description: [
      'PipeTrak transforms your CSV material takeoff into a living, trackable database. Import your takeoff data with SIZE-aware identity keys that automatically match components across multiple documents.',
      'Each component inherits metadata (Area, System, Test Package) from its parent drawing, creating a logical hierarchy that mirrors how your project is organized. Override metadata at the component level when exceptions occur, while maintaining full audit history of changes.'
    ],
    benefits: [
      'Automatic component matching across drawings',
      'Hierarchical metadata inheritance',
      'Full audit trail of all changes'
    ]
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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    title: 'Milestone Tracking Workflow',
    description: [
      'Track components through up to 7 milestones: Budget, Material Received, Installed, Punchlist Complete, Tested, and Restored. Each milestone type adapts to your component—discrete checkboxes for valves, partial completion sliders for piping spools.',
      'Field teams update milestones directly from mobile devices with touch-optimized interfaces. Changes sync instantly across all connected devices, so office teams see progress the moment it happens. Every update is logged with user, timestamp, and previous/new values for complete accountability.'
    ],
    benefits: [
      'Mobile-first field updates',
      'Real-time synchronization',
      'Component-specific milestone types',
      'Complete change history'
    ]
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
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    title: 'Team Collaboration',
    description: [
      'Granular role-based permissions let you control exactly who can view, edit, or delete each type of data. Field supervisors can update milestones but not modify metadata. QA managers can access full history without making changes. Project managers control team membership and permissions.',
      'Invite team members via email with automatic account creation and role assignment. Team members receive branded onboarding emails and gain immediate access to assigned projects. Revoke access instantly when team members rotate off the project.'
    ],
    benefits: [
      'Role-based access control',
      'Email-based team invitations',
      'Instant permission updates',
      'Audit trail of all team actions'
    ]
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
    title: 'Reporting & Analytics',
    description: [
      'Generate weekly progress reports grouped by Area, System, or Test Package with virtualized tables that handle 10,000+ components effortlessly. Each report shows earned value calculations across all 7 milestones, making it easy to spot bottlenecks and trends.',
      'Export reports to PDF for client deliverables, Excel for further analysis, or CSV for importing into other tools. All exports maintain formatting and include metadata for traceability. Reports render in under 3 seconds even for large datasets, keeping your workflow efficient.'
    ],
    benefits: [
      'Multiple grouping dimensions',
      'PDF, Excel, and CSV export',
      'Earned value calculations',
      'Performance optimized for scale'
    ]
  }
]

export function FeatureDeepDive() {
  const containerRef = useStaggeredScroll(':scope > div', 150, 0.1) as React.RefObject<HTMLDivElement>

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto px-6"
      role="list"
      aria-label="Feature deep-dives"
    >
      {deepDiveFeatures.map((feature, index) => (
        <div
          key={index}
          className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-8 hover:bg-slate-700/70 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl opacity-0"
          role="listitem"
          tabIndex={0}
        >
          {/* Icon */}
          <div className="mb-6 flex justify-start" aria-hidden="true">
            {feature.icon}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-white mb-4">
            {feature.title}
          </h3>

          {/* Description Paragraphs */}
          <div className="space-y-4 mb-6">
            {feature.description.map((paragraph, i) => (
              <p key={i} className="text-slate-300 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Benefits List */}
          <div className="border-t border-slate-600 pt-4">
            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">
              Key Benefits
            </h4>
            <ul className="space-y-2">
              {feature.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start text-slate-300 text-sm">
                  <svg
                    className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5"
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
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}
