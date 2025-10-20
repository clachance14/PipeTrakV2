/**
 * Import Progress Indicator
 * Shows upload progress during CSV import
 */

interface ImportProgressProps {
  isLoading: boolean;
}

export function ImportProgress({ isLoading }: ImportProgressProps) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" role="progressbar"></div>
        <p className="text-sm text-gray-600">Processing import...</p>
      </div>
    </div>
  );
}
