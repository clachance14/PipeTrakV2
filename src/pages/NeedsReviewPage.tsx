import { Layout } from '@/components/Layout'

export function NeedsReviewPage() {
  const reviews = [
    {
      id: '1',
      type: 'OUT_OF_SEQUENCE',
      description: 'Test marked before Install on SP-1234',
      age: '2 hours',
      ageClass: 'text-gray-600',
    },
    {
      id: '2',
      type: 'ROLLBACK',
      description: 'Weld Made uncompleted on W-001',
      age: '1 day',
      ageClass: 'text-amber-600',
    },
    {
      id: '3',
      type: 'DELTA_QUANTITY',
      description: '+3 supports on Drawing P-002',
      age: '3 days',
      ageClass: 'text-red-600',
    },
    {
      id: '4',
      type: 'VERIFY_WELDER',
      description: 'Unverified welder JD-123 used 6 times',
      age: '12 hours',
      ageClass: 'text-gray-600',
    },
  ]

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Needs Review</h1>
          <p className="text-gray-600 mt-1">Resolve flagged items and conflicts</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {review.type}
                      </span>
                      <span className={`text-sm ${review.ageClass}`}>{review.age} ago</span>
                    </div>
                    <p className="text-gray-900">{review.description}</p>
                  </div>
                  <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
