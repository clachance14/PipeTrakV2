import { useState } from 'react'
import { useWelders } from '@/hooks/useWelders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WelderForm } from './WelderForm'
import { Search, UserPlus } from 'lucide-react'

interface WelderListProps {
  projectId: string
}

export function WelderList({ projectId }: WelderListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [sortColumn, setSortColumn] = useState<'stencil' | 'name'>('stencil')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const { data: welders, isLoading, error } = useWelders({ projectId })

  const handleSort = (column: 'stencil' | 'name') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filteredWelders = welders?.filter((welder) => {
    const search = searchTerm.toLowerCase()
    return (
      welder.stencil.toLowerCase().includes(search) ||
      welder.name.toLowerCase().includes(search)
    )
  })

  const sortedWelders = filteredWelders?.sort((a, b) => {
    const aValue = a[sortColumn].toLowerCase()
    const bValue = b[sortColumn].toLowerCase()
    const comparison = aValue.localeCompare(bValue)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Error loading welders: {error.message}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by stencil or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Welder
        </Button>
      </div>

      {/* Welders table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('stencil')}
              >
                <div className="flex items-center gap-2">
                  Stencil
                  {sortColumn === 'stencil' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Name
                  {sortColumn === 'name' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-sm text-slate-500">
                  Loading welders...
                </td>
              </tr>
            ) : sortedWelders && sortedWelders.length > 0 ? (
              sortedWelders.map((welder) => (
                <tr
                  key={welder.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    // TODO: Open edit dialog when implemented
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {welder.stencil}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {welder.name}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-sm text-slate-500">
                  {searchTerm ? 'No welders found matching your search' : 'No welders yet. Add one to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Welder Form Dialog */}
      <WelderForm
        projectId={projectId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  )
}
