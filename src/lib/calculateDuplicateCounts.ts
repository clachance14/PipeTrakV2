import type { IdentityKey } from '@/types/drawing-table.types'

export function calculateDuplicateCounts(
  components: Array<{ identity_key: IdentityKey }>
): Map<string, number> {
  return new Map()
}

export function createIdentityGroupKey(identity: IdentityKey): string {
  return `${identity.drawing_norm}|${identity.commodity_code}|${identity.size}`
}
