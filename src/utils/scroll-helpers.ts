/**
 * Check if an element is visible within a scrollable container
 */
export function isElementVisible(
  element: HTMLElement,
  container: HTMLElement
): boolean {
  const elementTop = element.offsetTop
  const elementBottom = elementTop + element.offsetHeight
  const containerTop = container.scrollTop
  const containerBottom = containerTop + container.clientHeight

  // Element is visible if any part of it is within viewport
  return elementBottom > containerTop && elementTop < containerBottom
}

/**
 * Determine if we should scroll to an element
 * (only scroll if element is not currently visible)
 */
export function shouldScrollToElement(isVisible: boolean): boolean {
  return !isVisible
}

/**
 * Scroll to an element within a container with smooth animation
 */
export function scrollToElement(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollToOptions = {}
): void {
  const elementTop = element.offsetTop
  const scrollTop = elementTop - 80 // Leave some space at top (headers)

  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  container.scrollTo({
    top: scrollTop,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    ...options
  })
}
