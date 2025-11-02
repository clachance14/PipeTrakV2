// Team Management Section Component
// Feature: 021-public-homepage (enhancement)
// Description: Brief highlights of team management and permissions

export function TeamManagementSection() {
  return (
    <section
      className="py-16 bg-slate-900"
      role="region"
      aria-label="Team management and permissions"
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h2 className="text-4xl font-bold text-white">
            Team Management & Permissions
          </h2>
        </div>

        {/* Description */}
        <div className="text-center mb-8 space-y-4">
          <p className="text-lg text-slate-300 leading-relaxed">
            Control exactly who can view, edit, or delete each type of data with granular role-based permissions. Field supervisors update milestones, QA managers access history without making changes, and project managers control team membership and permissions.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed">
            Invite team members via email with automatic account creation and role assignment. Team members receive branded onboarding and gain immediate access to assigned projects. Revoke access instantly when team members rotate off the project.
          </p>
        </div>

        {/* Key Features */}
        <div className="bg-slate-700/30 rounded-lg p-8 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-4 text-center">
            Team Management Features
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
              <span>Granular role-based permissions for each data type</span>
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
              <span>Email-based invitations with automatic account setup</span>
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
              <span>Instant permission updates and access revocation</span>
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
              <span>Complete audit trail of all team actions and changes</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
