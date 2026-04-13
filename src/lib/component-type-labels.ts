/**
 * Shared component type display names
 * Extracted from ComponentRow.tsx for reuse across drawing-table and drawing-viewer.
 */

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  field_weld: 'Field Weld',
  valve: 'Valve',
  fitting: 'Fitting',
  flange: 'Flange',
  instrument: 'Instrument',
  support: 'Support',
  pipe: 'Pipe',
  spool: 'Spool',
  tubing: 'Tubing',
  hose: 'Hose',
  threaded_pipe: 'Threaded Pipe',
  misc_component: 'Misc Component',
}

/** Plural labels for group headers (e.g., "Spools", "Valves") */
const COMPONENT_TYPE_PLURALS: Record<string, string> = {
  field_weld: 'Field Welds',
  valve: 'Valves',
  fitting: 'Fittings',
  flange: 'Flanges',
  instrument: 'Instruments',
  support: 'Supports',
  pipe: 'Pipe',
  spool: 'Spools',
  tubing: 'Tubing',
  hose: 'Hoses',
  threaded_pipe: 'Threaded Pipe',
  misc_component: 'Misc Components',
}

export function formatComponentType(type: string): string {
  return COMPONENT_TYPE_LABELS[type] ?? type
}

export function formatComponentTypePlural(type: string): string {
  return COMPONENT_TYPE_PLURALS[type] ?? type
}

/** Returns true for aggregate component types (pipe, threaded_pipe) */
export function isAggregateType(type: string): boolean {
  return type === 'pipe' || type === 'threaded_pipe'
}
