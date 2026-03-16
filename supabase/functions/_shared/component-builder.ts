/**
 * Component Builder — pure utility functions for component creation.
 * Shared across import-takeoff, process-drawing, and other edge functions.
 *
 * All functions are PURE — no Supabase client dependency.
 */

// ---------------------------------------------------------------------------
// Size normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a size string for use in identity keys.
 * - Removes quotes, spaces
 * - Converts / to X
 * - Returns 'NOSIZE' for empty/blank values
 */
export function normalizeSize(raw: string | undefined): string {
  if (!raw || raw.trim() === '') {
    return 'NOSIZE';
  }

  return raw
    .trim()
    .replace(/["'\s]/g, '')
    .replace(/\//g, 'X')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Component type classification
// ---------------------------------------------------------------------------

/** Component types that use a unique ID as identity (no quantity explosion). */
const UNIQUE_ID_TYPES = new Set(['spool', 'field_weld']);

/** Component types that aggregate rows into a single component per drawing+size+commodity. */
const AGGREGATE_TYPES = new Set(['pipe', 'threaded_pipe']);

/** Component types that skip quantity explosion (always seq: 1). */
const NO_EXPLOSION_TYPES = new Set(['instrument']);

/**
 * Returns true if the component type uses a unique identifier (spool_id, weld_number)
 * rather than sequence-based identity keys.
 */
export function isUniqueIdType(typeLower: string): boolean {
  return UNIQUE_ID_TYPES.has(typeLower);
}

/**
 * Returns true if the component type uses the aggregate model
 * (one component per drawing+size+commodity, QTY = linear feet).
 */
export function isAggregateType(typeLower: string): boolean {
  return AGGREGATE_TYPES.has(typeLower);
}

/**
 * Returns true if the component type should NOT explode quantity
 * (always creates a single component with seq: 1).
 */
export function isNoExplosionType(typeLower: string): boolean {
  return NO_EXPLOSION_TYPES.has(typeLower);
}

/**
 * Returns true if the component type should explode quantity
 * (creates N components with seq: 1..N).
 */
export function isExplodedType(typeLower: string): boolean {
  return !isUniqueIdType(typeLower) && !isAggregateType(typeLower) && !isNoExplosionType(typeLower);
}

// ---------------------------------------------------------------------------
// Pipe aggregate ID generation
// ---------------------------------------------------------------------------

/**
 * Generate the aggregate pipe ID for pipe/threaded_pipe components.
 * Format: `{DRAWING_NORM}-{SIZE_NORM}-{CMDTY_CODE}-AGG`
 */
export function generatePipeAggregateId(
  drawingNorm: string,
  sizeRaw: string | undefined,
  cmdtyCode: string
): string {
  const sizeNorm = normalizeSize(sizeRaw);
  return `${drawingNorm}-${sizeNorm}-${cmdtyCode}-AGG`;
}

// ---------------------------------------------------------------------------
// Identity key construction
// ---------------------------------------------------------------------------

/** Identity key for spool components. */
export interface SpoolIdentityKey {
  spool_id: string;
}

/** Identity key for field_weld components. */
export interface FieldWeldIdentityKey {
  weld_number: string;
}

/** Identity key for pipe/threaded_pipe aggregate components. */
export interface PipeIdentityKey {
  pipe_id: string;
}

/** Identity key for sequence-based components (valve, fitting, flange, etc.). */
export interface SequenceIdentityKey {
  drawing_norm: string;
  commodity_code: string;
  size: string;
  seq: number;
}

export type ComponentIdentityKey =
  | SpoolIdentityKey
  | FieldWeldIdentityKey
  | PipeIdentityKey
  | SequenceIdentityKey;

/**
 * Build the identity key for a single component based on its type.
 *
 * For spool/field_weld: uses the commodity code as unique ID.
 * For pipe/threaded_pipe: uses generatePipeAggregateId().
 * For instrument: sequence-based with seq always = 1.
 * For all others: sequence-based with the provided seq number.
 */
export function buildIdentityKey(
  typeLower: string,
  drawingNorm: string,
  cmdtyCode: string,
  sizeRaw: string | undefined,
  seq: number
): ComponentIdentityKey {
  if (typeLower === 'spool') {
    return { spool_id: cmdtyCode };
  }

  if (typeLower === 'field_weld') {
    return { weld_number: cmdtyCode };
  }

  if (isAggregateType(typeLower)) {
    return { pipe_id: generatePipeAggregateId(drawingNorm, sizeRaw, cmdtyCode) };
  }

  if (isNoExplosionType(typeLower)) {
    return {
      drawing_norm: drawingNorm,
      commodity_code: cmdtyCode,
      size: normalizeSize(sizeRaw),
      seq: 1,
    };
  }

  // Default: exploded sequence-based
  return {
    drawing_norm: drawingNorm,
    commodity_code: cmdtyCode,
    size: normalizeSize(sizeRaw),
    seq,
  };
}

// ---------------------------------------------------------------------------
// Identity lookup key (for deduplication)
// ---------------------------------------------------------------------------

/**
 * Build a string lookup key for deduplication: `type::identity_key_json`
 * Keys within the identity JSON are sorted for stable comparison.
 */
export function buildIdentityLookupKey(
  componentType: string,
  identityKey: Record<string, unknown>
): string {
  const sortedKey = Object.keys(identityKey)
    .sort()
    .reduce((acc, key) => {
      acc[key] = identityKey[key];
      return acc;
    }, {} as Record<string, unknown>);
  return `${componentType}::${JSON.stringify(sortedKey)}`;
}

// ---------------------------------------------------------------------------
// Default milestones for aggregate types
// ---------------------------------------------------------------------------

/**
 * Default milestones for pipe aggregate components (v2 template).
 */
export function getDefaultPipeMilestones(): Record<string, number> {
  return {
    Receive: 0,
    Erect: 0,
    Connect: 0,
    Support: 0,
    Punch: 0,
    Test: 0,
    Restore: 0,
  };
}

/**
 * Default milestones for threaded_pipe aggregate components.
 */
export function getDefaultThreadedPipeMilestones(): Record<string, number> {
  return {
    Fabricate_LF: 0,
    Erect_LF: 0,
    Connect_LF: 0,
    Support_LF: 0,
    Punch: 0,
    Test: 0,
    Restore: 0,
  };
}

/**
 * Get the default milestones for a given aggregate component type.
 * Returns undefined for non-aggregate types.
 */
export function getDefaultAggregateMilestones(
  typeLower: string
): Record<string, number> | undefined {
  if (typeLower === 'pipe') return getDefaultPipeMilestones();
  if (typeLower === 'threaded_pipe') return getDefaultThreadedPipeMilestones();
  return undefined;
}
