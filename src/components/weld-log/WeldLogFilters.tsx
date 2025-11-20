/**
 * WeldLogFilters Component (Feature 014 - T069)
 * Filter controls for Weld Log page with persistent store state management
 * Enhancement: Collapsible mobile filters (2025-11-02)
 * Enhancement: Persistent filters via Zustand store (2025-11-20)
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

const STORAGE_KEY = 'pipetrak-weld-log-filters-expanded'

interface WeldLogFiltersProps {
  welds: EnrichedFieldWeld[]
  drawings: { id: string; drawing_no_norm: string }[]
  welders: { id: string; stencil: string; name: string }[]
  testPackages: { id: string; name: string }[]
  systems: { id: string; name: string }[]
  onFilteredWeldsChange: (filteredWelds: EnrichedFieldWeld[]) => void
}

export function WeldLogFilters({
  welds,
  drawings,
  welders,
  testPackages,
  systems,
  onFilteredWeldsChange,
}: WeldLogFiltersProps) {
  const isMobile = useMobileDetection()
  const {
    drawingFilter,
    welderFilter,
    statusFilter,
    packageFilter,
    systemFilter,
    searchTerm,
    setDrawingFilter,
    setWelderFilter,
    setStatusFilter,
    setPackageFilter,
    setSystemFilter,
    setSearchTerm,
    clearAllFilters,
  } = useWeldLogPreferencesStore()
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  // Collapse state with localStorage persistence (mobile only)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (!isMobile) return true // Always expanded on desktop
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored !== null ? JSON.parse(stored) : false // Default to collapsed
    } catch {
      return false
    }
  })

  // Sync state changes to localStorage
  useEffect(() => {
    if (!isMobile) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded))
    } catch {
      console.warn('Failed to persist weld log filter collapse state to localStorage')
    }
  }, [isExpanded, isMobile])

  // Toggle handler
  const handleToggle = () => {
    setIsExpanded(prev => !prev)
  }

  // URL param migration (one-time on mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const drawing = params.get('drawing')
    const welder = params.get('welder')
    const status = params.get('status')
    const pkg = params.get('package')
    const system = params.get('system')
    const search = params.get('search')

    // Apply URL params if they exist (overrides localStorage)
    if (drawing) setDrawingFilter(drawing)
    if (welder) setWelderFilter(welder)
    if (status) setStatusFilter(status)
    if (pkg) setPackageFilter(pkg)
    if (system) setSystemFilter(system)
    if (search) {
      setLocalSearchTerm(search)
      setSearchTerm(search)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount for URL param migration

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchTerm, setSearchTerm])

  // Apply filters with AND logic
  const filteredWelds = useMemo(() => {
    let filtered = welds

    // Search filter (weld ID, drawing number, welder name/stencil)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (weld) =>
          weld.identityDisplay.toLowerCase().includes(searchLower) ||
          weld.drawing.drawing_no_norm.toLowerCase().includes(searchLower) ||
          weld.welder?.stencil.toLowerCase().includes(searchLower) ||
          weld.welder?.name.toLowerCase().includes(searchLower)
      )
    }

    // Drawing filter
    if (drawingFilter !== 'all') {
      filtered = filtered.filter((weld) => weld.drawing.id === drawingFilter)
    }

    // Welder filter
    if (welderFilter !== 'all') {
      filtered = filtered.filter((weld) => weld.welder?.id === welderFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((weld) => weld.status === statusFilter)
    }

    // Package filter
    if (packageFilter !== 'all') {
      filtered = filtered.filter((weld) => weld.test_package?.id === packageFilter)
    }

    // System filter
    if (systemFilter !== 'all') {
      filtered = filtered.filter((weld) => weld.system?.id === systemFilter)
    }

    return filtered
  }, [welds, searchTerm, drawingFilter, welderFilter, statusFilter, packageFilter, systemFilter])

  // Notify parent of filtered results
  useEffect(() => {
    onFilteredWeldsChange(filteredWelds)
  }, [filteredWelds, onFilteredWeldsChange])

  const handleClearAllFilters = () => {
    setLocalSearchTerm('')
    clearAllFilters()
  }

  const hasActiveFilters =
    searchTerm ||
    drawingFilter !== 'all' ||
    welderFilter !== 'all' ||
    statusFilter !== 'all' ||
    packageFilter !== 'all' ||
    systemFilter !== 'all'

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
          aria-controls="weld-log-filters-content"
          aria-label={isExpanded ? "Hide filter controls" : "Show filter controls"}
          id="weld-log-filters-toggle"
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
            {filteredWelds.length}/{welds.length}
          </span>
        </Button>

        {/* Collapsible Container */}
        <div
          className="collapsible-grid"
          data-expanded={isExpanded}
          id="weld-log-filters-content"
        >
          <div className="collapsible-content">
            <div className="space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by weld ID, drawing, or welder..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter Controls - Vertical stack on mobile */}
              <div className="space-y-2">
                {/* Drawing Filter */}
                <Select value={drawingFilter} onValueChange={setDrawingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Drawings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drawings</SelectItem>
                    {drawings.map((drawing) => (
                      <SelectItem key={drawing.id} value={drawing.id}>
                        {drawing.drawing_no_norm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Welder Filter */}
                <Select value={welderFilter} onValueChange={setWelderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Welders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Welders</SelectItem>
                    {welders.map((welder) => (
                      <SelectItem key={welder.id} value={welder.id}>
                        {welder.stencil} - {welder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                {/* Package Filter */}
                <Select value={packageFilter} onValueChange={setPackageFilter}>
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

                {/* System Filter */}
                <Select value={systemFilter} onValueChange={setSystemFilter}>
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

              {/* Clear Button (if active filters) */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearAllFilters} className="w-full">
                  <X className="mr-1 h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop view (unchanged)
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by weld ID, drawing, or welder..."
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Drawing Filter */}
        <Select value={drawingFilter} onValueChange={setDrawingFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Drawings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drawings</SelectItem>
            {drawings.map((drawing) => (
              <SelectItem key={drawing.id} value={drawing.id}>
                {drawing.drawing_no_norm}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Welder Filter */}
        <Select value={welderFilter} onValueChange={setWelderFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Welders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Welders</SelectItem>
            {welders.map((welder) => (
              <SelectItem key={welder.id} value={welder.id}>
                {welder.stencil} - {welder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Package Filter */}
        <Select value={packageFilter} onValueChange={setPackageFilter}>
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

        {/* System Filter */}
        <Select value={systemFilter} onValueChange={setSystemFilter}>
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

      {/* Results Count and Clear Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-medium">{filteredWelds.length}</span> of{' '}
          <span className="font-medium">{welds.length}</span> welds
        </p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAllFilters} className="h-8">
            <X className="mr-1 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
