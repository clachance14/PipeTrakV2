/**
 * Responsive UI Utilities
 * Feature: 015-mobile-milestone-updates
 * Purpose: Viewport detection and touch target validation helpers
 */

// Mobile threshold: viewports ≤ 1024px are considered mobile
export const MOBILE_BREAKPOINT = 1024

/**
 * Check if current viewport is mobile (≤1024px)
 */
export function isMobileViewport(): boolean {
  return window.innerWidth <= MOBILE_BREAKPOINT
}

/**
 * Check if current viewport is desktop (>1024px)
 */
export function isDesktopViewport(): boolean {
  return window.innerWidth > MOBILE_BREAKPOINT
}

/**
 * Get debounce delay based on viewport (500ms mobile, 300ms desktop)
 */
export function getSearchDebounce(): number {
  return isMobileViewport() ? 500 : 300
}

/**
 * Validate that an element meets minimum touch target size (44px)
 * @throws Error if element is too small
 */
export function assertTouchTarget(element: HTMLElement, minSize: number = 44): void {
  const rect = element.getBoundingClientRect()
  
  if (rect.width < minSize) {
    throw new Error(`Touch target width ${rect.width}px is less than minimum ${minSize}px`)
  }
  
  if (rect.height < minSize) {
    throw new Error(`Touch target height ${rect.height}px is less than minimum ${minSize}px`)
  }
}

/**
 * Check if element meets touch target requirements (returns boolean)
 */
export function isTouchTargetValid(element: HTMLElement, minSize: number = 44): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width >= minSize && rect.height >= minSize
}

/**
 * Get responsive row height (64px mobile, 60px desktop)
 */
export function getRowHeight(): number {
  return isMobileViewport() ? 64 : 60
}

/**
 * Get responsive virtualization overscan (5 rows mobile, 10 rows desktop)
 */
export function getVirtualOverscan(): number {
  return isMobileViewport() ? 5 : 10
}

/**
 * Format progress label based on viewport
 * Mobile: "47%"
 * Desktop: "47% Complete"
 */
export function formatProgressLabel(percent: number): string {
  const rounded = Math.round(percent)
  return isMobileViewport() ? `${rounded}%` : `${rounded}% Complete`
}

/**
 * Get responsive filter layout classes
 * Mobile: vertical stack (flex-col gap-4)
 * Desktop: horizontal row (flex-row gap-2)
 */
export function getFilterLayoutClasses(): string {
  return isMobileViewport() 
    ? 'flex flex-col gap-4' 
    : 'flex flex-row gap-2'
}

/**
 * Get responsive touch target classes for buttons
 * Mobile: h-11 w-11 (44px)
 * Desktop: h-8 w-8 (32px)
 */
export function getTouchTargetClasses(): string {
  return isMobileViewport() 
    ? 'h-11 w-11' 
    : 'h-8 w-8'
}
