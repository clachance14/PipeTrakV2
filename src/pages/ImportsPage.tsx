import { Layout } from '@/components/Layout'

export function ImportsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          <p className="text-gray-600 mt-1">Upload Excel/CSV files to import components</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="max-w-2xl mx-auto">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold text-blue-600 hover:text-blue-700">Click to upload</span> or drag and
                drop
              </p>
              <p className="mt-1 text-xs text-gray-500">Excel (.xlsx) or CSV files up to 10MB</p>
            </div>

            {/* Template Downloads */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Download Templates</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">Spools Import Template</span>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">Field Welds Import Template</span>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">Valves/Fittings Import Template</span>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Recent Imports */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Imports</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900">spools_batch_1.xlsx</p>
                    <p className="text-xs text-gray-500">234 components imported • 2 hours ago</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Success
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900">welds_update.csv</p>
                    <p className="text-xs text-gray-500">89 components imported • 1 day ago</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Success
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
