/**
 * WeldLogFilters Component (Feature 014 - T069)
 * Filter controls for Weld Log page with URL state management
 */

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  // Get filter values from URL
  const drawingFilter = searchParams.get('drawing') || 'all'
  const welderFilter = searchParams.get('welder') || 'all'
  const statusFilter = searchParams.get('status') || 'all'
  const packageFilter = searchParams.get('package') || 'all'
  const systemFilter = searchParams.get('system') || 'all'

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    setSearchParams(params, { replace: true })
  }, [debouncedSearch])

  // Apply filters with AND logic
  const filteredWelds = useMemo(() => {
    let filtered = welds

    // Search filter (weld ID, drawing number, welder name/stencil)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
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
  }, [welds, debouncedSearch, drawingFilter, welderFilter, statusFilter, packageFilter, systemFilter])

  // Notify parent of filtered results
  useEffect(() => {
    onFilteredWeldsChange(filteredWelds)
  }, [filteredWelds, onFilteredWeldsChange])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    setSearchParams(params, { replace: true })
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setDebouncedSearch('')
    setSearchParams({}, { replace: true })
  }

  const hasActiveFilters =
    debouncedSearch ||
    drawingFilter !== 'all' ||
    welderFilter !== 'all' ||
    statusFilter !== 'all' ||
    packageFilter !== 'all' ||
    systemFilter !== 'all'

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by weld ID, drawing, or welder..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Drawing Filter */}
        <Select value={drawingFilter} onValueChange={(value) => updateFilter('drawing', value)}>
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
        <Select value={welderFilter} onValueChange={(value) => updateFilter('welder', value)}>
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
        <Select value={statusFilter} onValueChange={(value) => updateFilter('status', value)}>
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
        <Select value={packageFilter} onValueChange={(value) => updateFilter('package', value)}>
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
        <Select value={systemFilter} onValueChange={(value) => updateFilter('system', value)}>
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
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8">
            <X className="mr-1 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
