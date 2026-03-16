/**
 * Maps BOM classifications from Gemini extraction to PipeTrak component types,
 * and determines which items are tracked vs sidebar-only.
 */

export type ComponentType =
  | 'valve'
  | 'flange'
  | 'support'
  | 'fitting'
  | 'pipe'
  | 'threaded_pipe'
  | 'instrument'
  | 'tubing'
  | 'hose'
  | 'misc_component';

const PATTERNS: Array<{ type: ComponentType; regex: RegExp }> = [
  // Must check THREADED_PIPE before PIPE so "threaded pipe" doesn't match bare /^pipe$/i first
  { type: 'threaded_pipe', regex: /\bthreaded\s*pipe\b/i },
  { type: 'pipe',         regex: /^pipe$/i },
  { type: 'valve',        regex: /\b(gate|globe|ball|check|butterfly|plug|needle)\s*valve\b/i },
  { type: 'flange',       regex: /\bflange\b/i },
  { type: 'support',      regex: /\b(pipe\s*shoe|guide|anchor|spring\s*hanger|support|clamp)\b/i },
  { type: 'fitting',      regex: /\b(elbow|tee|reducer|coupling|cap|union|nipple|bushing)\b/i },
  { type: 'instrument',   regex: /\b(instrument|gauge|transmitter|indicator)\b/i },
  { type: 'tubing',       regex: /\btubing\b/i },
  { type: 'hose',         regex: /\bhose\b/i },
];

/**
 * Maps a BOM description string to a PipeTrak component type.
 * Returns 'misc_component' when no pattern matches.
 */
export function mapBomToComponentType(description: string): ComponentType {
  for (const { type, regex } of PATTERNS) {
    if (regex.test(description)) {
      return type;
    }
  }
  return 'misc_component';
}

const BOLT_GASKET_PATTERN = /\b(bolt|stud\s*bolt|nut|washer|gasket)\b/i;

/**
 * Determines whether a BOM line item should be tracked in PipeTrak.
 *
 * Items are NOT tracked when:
 *  - Their erection category is 'shop' (shop-fabricated; tracked differently)
 *  - They are consumable hardware (bolts, nuts, washers, gaskets)
 */
export function isTrackedItem(description: string, erectionCategory: string): boolean {
  if (erectionCategory === 'shop') {
    return false;
  }
  if (BOLT_GASKET_PATTERN.test(description)) {
    return false;
  }
  return true;
}
