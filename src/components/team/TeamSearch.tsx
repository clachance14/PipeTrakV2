// src/components/team/TeamSearch.tsx
import { Input } from '@/components/ui/input';

interface TeamSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TeamSearch({
  value,
  onChange,
  placeholder = 'Search by name or email...',
}: TeamSearchProps) {
  return (
    <Input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0"
      data-testid="team-search"
    />
  );
}
