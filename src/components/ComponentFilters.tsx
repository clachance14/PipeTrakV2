/**
 * ComponentFilters component (Feature 007)
 * Filtering UI for component list with debounced search
 * Enhancement: Collapsible mobile filters (2025-11-17)
 */

import { useState, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { QuickFilterChips } from '@/components/QuickFilterChips';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAreas } from '@/hooks/useAreas';
import { useSystems } from '@/hooks/useSystems';
import { useTestPackages } from '@/hooks/useTestPackages';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import type { ComponentType } from '@/hooks/useComponents';

const STORAGE_KEY = 'pipetrak-component-filters-expanded';

interface ComponentFiltersProps {
  projectId: string;
  onFilterChange: (filters: ComponentFiltersState) => void;
  filteredCount: number;
  totalCount: number;
  searchTerm?: string; // External search management (search moved to page toolbar)
}

export interface ComponentFiltersState {
  area_id?: string;
  system_id?: string;
  component_type?: ComponentType;
  test_package_id?: string;
  progress_min?: number;
  progress_max?: number;
  search?: string;
  post_hydro_only?: boolean; // Filter to show only post-hydro components
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
  { value: 'pipe', label: 'Pipe' },
  { value: 'threaded_pipe', label: 'Threaded Pipe' },
  { value: 'misc_component', label: 'Misc Component' },
];

export function ComponentFilters({ projectId, onFilterChange, filteredCount, totalCount, searchTerm }: ComponentFiltersProps) {
  const isMobile = useMobileDetection();
  const [filters, setFilters] = useState<ComponentFiltersState>({});

  // Collapse state with localStorage persistence (mobile only)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (!isMobile) return true; // Always expanded on desktop
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? JSON.parse(stored) : false; // Default to collapsed
    } catch {
      return false;
    }
  });

  // Sync state changes to localStorage
  useEffect(() => {
    if (!isMobile) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded));
    } catch {
      console.warn('Failed to persist component filter collapse state to localStorage');
    }
  }, [isExpanded, isMobile]);

  // Toggle handler
  const handleToggle = () => {
    setIsExpanded(prev => !prev);
  };

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

  // Exclude search from hasActiveFilters when externally managed
  const hasActiveFilters = Object.keys(filters).some((key) => {
    if (key === 'search' && searchTerm !== undefined) return false;
    return filters[key as keyof ComponentFiltersState];
  });

  // Mobile collapsible view
  if (isMobile) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
        {/* Toggle Button with Count */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="flex items-center justify-between min-h-[44px] w-full px-3 py-2"
          aria-expanded={isExpanded}
          aria-controls="component-filters-content"
          aria-label={isExpanded ? "Hide filter controls" : "Show filter controls"}
          id="component-filters-toggle"
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              className="h-4 w-4 chevron-rotate"
              data-expanded={isExpanded}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">
              {isExpanded ? 'Hide Filters' : 'Show Filters'}
            </span>
          </div>
          <span className="text-xs text-slate-600 font-normal">
            {filteredCount}/{totalCount}
          </span>
        </Button>

        {/* Collapsible Container */}
        <div
          className="collapsible-grid"
          data-expanded={isExpanded}
          id="component-filters-content"
        >
          <div className="collapsible-content">
            <div className="space-y-3">
              {/* Search Box */}
              <Input
                type="text"
                placeholder="Search by identity..."
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />

              {/* Filter Controls - Vertical stack on mobile */}
              <div className="space-y-2">
                {/* Component Type Filter */}
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

                {/* Area Filter */}
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

                {/* System Filter */}
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

                {/* Test Package Filter */}
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

                {/* Post-Hydro Filter */}
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="filter-post-hydro-mobile"
                    checked={filters.post_hydro_only || false}
                    onCheckedChange={(checked) =>
                      updateFilters({ post_hydro_only: checked === true ? true : undefined })
                    }
                  />
                  <label
                    htmlFor="filter-post-hydro-mobile"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Post-hydro only
                  </label>
                </div>
              </div>

              {/* Quick Filter Chips */}
              <QuickFilterChips
                activeFilters={filters}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                  onFilterChange({
                    ...newFilters,
                    search: debouncedSearch,
                  });
                }}
                onClearAll={clearFilters}
              />

              {/* Clear Button (if active filters) */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop view - ultra-condensed single row toolbar
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Component Type Filter */}
      <Select
        value={filters.component_type || 'all'}
        onValueChange={(value) =>
          updateFilters({
            component_type: value === 'all' ? undefined : (value as ComponentType),
          })
        }
      >
        <SelectTrigger className="w-[120px] h-8 text-sm">
          <SelectValue placeholder="Type" />
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

      {/* Area Filter */}
      <Select
        value={filters.area_id || 'all'}
        onValueChange={(value) =>
          updateFilters({ area_id: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[120px] h-8 text-sm">
          <SelectValue placeholder="Area" />
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

      {/* System Filter */}
      <Select
        value={filters.system_id || 'all'}
        onValueChange={(value) =>
          updateFilters({ system_id: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[120px] h-8 text-sm">
          <SelectValue placeholder="System" />
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

      {/* Test Package Filter */}
      <Select
        value={filters.test_package_id || 'all'}
        onValueChange={(value) =>
          updateFilters({ test_package_id: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[120px] h-8 text-sm">
          <SelectValue placeholder="Package" />
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

      {/* Post-Hydro Filter */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="filter-post-hydro-desktop"
          checked={filters.post_hydro_only || false}
          onCheckedChange={(checked) =>
            updateFilters({ post_hydro_only: checked === true ? true : undefined })
          }
          className="h-4 w-4"
        />
        <label
          htmlFor="filter-post-hydro-desktop"
          className="text-sm text-gray-600 whitespace-nowrap"
        >
          Post-hydro only
        </label>
      </div>

      {/* Quick Filter Chips - inline */}
      <QuickFilterChips
        activeFilters={filters}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          onFilterChange({
            ...newFilters,
            search: searchTerm ?? debouncedSearch,
          });
        }}
        onClearAll={clearFilters}
      />

      {/* Clear button - only show when filters active */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
