/**
 * Contract Test: Sidebar State Persistence
 * Feature: 008-we-just-planned
 * Tests useSidebarState hook with localStorage
 * This test MUST FAIL initially (TDD Red phase)
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarState } from '@/hooks/useSidebarState';

describe('useSidebarState Contract', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should return tuple [isCollapsed, setIsCollapsed]', () => {
    const { result } = renderHook(() => useSidebarState());

    // CONTRACT: Hook must return [boolean, function]
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current).toHaveLength(2);
    expect(typeof result.current[0]).toBe('boolean');
    expect(typeof result.current[1]).toBe('function');
  });

  it('should default to false (expanded) when localStorage is empty', () => {
    const { result } = renderHook(() => useSidebarState());

    // CONTRACT: Default state is false (expanded)
    expect(result.current[0]).toBe(false);
  });

  it('should read initial state from localStorage', () => {
    // Pre-populate localStorage
    localStorage.setItem('sidebar-collapsed', 'true');

    const { result } = renderHook(() => useSidebarState());

    // CONTRACT: Hook reads from localStorage on mount
    expect(result.current[0]).toBe(true);
  });

  it('should persist state changes to localStorage', () => {
    const { result } = renderHook(() => useSidebarState());

    // Toggle state
    act(() => {
      result.current[1](true); // Collapse
    });

    // CONTRACT: State change writes to localStorage
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
    expect(result.current[0]).toBe(true);

    // Toggle back
    act(() => {
      result.current[1](false); // Expand
    });

    expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
    expect(result.current[0]).toBe(false);
  });

  it('should handle localStorage unavailable gracefully', () => {
    // Simulate localStorage failure
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('localStorage unavailable');
    };

    const { result } = renderHook(() => useSidebarState());

    // CONTRACT: Hook doesn't crash if localStorage fails
    expect(() => {
      act(() => {
        result.current[1](true);
      });
    }).not.toThrow();

    // Restore
    localStorage.setItem = originalSetItem;
  });

  it('should coerce invalid localStorage values to boolean', () => {
    // Set invalid value
    localStorage.setItem('sidebar-collapsed', 'invalid');

    const { result } = renderHook(() => useSidebarState());

    // CONTRACT: Invalid values are coerced (anything truthy → true)
    expect(typeof result.current[0]).toBe('boolean');
  });
});
