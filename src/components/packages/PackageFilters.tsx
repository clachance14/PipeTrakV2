import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PackageFilters as PackageFiltersType } from '@/hooks/usePackageReadiness';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export interface PackageFiltersProps {
  onFilterChange: (filters: PackageFiltersType) => void;
}

/**
 * Package filters component with status, search, and sort
 * Debounces search input for better performance
 */
export function PackageFilters({ onFilterChange }: PackageFiltersProps) {
  const [status, setStatus] = useState<PackageFiltersType['status']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<PackageFiltersType['sortBy']>('name');

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Emit filter changes whenever any filter updates
  const handleStatusChange = (newStatus: PackageFiltersType['status']) => {
    setStatus(newStatus);
    onFilterChange({ status: newStatus, search: debouncedSearch, sortBy });
  };

  const handleSortChange = (newSortBy: PackageFiltersType['sortBy']) => {
    setSortBy(newSortBy);
    onFilterChange({ status, search: debouncedSearch, sortBy: newSortBy });
  };

  // Update filters when debounced search changes
  useEffect(() => {
    onFilterChange({ status, search: debouncedSearch, sortBy });
  }, [debouncedSearch, status, sortBy, onFilterChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Status filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={status === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('all')}
        >
          All
        </Button>
        <Button
          variant={status === 'ready' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('ready')}
        >
          Ready
        </Button>
        <Button
          variant={status === 'in_progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('in_progress')}
        >
          In Progress
        </Button>
        <Button
          variant={status === 'blocked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('blocked')}
        >
          Blocked
        </Button>
      </div>

      <div className="flex-1 flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort dropdown */}
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="target_date">Target Date</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
