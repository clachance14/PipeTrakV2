import { Layout } from '@/components/Layout'
import { useState } from 'react'

interface Drawing {
  id: string
  number: string
  title: string
  progress: number
  componentCount: number
  components: Component[]
}

interface Component {
  id: string
  type: 'spool' | 'weld' | 'valve' | 'support'
  componentId: string
  commodity: string
  area: string
  system: string
  testPackage: string
  milestones: {
    receive?: boolean
    erect?: boolean
    connect?: boolean
    punch?: boolean
    test?: boolean
    restore?: boolean
  }
  progress: number
  lastUpdatedBy: string
  lastUpdatedAt: string
}

// Mock data
const mockDrawings: Drawing[] = [
  {
    id: '1',
    number: 'P-001',
    title: 'Main Process Line',
    progress: 65,
    componentCount: 12,
    components: [
      {
        id: 'c1',
        type: 'spool',
        componentId: 'SP-1234',
        commodity: 'CS 4" SCH40',
        area: 'AREA-01',
        system: 'COOL-100',
        testPackage: 'TP-001',
        milestones: { receive: true, erect: true, connect: false, punch: false, test: false, restore: false },
        progress: 45,
        lastUpdatedBy: 'John Smith',
        lastUpdatedAt: '2 hours ago',
      },
      {
        id: 'c2',
        type: 'weld',
        componentId: 'W-001',
        commodity: 'CS 6" SCH80',
        area: 'AREA-01',
        system: 'COOL-100',
        testPackage: 'TP-001',
        milestones: { receive: true, erect: true, connect: true, punch: false, test: false, restore: false },
        progress: 70,
        lastUpdatedBy: 'Sarah Johnson',
        lastUpdatedAt: '1 hour ago',
      },
      {
        id: 'c3',
        type: 'valve',
        componentId: 'seq #3 of 5',
        commodity: 'GATE VALVE 4"',
        area: 'AREA-02',
        system: 'COOL-100',
        testPackage: 'TP-002',
        milestones: { receive: true, erect: false, connect: false, punch: false, test: false, restore: false },
        progress: 10,
        lastUpdatedBy: 'Mike Davis',
        lastUpdatedAt: '3 hours ago',
      },
    ],
  },
  {
    id: '2',
    number: 'P-002',
    title: 'Secondary Loop',
    progress: 42,
    componentCount: 8,
    components: [],
  },
  {
    id: '3',
    number: 'P-003',
    title: 'Cooling System',
    progress: 88,
    componentCount: 15,
    components: [],
  },
]

const typeIcons = {
  spool: '🔧',
  weld: '⚡',
  valve: '🔄',
  support: '⚙️',
}

export function ComponentsPage() {
  const [expandedDrawings, setExpandedDrawings] = useState<Set<string>>(new Set(['1']))
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set())

  const toggleDrawing = (drawingId: string) => {
    setExpandedDrawings((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(drawingId)) {
        newSet.delete(drawingId)
      } else {
        newSet.add(drawingId)
      }
      return newSet
    })
  }

  const toggleComponent = (componentId: string) => {
    setSelectedComponents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(componentId)) {
        newSet.delete(componentId)
      } else {
        newSet.add(componentId)
      }
      return newSet
    })
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <div className="w-80 bg-gray-100 border-r border-gray-200 p-4 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Group By:</label>
            <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option>Drawing</option>
              <option>Area</option>
              <option>System</option>
              <option>Test Package</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter:</label>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200">
                All
              </button>
              <button className="px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                Not Started
              </button>
              <button className="px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                In Progress
              </button>
              <button className="px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                Completed
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="show-retired" className="rounded" />
            <label htmlFor="show-retired" className="text-sm text-gray-600">
              Show retired
            </label>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-600">
              Total: {mockDrawings.reduce((acc, d) => acc + d.componentCount, 0)} components
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-8 px-3 py-3"></th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity/Size</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">System</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Milestones</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockDrawings.map((drawing) => (
                  <>
                    {/* Drawing Row */}
                    <tr
                      key={drawing.id}
                      className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      onClick={() => toggleDrawing(drawing.id)}
                    >
                      <td className="px-3 py-4">
                        <button className="text-gray-500">
                          {expandedDrawings.has(drawing.id) ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="px-3 py-4 font-semibold" colSpan={2}>
                        {drawing.number}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600" colSpan={4}>
                        {drawing.title}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${drawing.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{drawing.progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600" colSpan={2}>
                        {drawing.componentCount} components
                      </td>
                    </tr>

                    {/* Component Rows */}
                    {expandedDrawings.has(drawing.id) &&
                      drawing.components.map((component) => (
                        <tr key={component.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedComponents.has(component.id)}
                              onChange={() => toggleComponent(component.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-3 pl-8">
                            <span className="text-lg" title={component.type}>
                              {typeIcons[component.type]}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{component.componentId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{component.commodity}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {component.area}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {component.system}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{component.testPackage}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              {Object.entries(component.milestones).map(([milestone, completed]) => (
                                <button
                                  key={milestone}
                                  className={`w-8 h-8 rounded text-xs font-semibold ${
                                    completed
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  }`}
                                  title={milestone.charAt(0).toUpperCase() + milestone.slice(1)}
                                >
                                  {milestone.charAt(0).toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{component.progress}%</td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                            <div>{component.lastUpdatedBy}</div>
                            <div className="text-xs text-gray-500">{component.lastUpdatedAt}</div>
                          </td>
                        </tr>
                      ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bulk Action Bar */}
          {selectedComponents.size > 0 && (
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {selectedComponents.size} component{selectedComponents.size > 1 ? 's' : ''} selected
                </span>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Apply Milestone
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
