/**
 * Tests for formatComponentIdentity utility
 * Feature 030: Package Completion Report - Component identity formatting
 */

import { describe, it, expect } from 'vitest';
import {
  formatSizeWithInches,
  aggregateComponentsForDisplay,
  type AggregatedComponent,
} from './formatComponentIdentity';

describe('formatSizeWithInches', () => {
  it('adds inch notation to integer sizes', () => {
    expect(formatSizeWithInches('2')).toBe('2"');
    expect(formatSizeWithInches('4')).toBe('4"');
    expect(formatSizeWithInches('12')).toBe('12"');
  });

  it('adds inch notation to fractional sizes', () => {
    expect(formatSizeWithInches('3/4')).toBe('3/4"');
    expect(formatSizeWithInches('1/2')).toBe('1/2"');
    expect(formatSizeWithInches('1-1/2')).toBe('1-1/2"');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatSizeWithInches(null)).toBe('');
    expect(formatSizeWithInches(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatSizeWithInches('')).toBe('');
  });

  it('does not double-add inch notation if already present', () => {
    expect(formatSizeWithInches('2"')).toBe('2"');
    expect(formatSizeWithInches('3/4"')).toBe('3/4"');
  });
});

describe('aggregateComponentsForDisplay', () => {
  it('returns single component without quantity display', () => {
    const components = [
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02', size: '2', seq: 1 },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      component_type: 'instrument',
      identity_display: 'CV-26C02 | 2"',
      quantity: 1,
    });
  });

  it('aggregates identical components and shows quantity', () => {
    const components = [
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02', size: '2', seq: 1 },
      },
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02', size: '2', seq: 2 },
      },
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02', size: '2', seq: 3 },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      component_type: 'instrument',
      identity_display: 'CV-26C02 | 2"',
      quantity: 3,
    });
  });

  it('keeps different sizes as separate rows', () => {
    const components = [
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02', size: '2', seq: 1 },
      },
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02', size: '3', seq: 1 },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.identity_display)).toContain('CV-26C02 | 2"');
    expect(result.map((r) => r.identity_display)).toContain('CV-26C02 | 3"');
  });

  it('keeps different component types as separate rows', () => {
    const components = [
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02', size: '2', seq: 1 },
      },
      {
        component_type: 'valve',
        identity_key: { commodity_code: 'CV-26C02', size: '2', seq: 1 },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.component_type === 'instrument')).toBeDefined();
    expect(result.find((r) => r.component_type === 'valve')).toBeDefined();
  });

  it('handles missing size gracefully', () => {
    const components = [
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-26C02' },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(1);
    expect(result[0].identity_display).toBe('CV-26C02');
  });

  it('handles fractional sizes', () => {
    const components = [
      {
        component_type: 'fitting',
        identity_key: { commodity_code: 'EL-90', size: '3/4', seq: 1 },
      },
      {
        component_type: 'fitting',
        identity_key: { commodity_code: 'EL-90', size: '3/4', seq: 2 },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      component_type: 'fitting',
      identity_display: 'EL-90 | 3/4"',
      quantity: 2,
    });
  });

  it('handles tag_no for valves', () => {
    const components = [
      {
        component_type: 'valve',
        identity_key: { tag_no: 'XV-100', size: '4', seq: 1 },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(1);
    expect(result[0].identity_display).toBe('XV-100 | 4"');
  });

  it('handles weld_number for field_weld', () => {
    const components = [
      {
        component_type: 'field_weld',
        identity_key: { weld_number: 'W-001' },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(1);
    expect(result[0].identity_display).toBe('W-001');
  });

  it('handles empty components array', () => {
    const result = aggregateComponentsForDisplay([]);
    expect(result).toHaveLength(0);
  });

  it('handles string identity_key (already formatted)', () => {
    const components = [
      {
        component_type: 'instrument',
        identity_key: 'CV-26C02 | 2 | #1',
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(1);
    // Should pass through string identity as-is (legacy format)
    expect(result[0].identity_display).toBe('CV-26C02 | 2 | #1');
  });

  it('sorts results by component type then identity', () => {
    const components = [
      {
        component_type: 'valve',
        identity_key: { tag_no: 'XV-200', size: '2', seq: 1 },
      },
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-100', size: '2', seq: 1 },
      },
      {
        component_type: 'instrument',
        identity_key: { commodity_code: 'CV-050', size: '2', seq: 1 },
      },
    ];

    const result = aggregateComponentsForDisplay(components);

    expect(result).toHaveLength(3);
    // Instruments first (alphabetically), then valve
    expect(result[0].component_type).toBe('instrument');
    expect(result[0].identity_display).toBe('CV-050 | 2"');
    expect(result[1].component_type).toBe('instrument');
    expect(result[1].identity_display).toBe('CV-100 | 2"');
    expect(result[2].component_type).toBe('valve');
  });
});
