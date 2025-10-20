import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface DrawingSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * Search input for filtering drawings by number
 *
 * Shows Search icon on left, clear button on right when value is non-empty.
 * Width: 300px desktop, full width mobile.
 * Supports Ctrl+F keyboard shortcut to focus.
 */
export function DrawingSearchInput({
  value,
  onChange,
  placeholder = 'Search drawings...',
}: DrawingSearchInputProps) {
  return (
    <div className="relative w-full md:w-[300px]" role="search">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
        aria-label="Search drawings"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
