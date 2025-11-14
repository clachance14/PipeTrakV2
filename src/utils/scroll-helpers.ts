/**
 * Check if an element is visible within a scrollable container
 * Uses getBoundingClientRect for accurate positioning with virtual scrolling
 */
export function isElementVisible(
  element: HTMLElement,
  container: HTMLElement
): boolean {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // Element is visible if any part of it is within the container's viewport
  return (
    elementRect.bottom > containerRect.top &&
    elementRect.top < containerRect.bottom
  )
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
 * Works correctly with virtual scrolling by using getBoundingClientRect
 */
export function scrollToElement(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollToOptions = {}
): void {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // Calculate how far the element is from the top of the container's viewport
  const elementTopRelativeToContainer = elementRect.top - containerRect.top

  // Calculate new scroll position to position element at top of viewport
  // Add 70px offset to position it just below the table header
  const targetScrollTop = container.scrollTop + elementTopRelativeToContainer - 70

  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  container.scrollTo({
    top: targetScrollTop,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    ...options
  })
}
