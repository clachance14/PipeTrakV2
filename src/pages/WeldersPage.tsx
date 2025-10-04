import { Layout } from '@/components/Layout'

export function WeldersPage() {
  const welders = [
    { id: '1', name: 'John Doe', stencil: 'JD-123', status: 'verified', weldCount: 45 },
    { id: '2', name: 'Jane Smith', stencil: 'JS-456', status: 'verified', weldCount: 32 },
    { id: '3', name: 'Mike Johnson', stencil: 'MJ-789', status: 'unverified', weldCount: 6 },
    { id: '4', name: 'Sarah Williams', stencil: 'SW-012', status: 'unverified', weldCount: 3 },
  ]

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welder Directory</h1>
            <p className="text-gray-600 mt-1">Manage welders and verification status</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Add Welder
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stencil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weld Count</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {welders.map((welder) => (
                <tr key={welder.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{welder.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{welder.stencil}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        welder.status === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {welder.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{welder.weldCount}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    {welder.status === 'unverified' && (
                      <button className="text-blue-600 hover:text-blue-900">Verify</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
