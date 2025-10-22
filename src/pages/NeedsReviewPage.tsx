import { Layout } from '@/components/Layout';
import { useState, useMemo } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useNeedsReview } from '@/hooks/useNeedsReview';
import { ReviewItemCard, ReviewItem } from '@/components/needs-review/ReviewItemCard';
import { ReviewFilters, ReviewFiltersState } from '@/components/needs-review/ReviewFilters';
import { ResolveReviewModal } from '@/components/needs-review/ResolveReviewModal';
import { EmptyState } from '@/components/EmptyState';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NeedsReviewPage() {
  const { selectedProjectId } = useProject();
  const [filters, setFilters] = useState<ReviewFiltersState>({ status: 'pending' });
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Filter out 'all' type before passing to hook
  const hookFilters = {
    ...filters,
    type: filters.type === 'all' ? undefined : filters.type,
  };

  const { data: reviewItems, isLoading, isError, error, refetch } = useNeedsReview(
    selectedProjectId || '',
    hookFilters
  );

  // Transform data to ReviewItem format
  const transformedItems = useMemo<ReviewItem[]>(() => {
    if (!reviewItems) return [];

    return reviewItems.map(item => {
      const ageInDays = Math.floor(
        (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      let ageColorClass = 'text-gray-600';
      if (ageInDays >= 3) {
        ageColorClass = 'text-red-600';
      } else if (ageInDays >= 1) {
        ageColorClass = 'text-amber-600';
      }

      const payload = (item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload))
        ? item.payload as Record<string, any>
        : {};
      return {
        id: item.id,
        type: item.type as ReviewItem['type'],
        description: payload.description || 'No description',
        ageInDays,
        ageColorClass,
        payload,
        createdAt: item.created_at
      };
    });
  }, [reviewItems]);

  const handleResolve = (id: string) => {
    const item = transformedItems.find(i => i.id === id);
    if (item) {
      setSelectedItem(item);
      setIsResolveModalOpen(true);
    }
  };

  const handleSubmitResolve = async (status: 'resolved' | 'ignored', note?: string) => {
    // TODO: Implement resolve mutation when useNeedsReview provides it
    console.log('Resolving item:', selectedItem?.id, status, note);
    setIsResolveModalOpen(false);
    setSelectedItem(null);
    refetch();
  };

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={AlertCircle}
            title="No Project Selected"
            description="Please select a project from the dropdown to view needs review items."
          />
        </div>
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Needs Review</h1>
            <p className="text-gray-600 mt-1">Resolve flagged items and conflicts</p>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load review items</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty state (no pending items)
  if (transformedItems.length === 0 && filters.status === 'pending') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Needs Review</h1>
            <p className="text-gray-600 mt-1">Resolve flagged items and conflicts</p>
          </div>
          <EmptyState
            icon={CheckCircle}
            title="No items need review"
            description="All flagged items have been resolved. Great work!"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Needs Review</h1>
          <p className="text-gray-600 mt-1">Resolve flagged items and conflicts</p>
        </div>

        <ReviewFilters onFilterChange={setFilters} />

        {transformedItems.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No items found"
            description="No review items match the selected filters."
          />
        ) : (
          <div className="space-y-4">
            {transformedItems.map((item) => (
              <ReviewItemCard
                key={item.id}
                item={item}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}

        <ResolveReviewModal
          item={selectedItem}
          isOpen={isResolveModalOpen}
          onClose={() => {
            setIsResolveModalOpen(false);
            setSelectedItem(null);
          }}
          onSubmit={handleSubmitResolve}
        />
      </div>
    </Layout>
  );
}
