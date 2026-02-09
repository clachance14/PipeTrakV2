import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { SearchResultGroup } from '@/hooks/useGlobalSearch'
import type { SearchIndexItem } from '@/hooks/useSearchIndex'

interface SearchResultsDropdownProps {
  results: SearchResultGroup[]
  totalResults: number
  isLoading: boolean
  query: string
  onClose: () => void
}

const CATEGORY_ICONS: Record<SearchIndexItem['category'], string> = {
  drawing: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  component: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  welder: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  test_package: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  field_weld: 'M13 10V3L4 14h7v7l9-11h-7z',
  area: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
}

function getRoute(item: SearchIndexItem): string {
  switch (item.category) {
    case 'drawing':
      return `/drawings?expanded=${item.id}`
    case 'component':
      return `/components?search=${encodeURIComponent(item.label)}`
    case 'welder':
      return '/welders'
    case 'test_package':
      return `/packages/${item.id}/components`
    case 'field_weld':
      return `/weld-log?search=${encodeURIComponent(item.label)}`
    case 'area':
      return `/components?area=${item.id}`
    default:
      return '/dashboard'
  }
}

export function SearchResultsDropdown({
  results,
  totalResults,
  isLoading,
  query,
  onClose,
}: SearchResultsDropdownProps) {
  const navigate = useNavigate()

  const handleResultClick = (item: SearchIndexItem) => {
    navigate(getRoute(item))
    onClose()
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
      {isLoading ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          Loading...
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          No results found for &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          {results.map((group) => (
            <div key={group.category}>
              {/* Category header */}
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.categoryLabel}
                  {group.totalCount > group.items.length && (
                    <span className="ml-1 font-normal text-gray-400">
                      ({group.totalCount})
                    </span>
                  )}
                </span>
              </div>

              {/* Results */}
              {group.items.map((item) => (
                <button
                  key={`${item.category}-${item.id}`}
                  onClick={() => handleResultClick(item)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left',
                    'hover:bg-blue-50 transition-colors cursor-pointer',
                    'border-b border-gray-50 last:border-b-0'
                  )}
                >
                  {/* Icon */}
                  <svg
                    className="h-4 w-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={CATEGORY_ICONS[item.category]}
                    />
                  </svg>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.sublabel && (
                      <p className="text-xs text-gray-500 truncate">
                        {item.sublabel}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}

          {/* Footer with total count */}
          {totalResults > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-500">
                {totalResults} result{totalResults !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
