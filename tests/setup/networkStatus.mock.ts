/**
 * navigator.onLine mock for testing offline/online scenarios
 *
 * Provides helpers to simulate network connectivity changes in tests.
 *
 * Usage:
 * ```typescript
 * import { goOffline, goOnline } from 'tests/setup/networkStatus.mock'
 *
 * test('queues updates when offline', () => {
 *   goOffline()
 *   // ... test offline behavior
 *   goOnline()
 *   // ... test sync behavior
 * })
 * ```
 */

let isOnline = true

// Override navigator.onLine getter
Object.defineProperty(navigator, 'onLine', {
  get() {
    return isOnline
  },
  configurable: true
})

/**
 * Simulate going offline
 * Dispatches 'offline' event and sets navigator.onLine to false
 */
export function goOffline(): void {
  isOnline = false
  window.dispatchEvent(new Event('offline'))
}

/**
 * Simulate going online
 * Dispatches 'online' event and sets navigator.onLine to true
 */
export function goOnline(): void {
  isOnline = true
  window.dispatchEvent(new Event('online'))
}

/**
 * Reset to online state (for use in beforeEach)
 */
export function resetNetworkStatus(): void {
  isOnline = true
}
