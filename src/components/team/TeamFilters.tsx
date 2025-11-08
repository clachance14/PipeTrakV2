// src/components/team/TeamFilters.tsx
import { TeamSearch } from './TeamSearch';
import { TeamSortDropdown } from './TeamSortDropdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Role } from '@/types/team.types';

type SortOption = 'name' | 'role' | 'join_date' | 'last_active';

interface TeamFiltersProps {
  searchTerm: string;
  roleFilter: Role | 'all';
  statusFilter: 'all' | 'active' | 'pending';
  sortBy: SortOption;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: Role | 'all') => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'pending') => void;
  onSortChange: (value: SortOption) => void;
}

const roleLabels: Record<Role | 'all', string> = {
  all: 'All Roles',
  owner: 'Owner',
  admin: 'Admin',
  project_manager: 'Project Manager',
  foreman: 'Foreman',
  qc_inspector: 'QC Inspector',
  welder: 'Welder',
  viewer: 'Viewer',
};

export function TeamFilters({
  searchTerm,
  roleFilter,
  statusFilter,
  sortBy,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onSortChange,
}: TeamFiltersProps) {
  return (
    <div
      className="flex flex-col lg:flex-row gap-4 mb-6"
      data-testid="team-filters"
      role="search"
      aria-label="Team member filters"
    >
      {/* Search Input - Full width on mobile */}
      <div className="w-full lg:flex-1">
        <TeamSearch value={searchTerm} onChange={onSearchChange} />
      </div>

      {/* Role Filter - Full width on mobile */}
      <div className="w-full lg:w-[200px]">
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-full" data-testid="role-filter" aria-label="Filter by role">
            <SelectValue placeholder="Filter by role..." />
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{roleLabels.all}</SelectItem>
          <SelectItem value="owner">{roleLabels.owner}</SelectItem>
          <SelectItem value="admin">{roleLabels.admin}</SelectItem>
          <SelectItem value="project_manager">{roleLabels.project_manager}</SelectItem>
          <SelectItem value="foreman">{roleLabels.foreman}</SelectItem>
          <SelectItem value="qc_inspector">{roleLabels.qc_inspector}</SelectItem>
          <SelectItem value="welder">{roleLabels.welder}</SelectItem>
          <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
        </SelectContent>
        </Select>
      </div>

      {/* Status Filter - Full width on mobile */}
      <div className="w-full lg:w-[180px]">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full" data-testid="status-filter" aria-label="Filter by status">
            <SelectValue placeholder="Filter by status..." />
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
        </Select>
      </div>

      {/* Sort Dropdown - Full width on mobile */}
      <div className="w-full lg:w-[200px]">
        <TeamSortDropdown value={sortBy} onChange={onSortChange} />
      </div>
    </div>
  );
}
