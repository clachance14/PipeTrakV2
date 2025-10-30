import { describe, it, expect } from 'vitest'
import { generateDemoEmailHtml } from '../../../supabase/functions/demo-signup/email-template'

/**
 * Test suite for demo signup email template generation
 * Tests the generateDemoEmailHtml function that creates custom HTML emails
 * for demo user signups sent via Resend API.
 */
describe('email-template', () => {

  describe('generateDemoEmailHtml', () => {
    const mockFullName = 'John Smith'
    const mockMagicLinkUrl = 'https://example.supabase.co/auth/v1/verify?token=abc123&type=magiclink'
    const mockDemoExpiresAt = '2025-11-05T10:00:00.000Z' // ISO timestamp
    const mockResendLinkUrl = 'https://example.supabase.co/functions/v1/resend-magic-link'
    const mockUserEmail = 'test@example.com'

    it('renders email with all template variables', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      expect(html).toContain(mockFullName)
      expect(html).toContain(mockMagicLinkUrl)
      // Date should be formatted as "November 5, 2025"
      expect(html).toContain('November 5, 2025')
    })

    it('personalizes greeting with fullName parameter', () => {
      const html = generateDemoEmailHtml('Jane Doe', mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Should contain personalized greeting
      expect(html).toContain('Jane Doe')
      // Should be in a greeting context (e.g., "Hi Jane Doe")
      expect(html).toMatch(/Hi\s+Jane Doe/i)
    })

    it('includes magic link URL in CTA button', () => {
      const customMagicLink = 'https://custom.link/auth?token=xyz789'
      const html = generateDemoEmailHtml(mockFullName, customMagicLink, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Should include the magic link in an anchor tag
      expect(html).toContain('href="https://custom.link/auth?token=xyz789"')
      // Should have a CTA button text
      expect(html).toContain('Access Your Demo Project')
    })

    it('formats expiry date as "Month Day, Year" format', () => {
      // Test various dates to ensure consistent formatting
      const testCases = [
        { input: '2025-01-15T10:00:00.000Z', expected: 'January 15, 2025' },
        { input: '2025-12-31T23:59:59.999Z', expected: 'December 31, 2025' },
        { input: '2025-03-01T00:00:00.000Z', expected: 'March 1, 2025' }
      ]

      testCases.forEach(({ input, expected }) => {
        const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, input, mockResendLinkUrl, mockUserEmail)
        expect(html).toContain(expected)
      })
    })

    it('handles special characters in fullName (e.g., O\'Brien, José)', () => {
      const specialNames = ['Patrick O\'Brien', 'José García', 'François Müller']

      specialNames.forEach(name => {
        const html = generateDemoEmailHtml(name, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)
        // Should contain the name without breaking HTML
        expect(html).toContain(name)
        // Should be valid HTML
        expect(html).toMatch(/<html>/)
      })
    })

    it('includes all required content sections (header, welcome, CTA, quick start, footer)', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Header section
      expect(html).toMatch(/Welcome to PipeTrak/i)

      // Welcome message
      expect(html).toMatch(/Hi.*John Smith/i)

      // CTA button
      expect(html).toContain('Access Your Demo Project')

      // Quick start guide
      expect(html).toMatch(/What to Explore First|Quick Start/i)
      expect(html).toContain('Progress Dashboard')
      expect(html).toContain('Drawing Table')

      // Footer
      expect(html).toMatch(/Questions\?/i)
    })

    it('uses inline styles only (no external CSS)', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Should NOT contain <style> tags or external stylesheets
      expect(html).not.toMatch(/<style[^>]*>/i)
      expect(html).not.toMatch(/<link[^>]*rel=["']stylesheet["']/i)

      // Should contain inline styles
      expect(html).toMatch(/style=["'][^"']+["']/i)

      // Should have styles for common elements
      expect(html).toMatch(/font-family:\s*sans-serif/i)
      expect(html).toMatch(/max-width:\s*600px/i)
    })

    it('email size is <1MB (Resend limit)', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Calculate size in bytes
      const sizeInBytes = new Blob([html]).size
      const sizeInMB = sizeInBytes / (1024 * 1024)

      // Should be well under 1MB (expect <10KB for simple HTML)
      expect(sizeInMB).toBeLessThan(1)
      // Sanity check: should be at least 500 bytes (not empty)
      expect(sizeInBytes).toBeGreaterThan(500)
    })

    it('includes resend magic link button in footer', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Should include resend link URL
      expect(html).toContain(mockResendLinkUrl)
      // Should mention that link is single-use
      expect(html).toMatch(/single-use|one.time|only be used once/i)
      // Should provide button text
      expect(html).toMatch(/Send Me a New Login Link/i)
    })

    it('includes resend magic link with custom endpoint when provided', () => {
      const customResendUrl = 'https://custom.supabase.co/functions/v1/resend-magic-link'
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, customResendUrl, mockUserEmail)

      // Should include custom resend URL
      expect(html).toContain(customResendUrl)
      // Should NOT include default URL (assuming test uses different URL)
      expect(html).not.toContain('https://example.supabase.co/functions/v1/resend-magic-link')
    })

    it('includes "Send Me a New Login Link" button in footer', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Should include button text
      expect(html).toContain('Send Me a New Login Link')
      // Should be a clickable link/button
      expect(html).toMatch(/href=["'][^"']*resend-magic-link[^"']*["']/i)
    })

    it('pre-fills email in resend URL when userEmail provided', () => {
      const userEmail = 'test@example.com'
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, userEmail)

      // Should include resend URL with email parameter
      expect(html).toContain(`${mockResendLinkUrl}?email=test%40example.com`)
      // Should properly URL-encode the email
      expect(html).toContain('%40') // @ symbol encoded
    })

    it('uses plain resend URL when userEmail not provided', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl)

      // Should include resend URL without email parameter
      expect(html).toContain(mockResendLinkUrl)
      // Should NOT have query parameters
      expect(html).not.toContain(`${mockResendLinkUrl}?email=`)
    })

    it('includes helpful context about receiving new email quickly', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, mockResendLinkUrl, mockUserEmail)

      // Should mention that new email will arrive quickly
      expect(html).toMatch(/receive.*new email.*seconds|new email.*seconds/i)
    })
  })
})
