/**
 * ComponentList component (Feature 007)
 * Virtualized list of components using @tanstack/react-virtual
 * Handles 10k+ components efficiently
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ComponentRow } from './ComponentRow';
import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];

interface ComponentListProps {
  components: (Component & {
    drawing?: { drawing_no_norm: string } | null;
    area?: { name: string } | null;
    system?: { name: string } | null;
    test_package?: { name: string } | null;
  })[];
  onComponentClick?: (component: Component) => void;
  isLoading?: boolean;
}

/**
 * ComponentList component
 * Uses react-virtual for efficient rendering of large lists
 * Only renders visible rows (performance optimization for 10k+ components)
 */
export function ComponentList({
  components,
  onComponentClick,
  isLoading,
}: ComponentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: components.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // 60px row height estimate
    overscan: 10, // Render 10 extra rows for smooth scrolling
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] border rounded-lg">
        <div className="text-muted-foreground">Loading components...</div>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] border rounded-lg">
        <div className="text-muted-foreground mb-2">No components found</div>
        <div className="text-sm text-muted-foreground">
          Try adjusting your filters or import components
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted border-b font-medium text-sm">
        <div className="flex-1">Component</div>
        <div className="flex-1 hidden md:block">Drawing</div>
        <div className="flex-1 hidden lg:block">Area</div>
        <div className="flex-1 hidden lg:block">System</div>
        <div className="flex-1 hidden xl:block">Test Package</div>
        <div className="w-20 text-right">Progress</div>
      </div>

      {/* Virtualized List */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const component = components[virtualRow.index];
            if (!component) return null;

            return (
              <ComponentRow
                key={component.id}
                component={component}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onComponentClick?.(component)}
              />
            );
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 bg-muted border-t text-sm text-muted-foreground">
        Showing {components.length} component{components.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
