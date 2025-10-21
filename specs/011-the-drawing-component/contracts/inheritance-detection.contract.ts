/**
 * Contract: Inheritance Detection Logic
 *
 * Defines utility functions for determining whether a component's metadata value
 * is inherited from its parent drawing or manually assigned.
 *
 * Functional Requirements Covered:
 * - FR-026 to FR-030: Visual distinction of inherited vs assigned values
 * - Badge rendering (gray "inherited" vs blue "assigned")
 * - Tooltip text generation
 */

/**
 * Badge type enum
 * Indicates the source of a component's metadata value
 */
export type BadgeType = 'inherited' | 'assigned' | 'none';

/**
 * Inheritance indicator with optional source information
 */
export interface InheritanceIndicator {
  /** Type of badge to display */
  type: BadgeType;

  /** Drawing number (for inherited values) or undefined */
  source?: string;
}

/**
 * Contract interface for inheritance detection
 */
export interface InheritanceDetectionContract {
  /**
   * Determine if a component value is inherited from its drawing
   *
   * @param componentValue - Component's area_id/system_id/test_package_id
   * @param drawingValue - Drawing's area_id/system_id/test_package_id
   * @param field - Which metadata field is being checked
   * @returns true if value is inherited (equal and drawing has value)
   *
   * Logic (from research.md decision #4):
   * - If componentValue is null → false (no value to inherit)
   * - If drawingValue is null → false (nothing to inherit from)
   * - If componentValue === drawingValue → true (inherited)
   * - If values differ → false (manually assigned)
   *
   * Edge case: Component manually assigned to same value as drawing
   * - Returns true (acceptable false positive per research.md)
   * - User sees "inherited" badge but can still edit
   */
  isInherited(
    componentValue: string | null,
    drawingValue: string | null,
    field: 'area_id' | 'system_id' | 'test_package_id'
  ): boolean;

  /**
   * Get badge type for rendering
   *
   * @param componentValue - Component's metadata value
   * @param drawingValue - Drawing's metadata value
   * @returns Badge type ('inherited' | 'assigned' | 'none')
   *
   * Decision tree:
   * - componentValue is null → 'none' (no badge, show "—")
   * - drawingValue is null → 'assigned' (must be manually set)
   * - values match → 'inherited' (gray badge)
   * - values differ → 'assigned' (blue badge)
   */
  getBadgeType(
    componentValue: string | null,
    drawingValue: string | null
  ): BadgeType;

  /**
   * Get tooltip text for badge
   *
   * @param badgeType - Type of badge being displayed
   * @param drawingNumber - Drawing number (e.g., "P-001") for inherited badges
   * @returns Tooltip text to display on hover
   *
   * Examples:
   * - ('inherited', 'P-001') → "From drawing P-001"
   * - ('assigned', undefined) → "Manually assigned"
   * - ('none', undefined) → "" (no tooltip)
   */
  getTooltipText(
    badgeType: BadgeType,
    drawingNumber?: string
  ): string;
}

/**
 * Expected implementation in src/lib/metadata-inheritance.ts:
 *
 * ```typescript
 * export function isInherited(
 *   componentValue: string | null,
 *   drawingValue: string | null,
 *   field: 'area_id' | 'system_id' | 'test_package_id'
 * ): boolean {
 *   // No component value = nothing inherited
 *   if (!componentValue) return false;
 *
 *   // No drawing value = must be manually assigned
 *   if (!drawingValue) return false;
 *
 *   // Values match = inherited (or manually assigned to same value, acceptable false positive)
 *   return componentValue === drawingValue;
 * }
 *
 * export function getBadgeType(
 *   componentValue: string | null,
 *   drawingValue: string | null
 * ): BadgeType {
 *   // No component value = no badge
 *   if (!componentValue) return 'none';
 *
 *   // No drawing value = manually assigned
 *   if (!drawingValue) return 'assigned';
 *
 *   // Values match = inherited
 *   if (componentValue === drawingValue) return 'inherited';
 *
 *   // Values differ = manually assigned
 *   return 'assigned';
 * }
 *
 * export function getTooltipText(
 *   badgeType: BadgeType,
 *   drawingNumber?: string
 * ): string {
 *   switch (badgeType) {
 *     case 'inherited':
 *       return drawingNumber ? `From drawing ${drawingNumber}` : 'Inherited from drawing';
 *     case 'assigned':
 *       return 'Manually assigned';
 *     case 'none':
 *       return '';
 *   }
 * }
 * ```
 */

/**
 * Usage in ComponentRow rendering:
 *
 * ```typescript
 * import { getBadgeType, getTooltipText } from '@/lib/metadata-inheritance';
 *
 * function ComponentRow({ component, drawing }) {
 *   const areaBadgeType = getBadgeType(component.area_id, drawing.area_id);
 *   const areaTooltip = getTooltipText(areaBadgeType, drawing.drawing_no_norm);
 *
 *   return (
 *     <tr>
 *       <td>
 *         {component.area_name}
 *         {areaBadgeType === 'inherited' && (
 *           <span className="badge badge-gray" title={areaTooltip}>
 *             (inherited)
 *           </span>
 *         )}
 *         {areaBadgeType === 'assigned' && (
 *           <span className="badge badge-blue" title={areaTooltip}>
 *             (assigned)
 *           </span>
 *         )}
 *       </td>
 *     </tr>
 *   );
 * }
 * ```
 */

/**
 * Badge rendering styles (Tailwind CSS):
 *
 * Inherited badge (gray):
 * - Background: bg-slate-100
 * - Text: text-slate-600
 * - Border: border border-slate-300
 * - Padding: px-1.5 py-0.5
 * - Font: text-xs font-medium
 *
 * Assigned badge (blue):
 * - Background: bg-blue-100
 * - Text: text-blue-700
 * - Border: border border-blue-300
 * - Padding: px-1.5 py-0.5
 * - Font: text-xs font-medium
 *
 * Tooltip (using Radix Tooltip):
 * - Trigger: Wrap badge in <TooltipTrigger>
 * - Content: Dark background with white text
 * - Delay: 300ms
 * - Position: top
 */

/**
 * State transitions for badges:
 *
 * 1. Component created with NULL area_id:
 *    - getBadgeType(null, 'area-100-uuid') → 'none'
 *    - Display: "—" (no badge)
 *
 * 2. Drawing assigned Area 100, component inherits:
 *    - Database: component.area_id = 'area-100-uuid' (via RPC function)
 *    - getBadgeType('area-100-uuid', 'area-100-uuid') → 'inherited'
 *    - Display: "Area 100 (inherited)" with gray badge
 *
 * 3. User clicks pencil icon, changes component to Area 200:
 *    - Database: component.area_id = 'area-200-uuid'
 *    - getBadgeType('area-200-uuid', 'area-100-uuid') → 'assigned'
 *    - Display: "Area 200 (assigned)" with blue badge
 *
 * 4. User clears component assignment (sets to NULL):
 *    - Database: component.area_id = NULL
 *    - getBadgeType(null, 'area-100-uuid') → 'none'
 *    - Display: "—" (no badge)
 *    - If drawing still has Area 100, component will re-inherit on next assignment
 */

/**
 * Test scenarios:
 *
 * 1. Component and drawing both NULL:
 *    - isInherited(null, null, 'area_id') → false
 *    - getBadgeType(null, null) → 'none'
 *
 * 2. Component has value, drawing is NULL:
 *    - isInherited('uuid-1', null, 'area_id') → false
 *    - getBadgeType('uuid-1', null) → 'assigned'
 *
 * 3. Component and drawing have matching values:
 *    - isInherited('uuid-1', 'uuid-1', 'area_id') → true
 *    - getBadgeType('uuid-1', 'uuid-1') → 'inherited'
 *
 * 4. Component and drawing have different values:
 *    - isInherited('uuid-1', 'uuid-2', 'area_id') → false
 *    - getBadgeType('uuid-1', 'uuid-2') → 'assigned'
 *
 * 5. Component is NULL, drawing has value:
 *    - isInherited(null, 'uuid-1', 'area_id') → false
 *    - getBadgeType(null, 'uuid-1') → 'none'
 */
