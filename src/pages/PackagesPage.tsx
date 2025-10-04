import { Layout } from '@/components/Layout'

export function PackagesPage() {
  const packages = [
    { id: '1', name: 'TP-001', progress: 85, components: 124, blockers: 2 },
    { id: '2', name: 'TP-002', progress: 67, components: 98, blockers: 5 },
    { id: '3', name: 'TP-003', progress: 92, components: 156, blockers: 0 },
  ]

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Test Package Readiness</h1>
          <p className="text-gray-600 mt-1">Track package completion and turnover readiness</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                {pkg.blockers > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                    {pkg.blockers} blockers
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-2xl font-bold text-gray-900">{pkg.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${pkg.progress >= 80 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pkg.progress}%` }}
                  />
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {pkg.components} components
              </div>

              <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
