/**
 * crypto.randomUUID mock for deterministic test IDs
 *
 * Provides a sequential UUID generator for predictable test assertions.
 *
 * Usage:
 * ```typescript
 * import { resetUUIDCounter } from 'tests/setup/crypto.mock'
 *
 * beforeEach(() => {
 *   resetUUIDCounter()
 * })
 *
 * test('generates predictable UUIDs', () => {
 *   const id1 = crypto.randomUUID()  // '00000000-0000-0000-0000-000000000001'
 *   const id2 = crypto.randomUUID()  // '00000000-0000-0000-0000-000000000002'
 *   expect(id1).not.toBe(id2)
 * })
 * ```
 */

let counter = 0

/**
 * Generate deterministic UUID for testing
 * Format: 00000000-0000-0000-0000-{counter padded to 12 digits}
 */
function mockRandomUUID(): string {
  counter += 1
  const paddedCounter = counter.toString().padStart(12, '0')
  return `00000000-0000-0000-0000-${paddedCounter}`
}

// Override crypto.randomUUID
if (typeof crypto === 'undefined') {
  // @ts-expect-error - crypto may not exist in test environment
  global.crypto = {}
}

crypto.randomUUID = mockRandomUUID

/**
 * Reset UUID counter (for use in beforeEach)
 */
export function resetUUIDCounter(): void {
  counter = 0
}

/**
 * Get current counter value (for debugging)
 */
export function getUUIDCounter(): number {
  return counter
}
