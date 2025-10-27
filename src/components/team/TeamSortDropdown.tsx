// src/components/team/TeamSortDropdown.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortOption = 'name' | 'role' | 'join_date' | 'last_active';

interface TeamSortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortLabels: Record<SortOption, string> = {
  name: 'Name',
  role: 'Role',
  join_date: 'Join Date',
  last_active: 'Last Active',
};

export function TeamSortDropdown({ value, onChange }: TeamSortDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" data-testid="sort-dropdown" aria-label="Sort team members">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">{sortLabels.name}</SelectItem>
        <SelectItem value="role">{sortLabels.role}</SelectItem>
        <SelectItem value="join_date">{sortLabels.join_date}</SelectItem>
        <SelectItem value="last_active">{sortLabels.last_active}</SelectItem>
      </SelectContent>
    </Select>
  );
}
