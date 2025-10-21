/**
 * Debug component to test MetadataDescriptionEditor
 * Add this to any page temporarily to test the description editing feature
 */

import { useState } from 'react';
import { MetadataDescriptionEditor } from './MetadataDescriptionEditor';
import { useAreas } from '@/hooks/useAreas';
import { Button } from './ui/button';

export function DebugMetadataDescriptions({ projectId }: { projectId: string }) {
  const [showEditor, setShowEditor] = useState(false);
  const { data: areas = [], isLoading } = useAreas(projectId);

  if (isLoading) return <div>Loading areas...</div>;

  return (
    <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
      <h3 className="font-bold text-lg mb-4">🔧 Debug: Metadata Descriptions</h3>

      <div className="space-y-2">
        <p><strong>Areas found:</strong> {areas.length}</p>

        {areas.length === 0 ? (
          <div className="text-red-600">
            ⚠️ No areas found! Create some in Supabase Studio first.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-green-600">✅ {areas.length} areas available</p>

            <Button onClick={() => setShowEditor(!showEditor)}>
              {showEditor ? 'Hide' : 'Show'} Test Editor
            </Button>

            {showEditor && areas[0] && (
              <div className="mt-4 p-4 bg-white border rounded">
                <p className="mb-2">
                  <strong>Testing with Area:</strong> {areas[0].name}
                </p>
                <p className="mb-2">
                  <strong>Current Description:</strong> {areas[0].description || '(none)'}
                </p>

                <div className="flex items-center gap-2">
                  <span>Click pencil to edit →</span>
                  <MetadataDescriptionEditor
                    entityType="area"
                    entityId={areas[0].id}
                    entityName={areas[0].name}
                    currentDescription={areas[0].description}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">View All Areas</summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
          {JSON.stringify(areas, null, 2)}
        </pre>
      </details>
    </div>
  );
}
