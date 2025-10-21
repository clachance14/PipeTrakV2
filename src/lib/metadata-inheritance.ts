/**
 * Metadata Inheritance Utility
 * Feature: 011-the-drawing-component
 *
 * Determines whether a component's metadata value is inherited from its drawing
 * or manually assigned. Uses client-side comparison logic (research.md decision #4).
 *
 * Badge Types:
 * - 'inherited': Component value matches drawing value (gray badge, tooltip "From drawing P-001")
 * - 'assigned': Component has manually assigned value (blue badge, tooltip "Manually assigned")
 * - 'none': Component has no value (no badge, display "—")
 */

import type { BadgeType, InheritanceIndicator } from '@/types/drawing-table.types';

/**
 * Determines the badge type by comparing component and drawing values
 *
 * Logic:
 * 1. If component value is NULL → 'none' (no badge)
 * 2. If drawing value is NULL but component has value → 'assigned' (manually assigned)
 * 3. If both have values and they match → 'inherited' (inherited from drawing)
 * 4. If both have values but differ → 'assigned' (manually assigned)
 *
 * Edge Case: If user manually assigns component to same value as drawing,
 * this will show 'inherited' (acceptable false positive per research.md).
 *
 * @param componentValue - Component's metadata value (area_id, system_id, or test_package_id)
 * @param drawingValue - Drawing's metadata value
 * @returns Badge type: 'inherited', 'assigned', or 'none'
 *
 * @example
 * // Component has no value
 * getBadgeType(null, 'area-100-uuid') // → 'none'
 *
 * // Component inherited from drawing
 * getBadgeType('area-100-uuid', 'area-100-uuid') // → 'inherited'
 *
 * // Component manually assigned (different from drawing)
 * getBadgeType('area-200-uuid', 'area-100-uuid') // → 'assigned'
 *
 * // Component manually assigned (drawing has no value)
 * getBadgeType('area-100-uuid', null) // → 'assigned'
 */
export function getBadgeType(
  componentValue: string | null,
  drawingValue: string | null
): BadgeType {
  // No value on component = no badge
  if (!componentValue) {
    return 'none';
  }

  // Component has value, drawing doesn't = manually assigned
  if (!drawingValue) {
    return 'assigned';
  }

  // Both have values and they match = inherited
  if (componentValue === drawingValue) {
    return 'inherited';
  }

  // Values differ = manually assigned
  return 'assigned';
}

/**
 * Generates tooltip text based on badge type
 *
 * @param badgeType - The badge type from getBadgeType
 * @param drawingNumber - Drawing number for inherited values (e.g., "P-001")
 * @returns Tooltip text string
 *
 * @example
 * getTooltipText('inherited', 'P-001') // → "From drawing P-001"
 * getTooltipText('assigned') // → "Manually assigned"
 * getTooltipText('none') // → ""
 */
export function getTooltipText(badgeType: BadgeType, drawingNumber?: string): string {
  switch (badgeType) {
    case 'inherited':
      return drawingNumber ? `From drawing ${drawingNumber}` : 'Inherited from drawing';
    case 'assigned':
      return 'Manually assigned';
    case 'none':
      return '';
  }
}

/**
 * Checks if a component's metadata field is inherited from its drawing
 *
 * Convenience function that returns boolean instead of badge type.
 *
 * @param componentValue - Component's metadata value
 * @param drawingValue - Drawing's metadata value
 * @returns True if inherited, false otherwise
 *
 * @example
 * isInherited('area-100-uuid', 'area-100-uuid') // → true
 * isInherited('area-200-uuid', 'area-100-uuid') // → false
 * isInherited(null, 'area-100-uuid') // → false
 */
export function isInherited(
  componentValue: string | null,
  drawingValue: string | null
): boolean {
  return getBadgeType(componentValue, drawingValue) === 'inherited';
}

/**
 * Creates full inheritance indicator with badge type and tooltip source
 *
 * @param componentValue - Component's metadata value
 * @param drawingValue - Drawing's metadata value
 * @param drawingNumber - Drawing number for tooltip (e.g., "P-001")
 * @returns InheritanceIndicator object with type and optional source
 *
 * @example
 * const indicator = getInheritanceIndicator('area-100-uuid', 'area-100-uuid', 'P-001');
 * // → { type: 'inherited', source: 'P-001' }
 *
 * const indicator2 = getInheritanceIndicator('area-200-uuid', 'area-100-uuid', 'P-001');
 * // → { type: 'assigned' }
 */
export function getInheritanceIndicator(
  componentValue: string | null,
  drawingValue: string | null,
  drawingNumber: string
): InheritanceIndicator {
  const type = getBadgeType(componentValue, drawingValue);

  if (type === 'inherited') {
    return { type, source: drawingNumber };
  }

  return { type };
}
