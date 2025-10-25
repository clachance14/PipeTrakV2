/**
 * window.innerWidth mock for testing responsive behavior
 *
 * Provides helper to simulate different viewport widths in tests.
 *
 * Usage:
 * ```typescript
 * import { mockViewport } from 'tests/setup/viewport.mock'
 *
 * test('renders mobile UI on small viewport', () => {
 *   mockViewport(375)  // iPhone SE width
 *   // ... test mobile UI
 * })
 *
 * test('renders desktop UI on large viewport', () => {
 *   mockViewport(1440)  // Desktop width
 *   // ... test desktop UI
 * })
 * ```
 */

/**
 * Mock window.innerWidth and trigger resize event
 *
 * @param width - Viewport width in pixels
 */
export function mockViewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  })

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: width <= 768 ? 667 : 900  // Approximate mobile/desktop height
  })

  window.dispatchEvent(new Event('resize'))
}

/**
 * Reset to default desktop viewport (1440px)
 */
export function resetViewport(): void {
  mockViewport(1440)
}

/**
 * Preset viewport sizes for common devices
 */
export const VIEWPORTS = {
  MOBILE_SMALL: 375,   // iPhone SE
  MOBILE: 390,         // iPhone 12 Pro
  TABLET: 768,         // iPad portrait
  TABLET_LANDSCAPE: 1024,  // iPad landscape
  DESKTOP: 1440        // Standard desktop
} as const
