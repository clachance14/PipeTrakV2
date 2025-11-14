import { describe, it, expect, vi } from 'vitest'
import { isElementVisible, shouldScrollToElement } from './scroll-helpers'

describe('scroll-helpers', () => {
  describe('isElementVisible', () => {
    it('returns true when element is fully visible in viewport', () => {
      const element = {
        getBoundingClientRect: () => ({ top: 100, bottom: 164 })
      } as HTMLElement

      const container = {
        getBoundingClientRect: () => ({ top: 0, bottom: 600 })
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(true)
    })

    it('returns false when element is above viewport', () => {
      const element = {
        getBoundingClientRect: () => ({ top: -100, bottom: -36 })
      } as HTMLElement

      const container = {
        getBoundingClientRect: () => ({ top: 0, bottom: 600 })
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(false)
    })

    it('returns false when element is below viewport', () => {
      const element = {
        getBoundingClientRect: () => ({ top: 700, bottom: 764 })
      } as HTMLElement

      const container = {
        getBoundingClientRect: () => ({ top: 0, bottom: 600 })
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(false)
    })

    it('returns true when element is partially visible', () => {
      const element = {
        getBoundingClientRect: () => ({ top: 550, bottom: 650 })
      } as HTMLElement

      const container = {
        getBoundingClientRect: () => ({ top: 0, bottom: 600 })
      } as HTMLElement

      // Element bottom at 650, viewport ends at 600
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
