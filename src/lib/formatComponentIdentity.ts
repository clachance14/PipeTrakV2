/**
 * Component Identity Formatting Utility
 * Feature 030: Package Completion Report
 *
 * Provides functions for formatting component identity_key JSONB
 * with inch notation for sizes and aggregation for display.
 */

/**
 * Aggregated component for display
 */
export interface AggregatedComponent {
  component_type: string;
  identity_display: string;
  quantity: number;
}

/**
 * Format size with inch notation
 *
 * @example
 * formatSizeWithInches('2')    // '2"'
 * formatSizeWithInches('3/4')  // '3/4"'
 * formatSizeWithInches(null)   // ''
 */
export function formatSizeWithInches(size: string | null | undefined): string {
  if (!size || size === '') return '';

  // Don't double-add inch notation
  if (size.endsWith('"')) return size;

  return `${size}"`;
}

/**
 * Extract tag/name from identity_key based on component type
 */
function extractTag(identityKey: Record<string, unknown>): string {
  // Field welds use weld_number
  if ('weld_number' in identityKey && identityKey.weld_number) {
    return String(identityKey.weld_number);
  }

  // Valves and some components use tag_no
  if ('tag_no' in identityKey && identityKey.tag_no) {
    return String(identityKey.tag_no);
  }

  // Most commodity components use commodity_code
  if ('commodity_code' in identityKey && identityKey.commodity_code) {
    return String(identityKey.commodity_code);
  }

  // Fallback: try any reasonable field
  if ('name' in identityKey && identityKey.name) {
    return String(identityKey.name);
  }

  return 'Unknown';
}

/**
 * Extract size from identity_key
 */
function extractSize(identityKey: Record<string, unknown>): string | null {
  if ('size' in identityKey && identityKey.size) {
    return String(identityKey.size);
  }
  return null;
}

/**
 * Build identity display string from identity_key JSONB
 *
 * @example
 * // { commodity_code: 'CV-26C02', size: '2', seq: 1 } => 'CV-26C02 | 2"'
 * // { weld_number: 'W-001' } => 'W-001'
 */
function buildIdentityDisplay(identityKey: unknown): string {
  // Handle string identity (already formatted, legacy)
  if (typeof identityKey === 'string') {
    return identityKey;
  }

  // Handle null/undefined
  if (!identityKey || typeof identityKey !== 'object') {
    return 'Unknown';
  }

  const obj = identityKey as Record<string, unknown>;
  const tag = extractTag(obj);
  const size = extractSize(obj);

  // Build display string: tag | size" (if size exists)
  if (size) {
    return `${tag} | ${formatSizeWithInches(size)}`;
  }

  return tag;
}

/**
 * Build canonical key for grouping (excludes seq, includes type)
 */
function buildCanonicalKey(
  componentType: string,
  identityKey: unknown
): string {
  // Handle string identity (already formatted)
  if (typeof identityKey === 'string') {
    return `${componentType}|${identityKey}`;
  }

  if (!identityKey || typeof identityKey !== 'object') {
    return `${componentType}|unknown`;
  }

  const obj = identityKey as Record<string, unknown>;
  const tag = extractTag(obj);
  const size = extractSize(obj);

  // Group by type + tag + size (exclude seq)
  return `${componentType}|${tag}|${size || ''}`;
}

/**
 * Aggregate components for display
 *
 * Groups identical components (same type + identity, excluding seq)
 * and returns array with formatted identity and quantity.
 *
 * @example
 * // 3 identical CV-26C02 | 2" instruments => one row with quantity: 3
 * // Different sizes => separate rows
 */
export function aggregateComponentsForDisplay(
  components: Array<{ component_type?: string; identity_key?: unknown }>
): AggregatedComponent[] {
  const aggregateMap = new Map<
    string,
    { component_type: string; identity_display: string; quantity: number }
  >();

  for (const component of components) {
    const componentType = component.component_type || 'unknown';
    const canonicalKey = buildCanonicalKey(componentType, component.identity_key);

    if (aggregateMap.has(canonicalKey)) {
      // Increment quantity for existing entry
      const existing = aggregateMap.get(canonicalKey)!;
      existing.quantity += 1;
    } else {
      // Create new entry
      aggregateMap.set(canonicalKey, {
        component_type: componentType,
        identity_display: buildIdentityDisplay(component.identity_key),
        quantity: 1,
      });
    }
  }

  // Convert to array and sort by component type then identity
  const result = Array.from(aggregateMap.values());
  result.sort((a, b) => {
    const typeCompare = a.component_type.localeCompare(b.component_type);
    if (typeCompare !== 0) return typeCompare;
    return a.identity_display.localeCompare(b.identity_display);
  });

  return result;
}
