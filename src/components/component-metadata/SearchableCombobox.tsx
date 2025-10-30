/**
 * SearchableCombobox Component
 *
 * Feature: 020-component-metadata-editing
 * Task: T007 - Implement SearchableCombobox component with virtualization
 * Date: 2025-10-29
 *
 * A searchable, virtualized combobox for displaying large lists of metadata options.
 * Supports filter-as-you-type search, keyboard navigation, and special options
 * like "(None)" and "Create new...".
 *
 * Uses:
 * - Command component from shadcn/ui for combobox UI
 * - @tanstack/react-virtual for virtualization (handles 1000+ options)
 * - Popover for dropdown positioning
 *
 * Key Features:
 * - Virtualized rendering (only visible items in DOM)
 * - Case-insensitive substring filtering
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Special options always visible (not filtered)
 * - Accessible with ARIA labels
 */

import * as React from 'react'
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import type { MetadataOption } from '@/types/metadata'

export interface SearchableComboboxProps {
  /** List of options to display (including special options like "(None)" and "Create new...") */
  options: MetadataOption[]
  /** Currently selected value (null if nothing selected) */
  value: string | null
  /** Callback fired when selection changes */
  onChange: (value: string | null) => void
  /** Callback fired when "Create new..." is selected. Receives name and returns created item */
  onCreateNew?: (name: string) => Promise<{ id: string; name: string }>
  /** Placeholder text shown when no value is selected */
  placeholder?: string
  /** Message shown when search filter returns no results */
  emptyMessage?: string
  /** Additional CSS classes for the combobox button */
  className?: string
  /** Label for the "Create new..." option (e.g., "Create new Area...") */
  createNewLabel?: string
  /** Disabled state */
  disabled?: boolean
  /** ARIA labelledby for accessibility */
  'aria-labelledby'?: string
}

/**
 * SearchableCombobox Component
 *
 * Renders a combobox with virtualized dropdown for large option lists.
 * Supports search filtering, keyboard navigation, and special options.
 *
 * @example
 * ```tsx
 * <SearchableCombobox
 *   options={areaOptions}
 *   value={formState.area_id}
 *   onChange={(value) => setFormState({ ...formState, area_id: value })}
 *   onCreateNew={() => setIsCreatingArea(true)}
 *   placeholder="Select area..."
 *   emptyMessage="No areas found"
 * />
 * ```
 */
export function SearchableCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Select...',
  emptyMessage = 'No results found.',
  className,
  disabled = false,
  'aria-labelledby': ariaLabelledBy
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [isCreating, setIsCreating] = React.useState(false)
  const [newItemName, setNewItemName] = React.useState('')
  const [creationError, setCreationError] = React.useState<string | null>(null)

  // Find the selected option to display its label
  // Exclude "(None)" from being displayed as selected (it means "no selection")
  const selectedOption = options.find(
    option => option.value === value && option.type !== 'none'
  )

  // Separate special options from regular options
  const noneOption = options.find(opt => opt.type === 'none')
  const createNewOption = options.find(opt => opt.type === 'create-new')
  const regularOptions = options.filter(opt => opt.type === 'existing')

  // Filter regular options based on search query (case-insensitive substring match)
  const filteredRegularOptions = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return regularOptions
    }

    const query = searchQuery.toLowerCase()
    return regularOptions.filter(option =>
      option.label.toLowerCase().includes(query)
    )
  }, [regularOptions, searchQuery])

  // Build final options list: [None, ...filtered regular, Create new...]
  const finalOptions = React.useMemo(() => {
    const result: MetadataOption[] = []

    if (noneOption) {
      result.push(noneOption)
    }

    result.push(...filteredRegularOptions)

    if (createNewOption && onCreateNew) {
      result.push(createNewOption)
    }

    return result
  }, [noneOption, filteredRegularOptions, createNewOption, onCreateNew])

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: finalOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Approximate height of each option in pixels
    overscan: 5, // Render 5 extra items above/below visible area
    // Enable smooth scrolling for better UX
    scrollMargin: 0,
    // Ensure items are measured properly
    measureElement:
      typeof window !== 'undefined' && window.navigator.userAgent.includes('jsdom')
        ? undefined
        : undefined
  })

  // Handle option selection
  const handleSelect = React.useCallback(
    (option: MetadataOption) => {
      // Handle "Create new..." option
      if (option.type === 'create-new') {
        setIsCreating(true)
        return
      }

      // Handle regular and "(None)" options
      onChange(option.value)
      setOpen(false)
    },
    [onChange]
  )

  // Handle creating new item
  const handleCreate = React.useCallback(async () => {
    if (!onCreateNew || !newItemName.trim()) return

    try {
      setCreationError(null)
      const newItem = await onCreateNew(newItemName.trim())

      // Success: select the new item and close creation mode
      onChange(newItem.id)
      setIsCreating(false)
      setNewItemName('')
      setOpen(false)
    } catch (error: any) {
      // Show error message
      setCreationError(error.message || 'Failed to create entry')
    }
  }, [onCreateNew, newItemName, onChange])

  // Handle canceling creation
  const handleCancelCreate = React.useCallback(() => {
    setIsCreating(false)
    setNewItemName('')
    setCreationError(null)
  }, [])

  // Reset search query and creation state when dropdown closes
  // Also trigger virtualizer remeasurement when dropdown opens
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedIndex(-1)
      setIsCreating(false)
      setNewItemName('')
      setCreationError(null)
    } else {
      // Force virtualizer to remeasure when dropdown opens
      // This ensures items are positioned correctly on first render
      virtualizer.measure()
    }
  }, [open, virtualizer])

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return

      // If in creation mode, handle Enter and Escape differently
      if (isCreating) {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleCreate()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          handleCancelCreate()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, finalOptions.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < finalOptions.length) {
            const selectedOption = finalOptions[selectedIndex]
            if (selectedOption) {
              handleSelect(selectedOption)
            }
          }
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          break
      }
    },
    [open, finalOptions, selectedIndex, handleSelect, isCreating, handleCreate, handleCancelCreate]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl bg-white"
        onKeyDown={handleKeyDown}
      >
        {isCreating ? (
          // Inline creation UI
          <div className="p-2 space-y-2 bg-background">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter name..."
              autoFocus
              className="w-full"
            />
            {creationError && (
              <p className="text-sm text-destructive">{creationError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newItemName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelCreate}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center border-b px-3 bg-background">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex h-11 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {finalOptions.length === 0 ? (
              <div className="py-6 text-center text-sm bg-background">{emptyMessage}</div>
            ) : (
              <>
                {/* Virtualized list container */}
                <div
                  ref={parentRef}
                  role="listbox"
                  className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1 bg-background"
                  style={{
                    minHeight: `${Math.min(virtualizer.getTotalSize(), 300)}px`
                  }}
                >
                  {/* Spacer to maintain scroll position */}
                  <div
                    className="bg-white"
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative'
                    }}
                  >
                    {virtualizer.getVirtualItems().map(virtualItem => {
                      const option = finalOptions[virtualItem.index]
                      if (!option) return null

                      const isSelected = option.value === value
                      const isHighlighted = virtualItem.index === selectedIndex
                      const isCreateNew = option.type === 'create-new'

                      return (
                        <div
                          key={`${option.type}-${option.value ?? 'null'}-${virtualItem.index}`}
                          role="option"
                          aria-selected={isSelected}
                          data-selected={isHighlighted}
                          onClick={() => handleSelect(option)}
                          onMouseEnter={() => setSelectedIndex(virtualItem.index)}
                          className={cn(
                            'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none bg-white',
                            isHighlighted
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent hover:text-accent-foreground',
                            'transition-colors'
                          )}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 'calc(100% - 8px)',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`
                          }}
                        >
                          {isCreateNew ? (
                            <Plus className="mr-2 h-4 w-4" />
                          ) : (
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          )}
                          {option.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
