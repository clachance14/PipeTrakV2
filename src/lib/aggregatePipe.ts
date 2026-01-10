import type { ComponentRow, IdentityKey, ComponentType } from '@/types/drawing-table.types'

/**
 * Aggregate pipe detection and milestone value utilities.
 *
 * Aggregate pipes (both 'pipe' and 'threaded_pipe' types) have:
 * - An identity_key with pipe_id ending in '-AGG'
 * - Milestone values stored differently based on type:
 *   - threaded_pipe: stored with '_LF' suffix keys as absolute linear feet
 *   - pipe: stored with standard percentage keys
 */

/**
 * Checks if a component is an aggregate pipe (either 'pipe' or 'threaded_pipe' with -AGG suffix).
 *
 * @param componentType - The component type
 * @param identityKey - The identity key object from the component
 * @returns True if component is an aggregate pipe
 */
export function isAggregatePipe(
  componentType: ComponentType | string,
  identityKey: IdentityKey | { pipe_id: string } | undefined
): boolean {
  if (componentType !== 'pipe' && componentType !== 'threaded_pipe') {
    return false
  }

  if (!identityKey || !('pipe_id' in identityKey)) {
    return false
  }

  return identityKey.pipe_id?.endsWith('-AGG') ?? false
}

/**
 * Gets the current milestone value as a percentage for display.
 *
 * For aggregate threaded pipes, converts from absolute LF to percentage.
 * For all other components, returns the stored percentage directly.
 *
 * @param component - The component row
 * @param milestoneName - The milestone name (e.g., 'Receive', 'Install')
 * @param isPartialMilestone - Whether this is a partial (percentage) milestone
 * @returns The milestone value as a percentage (0-100)
 */
export function getMilestonePercentValue(
  component: ComponentRow,
  milestoneName: string,
  isPartialMilestone: boolean
): number {
  const isAggPipe = isAggregatePipe(component.component_type, component.identity_key)
  const isThreadedPipe = component.component_type === 'threaded_pipe'

  // Only aggregate THREADED pipes store milestones with _LF suffix
  if (isAggPipe && isThreadedPipe && isPartialMilestone) {
    const lfKey = `${milestoneName}_LF`
    const lfValue = component.current_milestones[lfKey]
    const totalLF = component.attributes?.total_linear_feet ?? 0

    if (typeof lfValue === 'number' && totalLF > 0) {
      return Math.round((lfValue / totalLF) * 100)
    }
    return 0
  }

  // All other components (including regular pipe aggregates) use standard percentage keys
  const currentValue = component.current_milestones[milestoneName]
  return typeof currentValue === 'number' ? currentValue : 0
}

/**
 * Checks if a discrete milestone is currently checked/complete.
 *
 * @param currentValue - The raw milestone value from current_milestones
 * @returns True if the milestone is complete
 */
export function isMilestoneComplete(currentValue: boolean | number | undefined): boolean {
  return currentValue === 100 || currentValue === 1 || currentValue === true
}
