import type { IdentityKey } from '@/types/drawing-table.types'

export function calculateDuplicateCounts(
  components: Array<{ identity_key: IdentityKey }>
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const component of components) {
    const key = createIdentityGroupKey(component.identity_key)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return counts
}

export function createIdentityGroupKey(identity: IdentityKey): string {
  return `${identity.drawing_norm}|${identity.commodity_code}|${identity.size}`
}
