/**
 * localStorage mock for testing
 *
 * Provides an in-memory Map-based implementation of localStorage
 * that can be used in Vitest tests (jsdom environment).
 *
 * Usage:
 * ```typescript
 * import 'tests/setup/localStorage.mock'
 *
 * beforeEach(() => {
 *   localStorage.clear()
 * })
 * ```
 */

const storage = new Map<string, string>()

global.localStorage = {
  getItem: (key: string): string | null => {
    return storage.get(key) ?? null
  },

  setItem: (key: string, value: string): void => {
    storage.set(key, value)
  },

  removeItem: (key: string): void => {
    storage.delete(key)
  },

  clear: (): void => {
    storage.clear()
  },

  get length(): number {
    return storage.size
  },

  key: (index: number): string | null => {
    const keys = Array.from(storage.keys())
    return keys[index] ?? null
  }
}

// Export storage map for direct manipulation in tests if needed
export const mockStorage = storage
