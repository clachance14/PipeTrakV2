/**
 * TemplateCard component (Feature 026 - US1 & US4)
 * Displays summary card for a component type's milestone templates
 * with last modified information (US4)
 */

interface TemplateCardProps {
  componentType: string
  milestoneCount: number
  hasTemplates: boolean
  onEdit: () => void
  canEdit?: boolean
  lastModified?: {
    userName: string | null
    date: string
  }
}

/**
 * Formats a date string to relative time if recent, otherwise absolute date
 */
function formatLastModified(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

  // Show relative time if within 24 hours
  if (diffInHours < 24) {
    const diffInMinutes = Math.floor(diffInHours * 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`
    }
    const hours = Math.floor(diffInHours)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }

  // Otherwise show absolute date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function TemplateCard({
  componentType,
  milestoneCount,
  hasTemplates,
  onEdit,
  canEdit = false,
  lastModified,
}: TemplateCardProps) {
  return (
    <div
      className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
      role="article"
      aria-label={`${componentType} milestone template`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{componentType}</h3>
          {hasTemplates ? (
            <p className="text-sm text-gray-600 mt-1">
              {milestoneCount} {milestoneCount === 1 ? 'milestone' : 'milestones'}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">No templates</p>
          )}

          {/* User Story 4: Last modified display */}
          {lastModified && (
            <p className="text-xs text-gray-500 mt-2">
              Last modified by {lastModified.userName || 'Unknown user'} on{' '}
              <time dateTime={lastModified.date}>
                {formatLastModified(lastModified.date)}
              </time>
            </p>
          )}
        </div>

        {canEdit && hasTemplates && (
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            aria-label={`Edit ${componentType} milestone weights`}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
