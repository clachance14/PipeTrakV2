/**
 * CloneTemplatesBanner component (Feature 026 - US1)
 * Banner prompting users to clone system templates for existing projects
 */

interface CloneTemplatesBannerProps {
  onClone: () => void
  isCloning: boolean
}

export function CloneTemplatesBanner({ onClone, isCloning }: CloneTemplatesBannerProps) {
  return (
    <div
      className="bg-blue-50 border border-blue-200 rounded-lg p-6"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Clone Templates to Get Started
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Clone the system milestone weight templates to this project to customize them.
            You can adjust milestone weights for each component type to match your project's needs.
          </p>
          <button
            onClick={onClone}
            disabled={isCloning}
            className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-busy={isCloning}
          >
            {isCloning ? 'Cloning...' : 'Clone Templates'}
          </button>
        </div>
      </div>
    </div>
  )
}
