import { describe, it, expect, vi } from 'vitest'
import { isElementVisible, shouldScrollToElement } from './scroll-helpers'

describe('scroll-helpers', () => {
  describe('isElementVisible', () => {
    it('returns true when element is fully visible in viewport', () => {
      const element = {
        offsetTop: 200,
        offsetHeight: 64
      } as HTMLElement

      const container = {
        scrollTop: 100,
        clientHeight: 500
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(true)
    })

    it('returns false when element is above viewport', () => {
      const element = {
        offsetTop: 50,
        offsetHeight: 64
      } as HTMLElement

      const container = {
        scrollTop: 200,
        clientHeight: 500
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(false)
    })

    it('returns false when element is below viewport', () => {
      const element = {
        offsetTop: 800,
        offsetHeight: 64
      } as HTMLElement

      const container = {
        scrollTop: 100,
        clientHeight: 500
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(false)
    })

    it('returns true when element is partially visible', () => {
      const element = {
        offsetTop: 550,
        offsetHeight: 100
      } as HTMLElement

      const container = {
        scrollTop: 100,
        clientHeight: 500
      } as HTMLElement

      // Element starts at 550, viewport ends at 600 (100 + 500)
      // Element is partially visible (50px visible)
      expect(isElementVisible(element, container)).toBe(true)
    })
  })

  describe('shouldScrollToElement', () => {
    it('returns true when element not visible', () => {
      const isVisible = false
      expect(shouldScrollToElement(isVisible)).toBe(true)
    })

    it('returns false when element already visible', () => {
      const isVisible = true
      expect(shouldScrollToElement(isVisible)).toBe(false)
    })
  })
})
