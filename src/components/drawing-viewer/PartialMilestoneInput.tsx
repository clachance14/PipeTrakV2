/**
 * PartialMilestoneInput Component
 * Inline-editable percentage input for partial (0-100%) milestones.
 * Used in aggregate component cards (pipe/threaded_pipe).
 */

import { useState, useRef, useEffect, useCallback } from 'react'

interface PartialMilestoneInputProps {
  /** Full milestone name (e.g., "Fabricate") */
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function PartialMilestoneInput({
  label,
  value,
  onChange,
  disabled,
}: PartialMilestoneInputProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const commitAndClose = useCallback(() => {
    const num = Math.max(0, Math.min(100, Math.round(Number(draft) || 0)))
    onChange(num)
    setEditing(false)
  }, [draft, onChange])

  // Click-outside listener
  useEffect(() => {
    if (!editing) return
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        commitAndClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editing, commitAndClose])

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setDraft(String(value))
            setEditing(true)
          }
        }}
        className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors"
        title={`${label}: ${value}% — click to edit`}
        disabled={disabled}
      >
        <span className="text-gray-700 font-medium">{label}</span>
        <span>{value}%</span>
      </button>
    )
  }

  return (
    <span ref={wrapperRef} className="flex items-center justify-between w-full px-2 py-1 text-sm">
      <span className="text-gray-700 font-medium">{label}</span>
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitAndClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitAndClose()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-14 px-1 py-0.5 text-sm border border-blue-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
          onFocus={(e) => e.target.select()}
        />
        <span className="text-gray-400">%</span>
      </span>
    </span>
  )
}
