import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type StatusFilter = 'all' | 'not-started' | 'in-progress' | 'complete'

export interface StatusFilterDropdownProps {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}

/**
 * Status filter dropdown
 *
 * Allows filtering drawings by progress status.
 * Options: All, Not Started (0%), In Progress (>0% <100%), Complete (100%).
 * Width: 200px.
 */
export function StatusFilterDropdown({
  value,
  onChange,
}: StatusFilterDropdownProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as StatusFilter)}>
      <SelectTrigger className="w-full md:w-[200px] min-h-[44px]" aria-label="Filter by status">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Drawings</SelectItem>
        <SelectItem value="not-started">Not Started (0%)</SelectItem>
        <SelectItem value="in-progress">In Progress (&gt;0%)</SelectItem>
        <SelectItem value="complete">Complete (100%)</SelectItem>
      </SelectContent>
    </Select>
  )
}
