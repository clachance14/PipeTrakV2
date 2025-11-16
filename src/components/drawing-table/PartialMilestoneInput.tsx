import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { MilestoneConfig, ComponentRow } from '@/types/drawing-table.types'

export interface PartialMilestoneInputProps {
  /** Milestone configuration from progress template */
  milestone: MilestoneConfig

  /** Current milestone value (0-100) */
  currentValue: number

  /** Callback fired when user saves a valid value (blur or Enter key) */
  onUpdate: (value: number) => void

  /** Whether input is disabled (user lacks permission) */
  disabled: boolean

  /** Whether to use mobile sizing (≥48px height) */
  isMobile?: boolean

  /** Whether to abbreviate label for mobile (Receive → Recv, Install → Inst, Restore → Rest) */
  abbreviate?: boolean

  /** Component data (optional, for aggregate threaded pipe helper text - Feature 027) */
  component?: ComponentRow

  /** Display variant - 'default' or 'compact' for card grid layout */
  variant?: 'default' | 'compact'
}

/**
 * Abbreviation map for milestone labels
 */
const LABEL_ABBREVIATIONS: Record<string, string> = {
  'Receive': 'Recv',
  'Fabricate': 'FAB',
  'Install': 'INST',
  'Erect': 'ER',
  'Connect': 'CONN',
  'Support': 'SUP',
  'Restore': 'Rest',
  // 'Punch' and 'Test' are already short
}

/**
 * Inline numeric input for partial milestones
 *
 * Renders a numeric input that allows direct percentage entry (0-100).
 * Users can type a value and save via Enter key or blur event.
 * Escape key cancels the edit and reverts to the previous value.
 *
 * Features:
 * - Auto-select all text on focus
 * - Enter key saves and advances to next input
 * - Escape key cancels and blurs
 * - Blur saves the value
 * - Validation (0-100 range)
 * - Mobile-optimized (≥48px touch target, 16px font)
 * - WCAG 2.1 AA accessible
 */
export function PartialMilestoneInput({
  milestone,
  currentValue,
  onUpdate,
  disabled,
  isMobile = false,
  abbreviate = false,
  component,
  variant = 'default',
}: PartialMilestoneInputProps) {
  const [localValue, setLocalValue] = useState(currentValue)
  const [hasError, setHasError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const revertTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Feature 027: Aggregate threaded pipe helper text
  const isAggregateThreadedPipe =
    component?.component_type === 'threaded_pipe' &&
    component.identity_key &&
    'pipe_id' in component.identity_key &&
    component.identity_key.pipe_id?.endsWith('-AGG')

  const totalLF = component?.attributes?.total_linear_feet
  const linearFeet = totalLF && isAggregateThreadedPipe
    ? Math.round((localValue / 100) * totalLF)
    : null

  // Sync local value when currentValue prop changes
  useEffect(() => {
    setLocalValue(currentValue)
  }, [currentValue])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current)
      }
    }
  }, [])

  const validateValue = (value: number): boolean => {
    return value >= 0 && value <= 100
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text when input receives focus
    e.target.select()
    // Clear any error state
    setHasError(false)
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current)
      revertTimerRef.current = null
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update local state as user types
    const value = e.target.value
    if (value === '') {
      setLocalValue(0)
    } else {
      const numValue = parseInt(value, 10)
      if (!isNaN(numValue)) {
        setLocalValue(numValue)
      }
    }
  }

  const handleBlur = () => {
    // Handle empty input - revert silently
    if (localValue === 0 && currentValue !== 0) {
      setLocalValue(currentValue)
      return
    }

    // Round decimal values
    const roundedValue = Math.round(localValue)

    // Validate range (0-100)
    if (!validateValue(roundedValue)) {
      setHasError(true)
      toast.error(`Value must be between 0-100. Current value: ${roundedValue}`)

      // Auto-revert after 2 seconds
      revertTimerRef.current = setTimeout(() => {
        setLocalValue(currentValue)
        setHasError(false)
        revertTimerRef.current = null
      }, 2000)
      return
    }

    // Value is valid - save if different from current
    if (roundedValue !== currentValue) {
      onUpdate(roundedValue)
      toast.success(`${milestone.name} updated to ${roundedValue}%`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Save and move to next input
      e.preventDefault()
      e.stopPropagation() // Prevent event from bubbling to parent ComponentRow

      // Round decimal values
      const roundedValue = Math.round(localValue)

      // Validate range (0-100)
      if (!validateValue(roundedValue)) {
        setHasError(true)
        toast.error(`Value must be between 0-100. Current value: ${roundedValue}`)

        // Auto-revert after 2 seconds
        revertTimerRef.current = setTimeout(() => {
          setLocalValue(currentValue)
          setHasError(false)
          revertTimerRef.current = null
        }, 2000)
        return
      }

      if (roundedValue !== currentValue) {
        onUpdate(roundedValue)
        toast.success(`${milestone.name} updated to ${roundedValue}%`)
      }

      // Find next input and focus it
      const currentInput = inputRef.current
      if (currentInput) {
        const allInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>('input[role="spinbutton"]')
        )
        const currentIndex = allInputs.indexOf(currentInput)
        const nextInput = allInputs[currentIndex + 1]
        if (nextInput) {
          nextInput.focus()
        }
      }
    } else if (e.key === 'Escape') {
      // Cancel edit and revert to previous value
      e.preventDefault()
      e.stopPropagation() // Prevent event from bubbling to parent ComponentRow
      setLocalValue(currentValue)
      setHasError(false)
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current)
        revertTimerRef.current = null
      }
      inputRef.current?.blur()
    }
  }

  // Force abbreviations for aggregate threaded pipe
  const shouldAbbreviate = abbreviate || isAggregateThreadedPipe
  const finalLabel = shouldAbbreviate && LABEL_ABBREVIATIONS[milestone.name]
    ? LABEL_ABBREVIATIONS[milestone.name]
    : milestone.name

  const compact = variant === 'compact'

  return (
    <div className={compact ? "flex flex-col gap-0.5 items-start" : "flex flex-col items-center gap-0.5"}>
      {/* Milestone name label */}
      <label
        htmlFor={`milestone-${milestone.name}-${currentValue}`}
        className={`text-[10px] font-medium tracking-wide ${compact ? '' : 'uppercase text-muted-foreground'} ${isMobile ? 'text-xs' : ''}`}
      >
        {finalLabel}
      </label>

      {/* Input with % suffix */}
      <div className="flex items-center gap-1">
        <input
          id={`milestone-${milestone.name}-${currentValue}`}
          ref={inputRef}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          role="spinbutton"
          aria-label={`${milestone.name} milestone, currently ${currentValue} percent`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={currentValue}
          aria-invalid={hasError}
          className={`
            rounded-md border text-center text-xs transition-colors
            ${hasError
              ? 'border-red-500 ring-1 ring-red-500 animate-shake'
              : 'border-input'
            }
            focus:outline-none focus:ring-1
            disabled:cursor-not-allowed disabled:opacity-50
            ${isMobile ? 'w-12 h-12 text-base' : compact ? 'w-10 h-7' : 'w-10 h-7'}
          `}
        />
        <span className={`text-[10px] text-muted-foreground ${isMobile ? 'text-base' : ''}`}>
          %
        </span>
      </div>

      {/* Helper text: Linear feet for aggregate threaded pipe (Feature 027) */}
      {/* Only show in compact mode when value > 0 and totalLF > 0 */}
      {compact && linearFeet !== null && localValue > 0 && totalLF && totalLF > 0 && (
        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
          {linearFeet} / {totalLF} LF
        </span>
      )}
    </div>
  )
}
