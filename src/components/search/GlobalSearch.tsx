import { useState, useRef, useEffect, useCallback } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { SearchResultsDropdown } from './SearchResultsDropdown'

export function GlobalSearch() {
  const { selectedProjectId } = useProject()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebouncedValue(query, 300)
  const { results, totalResults, isLoading, hasQuery } = useGlobalSearch(
    debouncedQuery,
    selectedProjectId
  )

  // Show dropdown when we have a debounced query with 2+ chars
  const showDropdown = isOpen && hasQuery

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    },
    []
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }, [])

  return (
    <div className="hidden lg:flex flex-1 max-w-2xl mx-8" ref={containerRef}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search components, drawings, packages..."
          className="w-full rounded-md bg-slate-700 px-4 py-2 pl-10 text-sm text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search project"
          aria-expanded={showDropdown}
          role="combobox"
          autoComplete="off"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Clear button */}
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Results dropdown */}
        {showDropdown && (
          <SearchResultsDropdown
            results={results}
            totalResults={totalResults}
            isLoading={isLoading}
            query={debouncedQuery}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  )
}
