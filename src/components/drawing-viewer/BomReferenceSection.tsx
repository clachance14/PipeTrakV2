/**
 * BomReferenceSection Component
 * Collapsible read-only list of non-tracked BOM items (bolts, gaskets, shop items).
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DrawingBomItem } from '@/hooks/useDrawingBomItems';

interface BomReferenceSectionProps {
  items: DrawingBomItem[];
}

export function BomReferenceSection({ items }: BomReferenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const untrackedItems = items.filter((item) => !item.is_tracked);

  if (untrackedItems.length === 0) return null;

  return (
    <div className="border-t pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-600 hover:text-gray-900 py-1"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span>Reference Items</span>
        <span className="ml-auto text-xs text-gray-400">{untrackedItems.length}</span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
          {untrackedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-2 py-1.5 text-xs text-gray-500 bg-gray-50 rounded"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-700 truncate block">
                  {item.classification}
                </span>
                {item.description && (
                  <span className="text-gray-400 truncate block">{item.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {item.size && <span>{item.size}</span>}
                <span className="font-medium">x{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
