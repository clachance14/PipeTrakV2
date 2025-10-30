// Homepage Animation Utilities
// Feature: 021-public-homepage
// Task: T010
// Description: Intersection Observer utilities for scroll animations

import { useEffect, useRef, RefObject } from 'react'

/**
 * Hook for scroll-triggered fade-in-up animation
 * Uses Intersection Observer to trigger animation when element enters viewport
 *
 * @param threshold - Percentage of element visible before triggering (default: 0.1 = 10%)
 * @returns Ref to attach to the element you want to animate
 */
export function useScrollFadeIn(threshold: number = 0.1): RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current

    if (!element) return

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Skip animation if user prefers reduced motion
      element.style.opacity = '1'
      element.style.transform = 'none'
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          element.classList.add('animate-fade-in-up')
          observer.unobserve(element) // Stop observing once animated
        }
      },
      { threshold }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  return ref
}

/**
 * Hook for staggered scroll animations
 * Animates multiple children with a delay between each
 *
 * @param childSelector - CSS selector for child elements to animate (default: '> *')
 * @param staggerDelay - Delay between each child animation in ms (default: 150)
 * @param threshold - Intersection threshold (default: 0.1)
 * @returns Ref to attach to the parent container
 */
export function useStaggeredScroll(
  childSelector: string = ':scope > *',
  staggerDelay: number = 150,
  threshold: number = 0.1
): RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const container = ref.current

    if (!container) return

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Skip animation if user prefers reduced motion
      const children = container.querySelectorAll(childSelector)
      children.forEach((child) => {
        if (child instanceof HTMLElement) {
          child.style.opacity = '1'
          child.style.transform = 'none'
        }
      })
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const children = container.querySelectorAll(childSelector)

          children.forEach((child, index) => {
            if (child instanceof HTMLElement) {
              setTimeout(() => {
                child.classList.add('animate-fade-in-up')
              }, index * staggerDelay)
            }
          })

          observer.unobserve(container)
        }
      },
      { threshold }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [childSelector, staggerDelay, threshold])

  return ref
}

/**
 * Hook for smooth scroll to element
 * Returns a function that smoothly scrolls to a target element
 *
 * @returns Function to trigger smooth scroll
 */
export function useSmoothScroll(): (targetId: string) => void {
  return (targetId: string) => {
    const target = document.getElementById(targetId)

    if (!target) {
      console.warn(`Scroll target not found: ${targetId}`)
      return
    }

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    })
  }
}

/**
 * CSS classes for animations (add to global styles)
 *
 * @keyframes fadeInUp {
 *   from {
 *     opacity: 0;
 *     transform: translateY(20px);
 *   }
 *   to {
 *     opacity: 1;
 *     transform: translateY(0);
 *   }
 * }
 *
 * .animate-fade-in-up {
 *   animation: fadeInUp 0.6s ease-out forwards;
 * }
 *
 * @media (prefers-reduced-motion: reduce) {
 *   .animate-fade-in-up {
 *     animation: none;
 *     opacity: 1;
 *     transform: none;
 *   }
 * }
 */
