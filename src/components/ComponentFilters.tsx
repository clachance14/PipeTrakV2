/**
 * ComponentFilters component (Feature 007)
 * Filtering UI for component list with debounced search
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAreas } from '@/hooks/useAreas';
import { useSystems } from '@/hooks/useSystems';
import { useTestPackages } from '@/hooks/useTestPackages';
import type { ComponentType } from '@/hooks/useComponents';

interface ComponentFiltersProps {
  projectId: string;
  onFilterChange: (filters: ComponentFiltersState) => void;
}

export interface ComponentFiltersState {
  area_id?: string;
  system_id?: string;
  component_type?: ComponentType;
  test_package_id?: string;
  progress_min?: number;
  progress_max?: number;
  search?: string;
}

const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: 'spool', label: 'Spool' },
  { value: 'field_weld', label: 'Field Weld' },
  { value: 'support', label: 'Support' },
  { value: 'valve', label: 'Valve' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'flange', label: 'Flange' },
  { value: 'instrument', label: 'Instrument' },
  { value: 'tubing', label: 'Tubing' },
  { value: 'hose', label: 'Hose' },
  { value: 'threaded_pipe', label: 'Threaded Pipe' },
  { value: 'misc_component', label: 'Misc Component' },
];

export function ComponentFilters({ projectId, onFilterChange }: ComponentFiltersProps) {
  const [filters, setFilters] = useState<ComponentFiltersState>({});

  // Debounce search input by 300ms
  const debouncedSearch = useDebouncedValue(filters.search || '', 300);

  // Query areas, systems, test packages for filter dropdowns
  const { data: areas = [] } = useAreas(projectId);
  const { data: systems = [] } = useSystems(projectId);
  const { data: testPackages = [] } = useTestPackages(projectId);

  // Update parent component with debounced filters
  const updateFilters = (newFilters: Partial<ComponentFiltersState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    // Apply debounced search, immediate for other filters
    onFilterChange({
      ...updatedFilters,
      search: debouncedSearch,
    });
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).some((key) => filters[key as keyof ComponentFiltersState]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search by identity key */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Identity</Label>
          <Input
            id="search"
            placeholder="e.g., SP-001"
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />
        </div>

        {/* Filter by area */}
        <div className="space-y-2">
          <Label>Area</Label>
          <Select
            value={filters.area_id || 'all'}
            onValueChange={(value) =>
              updateFilters({ area_id: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter by system */}
        <div className="space-y-2">
          <Label>System</Label>
          <Select
            value={filters.system_id || 'all'}
            onValueChange={(value) =>
              updateFilters({ system_id: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              {systems.map((system) => (
                <SelectItem key={system.id} value={system.id}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter by component type */}
        <div className="space-y-2">
          <Label>Component Type</Label>
          <Select
            value={filters.component_type || 'all'}
            onValueChange={(value) =>
              updateFilters({
                component_type: value === 'all' ? undefined : (value as ComponentType),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {COMPONENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter by test package */}
        <div className="space-y-2">
          <Label>Test Package</Label>
          <Select
            value={filters.test_package_id || 'all'}
            onValueChange={(value) =>
              updateFilters({ test_package_id: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Packages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Packages</SelectItem>
              {testPackages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter by progress % range */}
        <div className="space-y-2">
          <Label>Progress Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min %"
              min={0}
              max={100}
              value={filters.progress_min ?? ''}
              onChange={(e) =>
                updateFilters({
                  progress_min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <Input
              type="number"
              placeholder="Max %"
              min={0}
              max={100}
              value={filters.progress_max ?? ''}
              onChange={(e) =>
                updateFilters({
                  progress_max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
