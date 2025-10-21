/**
 * Unit tests for metadata-inheritance.ts
 * Feature: 011-the-drawing-component
 * Coverage target: ≥80% (utility library)
 */

import { describe, it, expect } from 'vitest';
import {
  getBadgeType,
  getTooltipText,
  isInherited,
  getInheritanceIndicator,
} from './metadata-inheritance';
import type { BadgeType } from '@/types/drawing-table.types';

describe('metadata-inheritance', () => {
  describe('getBadgeType', () => {
    it('returns "none" when component value is null', () => {
      const result = getBadgeType(null, 'area-100-uuid');
      expect(result).toBe('none');
    });

    it('returns "none" when both values are null', () => {
      const result = getBadgeType(null, null);
      expect(result).toBe('none');
    });

    it('returns "assigned" when component has value but drawing is null', () => {
      const result = getBadgeType('area-100-uuid', null);
      expect(result).toBe('assigned');
    });

    it('returns "inherited" when both values match', () => {
      const result = getBadgeType('area-100-uuid', 'area-100-uuid');
      expect(result).toBe('inherited');
    });

    it('returns "assigned" when values differ', () => {
      const result = getBadgeType('area-200-uuid', 'area-100-uuid');
      expect(result).toBe('assigned');
    });

    it('handles empty strings as falsy values', () => {
      // Empty string should be treated as null
      const result = getBadgeType('', 'area-100-uuid');
      expect(result).toBe('none');
    });

    it('handles edge case: component manually assigned to same value as drawing', () => {
      // Per research.md, this is an acceptable false positive
      const result = getBadgeType('area-100-uuid', 'area-100-uuid');
      expect(result).toBe('inherited');
    });
  });

  describe('getTooltipText', () => {
    it('returns "From drawing X" for inherited with drawing number', () => {
      const result = getTooltipText('inherited', 'P-001');
      expect(result).toBe('From drawing P-001');
    });

    it('returns "Inherited from drawing" for inherited without drawing number', () => {
      const result = getTooltipText('inherited');
      expect(result).toBe('Inherited from drawing');
    });

    it('returns "Manually assigned" for assigned', () => {
      const result = getTooltipText('assigned');
      expect(result).toBe('Manually assigned');
    });

    it('returns empty string for none', () => {
      const result = getTooltipText('none');
      expect(result).toBe('');
    });

    it('handles drawing number with special characters', () => {
      const result = getTooltipText('inherited', 'P-001-REV-A');
      expect(result).toBe('From drawing P-001-REV-A');
    });

    it('returns defined text for all badge types', () => {
      const badgeTypes: BadgeType[] = ['inherited', 'assigned', 'none'];
      badgeTypes.forEach((type) => {
        const result = getTooltipText(type, 'P-001');
        expect(result).toBeDefined();
        // 'none' returns empty string, others return non-empty strings
        if (type === 'none') {
          expect(result).toBe('');
        } else {
          expect(result).toBeTruthy();
        }
      });
    });
  });

  describe('isInherited', () => {
    it('returns true when values match (inherited)', () => {
      const result = isInherited('area-100-uuid', 'area-100-uuid');
      expect(result).toBe(true);
    });

    it('returns false when component value is null', () => {
      const result = isInherited(null, 'area-100-uuid');
      expect(result).toBe(false);
    });

    it('returns false when drawing value is null but component has value', () => {
      const result = isInherited('area-100-uuid', null);
      expect(result).toBe(false);
    });

    it('returns false when values differ', () => {
      const result = isInherited('area-200-uuid', 'area-100-uuid');
      expect(result).toBe(false);
    });

    it('returns false when both values are null', () => {
      const result = isInherited(null, null);
      expect(result).toBe(false);
    });

    it('is consistent with getBadgeType', () => {
      const componentValue = 'area-100-uuid';
      const drawingValue = 'area-100-uuid';

      const badgeType = getBadgeType(componentValue, drawingValue);
      const inherited = isInherited(componentValue, drawingValue);

      expect(inherited).toBe(badgeType === 'inherited');
    });
  });

  describe('getInheritanceIndicator', () => {
    it('returns indicator with source for inherited values', () => {
      const result = getInheritanceIndicator(
        'area-100-uuid',
        'area-100-uuid',
        'P-001'
      );

      expect(result).toEqual({
        type: 'inherited',
        source: 'P-001',
      });
    });

    it('returns indicator without source for assigned values', () => {
      const result = getInheritanceIndicator(
        'area-200-uuid',
        'area-100-uuid',
        'P-001'
      );

      expect(result).toEqual({
        type: 'assigned',
      });
    });

    it('returns indicator without source for none values', () => {
      const result = getInheritanceIndicator(null, 'area-100-uuid', 'P-001');

      expect(result).toEqual({
        type: 'none',
      });
    });

    it('handles drawing number with spaces', () => {
      const result = getInheritanceIndicator(
        'area-100-uuid',
        'area-100-uuid',
        'P 001 REV A'
      );

      expect(result).toEqual({
        type: 'inherited',
        source: 'P 001 REV A',
      });
    });

    it('type property matches getBadgeType result', () => {
      const componentValue = 'area-100-uuid';
      const drawingValue = 'area-200-uuid';
      const drawingNumber = 'P-001';

      const badgeType = getBadgeType(componentValue, drawingValue);
      const indicator = getInheritanceIndicator(
        componentValue,
        drawingValue,
        drawingNumber
      );

      expect(indicator.type).toBe(badgeType);
    });
  });

  describe('Integration scenarios from contract', () => {
    it('Scenario 1: Component has no value (shows "—")', () => {
      const badgeType = getBadgeType(null, 'area-100-uuid');
      const tooltip = getTooltipText(badgeType, 'P-001');

      expect(badgeType).toBe('none');
      expect(tooltip).toBe('');
    });

    it('Scenario 2: Component inherited from drawing (gray badge)', () => {
      const badgeType = getBadgeType('area-100-uuid', 'area-100-uuid');
      const tooltip = getTooltipText(badgeType, 'P-001');
      const inherited = isInherited('area-100-uuid', 'area-100-uuid');

      expect(badgeType).toBe('inherited');
      expect(tooltip).toBe('From drawing P-001');
      expect(inherited).toBe(true);
    });

    it('Scenario 3: Component manually assigned (blue badge)', () => {
      const badgeType = getBadgeType('area-200-uuid', 'area-100-uuid');
      const tooltip = getTooltipText(badgeType, 'P-001');
      const inherited = isInherited('area-200-uuid', 'area-100-uuid');

      expect(badgeType).toBe('assigned');
      expect(tooltip).toBe('Manually assigned');
      expect(inherited).toBe(false);
    });

    it('Scenario 4: Drawing has no value, component manually assigned', () => {
      const badgeType = getBadgeType('area-100-uuid', null);
      const tooltip = getTooltipText(badgeType);
      const inherited = isInherited('area-100-uuid', null);

      expect(badgeType).toBe('assigned');
      expect(tooltip).toBe('Manually assigned');
      expect(inherited).toBe(false);
    });

    it('Scenario 5: Full indicator for inherited value', () => {
      const indicator = getInheritanceIndicator(
        'system-hvac-uuid',
        'system-hvac-uuid',
        'P-002'
      );

      expect(indicator.type).toBe('inherited');
      expect(indicator.source).toBe('P-002');

      const tooltip = getTooltipText(indicator.type, indicator.source);
      expect(tooltip).toBe('From drawing P-002');
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('handles UUID format values correctly', () => {
      const uuid1 = '00000000-0000-0000-0000-000000000001';
      const uuid2 = '00000000-0000-0000-0000-000000000002';

      expect(getBadgeType(uuid1, uuid1)).toBe('inherited');
      expect(getBadgeType(uuid1, uuid2)).toBe('assigned');
    });

    it('handles very long drawing numbers', () => {
      const longDrawingNumber = 'P-001-REVISION-A-SHEET-1-OF-50-MECHANICAL';
      const result = getTooltipText('inherited', longDrawingNumber);

      expect(result).toBe(`From drawing ${longDrawingNumber}`);
    });

    it('handles drawing numbers with special characters', () => {
      const specialDrawingNumber = 'P-001_REV-A (VOID)';
      const indicator = getInheritanceIndicator(
        'area-uuid',
        'area-uuid',
        specialDrawingNumber
      );

      expect(indicator.source).toBe(specialDrawingNumber);
    });

    it('all functions handle null inputs gracefully', () => {
      expect(() => getBadgeType(null, null)).not.toThrow();
      expect(() => isInherited(null, null)).not.toThrow();
      expect(() => getInheritanceIndicator(null, null, 'P-001')).not.toThrow();
    });

    it('empty string component value treated as null', () => {
      const badgeType = getBadgeType('', 'area-uuid');
      expect(badgeType).toBe('none');
    });

    it('empty string drawing value treated as null', () => {
      const badgeType = getBadgeType('area-uuid', '');
      expect(badgeType).toBe('assigned');
    });
  });

  describe('Type consistency', () => {
    it('getBadgeType always returns valid BadgeType', () => {
      const validTypes: BadgeType[] = ['inherited', 'assigned', 'none'];
      const testCases: Array<[string | null, string | null]> = [
        [null, null],
        ['value', null],
        [null, 'value'],
        ['value1', 'value1'],
        ['value1', 'value2'],
      ];

      testCases.forEach(([componentValue, drawingValue]) => {
        const result = getBadgeType(componentValue, drawingValue);
        expect(validTypes).toContain(result);
      });
    });

    it('getInheritanceIndicator type property always matches getBadgeType', () => {
      const testCases: Array<[string | null, string | null, string]> = [
        [null, null, 'P-001'],
        ['value', null, 'P-002'],
        [null, 'value', 'P-003'],
        ['value1', 'value1', 'P-004'],
        ['value1', 'value2', 'P-005'],
      ];

      testCases.forEach(([componentValue, drawingValue, drawingNumber]) => {
        const badgeType = getBadgeType(componentValue, drawingValue);
        const indicator = getInheritanceIndicator(
          componentValue,
          drawingValue,
          drawingNumber
        );

        expect(indicator.type).toBe(badgeType);
      });
    });
  });
});
