// src/hooks/useExpandedRows.ts
import { useState } from 'react';

export function useExpandedRows() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (userId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const isExpanded = (userId: string) => expandedRows.has(userId);

  return { expandedRows, toggleRow, isExpanded };
}
