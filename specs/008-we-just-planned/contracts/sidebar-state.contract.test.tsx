/**
 * Contract Test: Sidebar State Persistence
 * Feature: 008-we-just-planned
 * Tests useSidebarStore (Zustand) with localStorage persistence
 * Updated to use Zustand instead of custom hook
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarStore } from '@/stores/useSidebarStore';

describe('useSidebarStore Contract', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Reset store state after each test
    useSidebarStore.setState({ isCollapsed: false });
  });

  it('should return store with isCollapsed, toggle, and setCollapsed', () => {
    const { result } = renderHook(() => useSidebarStore());

    // CONTRACT: Store must have required properties and methods
    expect(typeof result.current.isCollapsed).toBe('boolean');
    expect(typeof result.current.toggle).toBe('function');
    expect(typeof result.current.setCollapsed).toBe('function');
  });

  it('should default to false (expanded) when localStorage is empty', () => {
    const { result } = renderHook(() => useSidebarStore());

    // CONTRACT: Default state is false (expanded)
    expect(result.current.isCollapsed).toBe(false);
  });

  it('should read initial state from localStorage', async () => {
    // Pre-populate localStorage with Zustand persist format
    localStorage.setItem('pipetrak:sidebar-collapsed', JSON.stringify({
      state: { isCollapsed: true },
      version: 0
    }));

    // Force rehydration by creating a new store instance
    useSidebarStore.persist.rehydrate();

    // Wait a tick for rehydration
    await new Promise(resolve => setTimeout(resolve, 0));

    const { result } = renderHook(() => useSidebarStore());

    // CONTRACT: Store reads from localStorage on mount
    expect(result.current.isCollapsed).toBe(true);
  });

  it('should persist state changes to localStorage', () => {
    const { result } = renderHook(() => useSidebarStore());

    // Collapse sidebar
    act(() => {
      result.current.setCollapsed(true);
    });

    // CONTRACT: State change writes to localStorage
    const stored = JSON.parse(localStorage.getItem('pipetrak:sidebar-collapsed') || '{}');
    expect(stored.state.isCollapsed).toBe(true);
    expect(result.current.isCollapsed).toBe(true);

    // Expand sidebar
    act(() => {
      result.current.setCollapsed(false);
    });

    const storedAfter = JSON.parse(localStorage.getItem('pipetrak:sidebar-collapsed') || '{}');
    expect(storedAfter.state.isCollapsed).toBe(false);
    expect(result.current.isCollapsed).toBe(false);
  });

  it('should toggle state correctly', () => {
    const { result } = renderHook(() => useSidebarStore());

    // Initial state is false (expanded)
    expect(result.current.isCollapsed).toBe(false);

    // Toggle to collapsed
    act(() => {
      result.current.toggle();
    });

    expect(result.current.isCollapsed).toBe(true);

    // Toggle back to expanded
    act(() => {
      result.current.toggle();
    });

    expect(result.current.isCollapsed).toBe(false);
  });

  it('should handle localStorage unavailable gracefully', () => {
    // Simulate localStorage failure
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('localStorage unavailable');
    };

    const { result } = renderHook(() => useSidebarStore());

    // CONTRACT: Store doesn't crash if localStorage fails
    expect(() => {
      act(() => {
        result.current.setCollapsed(true);
      });
    }).not.toThrow();

    // State should still update in memory
    expect(result.current.isCollapsed).toBe(true);

    // Restore
    localStorage.setItem = originalSetItem;
  });

  it('should handle invalid localStorage values gracefully', () => {
    // Set invalid JSON
    localStorage.setItem('pipetrak:sidebar-collapsed', 'invalid-json');

    const { result } = renderHook(() => useSidebarStore());

    // CONTRACT: Invalid localStorage values fall back to default
    expect(typeof result.current.isCollapsed).toBe('boolean');
    expect(result.current.isCollapsed).toBe(false);
  });
});
