/**
 * Custom hook for sidebar collapse state persistence
 * Feature: 008-we-just-planned
 * Stores sidebar state in localStorage for persistence across sessions
 */

import { useState } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

/**
 * Hook to manage sidebar collapsed state with localStorage persistence
 * @returns Tuple of [isCollapsed, setIsCollapsed]
 */
export function useSidebarState(): [boolean, (value: boolean) => void] {
  // Initialize state from localStorage (default to false/expanded)
  const [isCollapsed, setIsCollapsedInternal] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) return false;
      // Coerce to boolean: 'true' -> true, anything else truthy -> true, falsy -> false
      return stored === 'true';
    } catch (error) {
      // localStorage unavailable (e.g., private browsing)
      return false;
    }
  });

  // Wrapper function that persists to localStorage
  const setIsCollapsed = (value: boolean) => {
    setIsCollapsedInternal(value);

    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      // Silently handle localStorage failures (don't crash the app)
      console.warn('Failed to persist sidebar state:', error);
    }
  };

  return [isCollapsed, setIsCollapsed];
}
