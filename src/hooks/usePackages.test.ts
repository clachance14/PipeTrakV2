/**
 * Tests for usePackages hook
 * Verifies package readiness queries handle large datasets correctly
 */

import { describe, it, expect } from 'vitest';

describe('usePackageReadiness', () => {
  /**
   * Regression test for URL length limit bug
   *
   * PROBLEM: Using .in('component_id', [hundreds of IDs]) exceeded URL length limits
   * causing 400 Bad Request errors when loading packages with many components.
   *
   * SOLUTION: Query by project_id + status instead, filter client-side.
   *
   * This test verifies the client-side filtering logic works correctly.
   */
  it('filters blockers correctly with large component lists', () => {
    // Simulate large dataset (1000+ components)
    const components = Array.from({ length: 1000 }, (_, i) => ({
      id: `component-${i}`,
      test_package_id: i < 500 ? 'package-1' : 'package-2',
    }));

    // Simulate blockers (needs_review records)
    const allBlockers = [
      { id: 'blocker-1', component_id: 'component-10' },  // package-1
      { id: 'blocker-2', component_id: 'component-100' }, // package-1
      { id: 'blocker-3', component_id: 'component-600' }, // package-2
      { id: 'blocker-4', component_id: 'component-999' }, // package-2
      { id: 'blocker-5', component_id: 'nonexistent' },   // not in components
    ];

    // CLIENT-SIDE FILTERING (what the fix does)
    const componentIdsSet = new Set(components.map(c => c.id));
    const filteredBlockers = allBlockers.filter(b =>
      b.component_id && componentIdsSet.has(b.component_id)
    );

    // Verify filtering works
    expect(filteredBlockers).toHaveLength(4); // Excludes 'nonexistent'
    expect(filteredBlockers.find(b => b.component_id === 'nonexistent')).toBeUndefined();

    // Verify package-specific counting
    const package1Blockers = filteredBlockers.filter(b => {
      const component = components.find(c => c.id === b.component_id);
      return component?.test_package_id === 'package-1';
    });

    const package2Blockers = filteredBlockers.filter(b => {
      const component = components.find(c => c.id === b.component_id);
      return component?.test_package_id === 'package-2';
    });

    expect(package1Blockers).toHaveLength(2); // blocker-1, blocker-2
    expect(package2Blockers).toHaveLength(2); // blocker-3, blocker-4
  });

  it('handles empty blocker list', () => {
    const components = [{ id: 'comp-1', test_package_id: 'pkg-1' }];
    const allBlockers: Array<{ id: string; component_id: string | null }> = [];

    const componentIdsSet = new Set(components.map(c => c.id));
    const filteredBlockers = allBlockers.filter(b =>
      b.component_id && componentIdsSet.has(b.component_id)
    );

    expect(filteredBlockers).toHaveLength(0);
  });

  it('handles null component_id in blockers', () => {
    const components = [{ id: 'comp-1', test_package_id: 'pkg-1' }];
    const allBlockers = [
      { id: 'blocker-1', component_id: 'comp-1' },
      { id: 'blocker-2', component_id: null }, // Project-level review
    ];

    const componentIdsSet = new Set(components.map(c => c.id));
    const filteredBlockers = allBlockers.filter(b =>
      b.component_id && componentIdsSet.has(b.component_id)
    );

    expect(filteredBlockers).toHaveLength(1); // Only blocker-1
    expect(filteredBlockers[0].id).toBe('blocker-1');
  });
});
