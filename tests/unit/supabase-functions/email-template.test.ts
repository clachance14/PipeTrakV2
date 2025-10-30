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

    it('renders email with all template variables', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt)

      expect(html).toContain(mockFullName)
      expect(html).toContain(mockMagicLinkUrl)
      // Date should be formatted as "November 5, 2025"
      expect(html).toContain('November 5, 2025')
    })

    it('personalizes greeting with fullName parameter', () => {
      const html = generateDemoEmailHtml('Jane Doe', mockMagicLinkUrl, mockDemoExpiresAt)

      // Should contain personalized greeting
      expect(html).toContain('Jane Doe')
      // Should be in a greeting context (e.g., "Hi Jane Doe")
      expect(html).toMatch(/Hi\s+Jane Doe/i)
    })

    it('includes magic link URL in CTA button', () => {
      const customMagicLink = 'https://custom.link/auth?token=xyz789'
      const html = generateDemoEmailHtml(mockFullName, customMagicLink, mockDemoExpiresAt)

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
        const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, input)
        expect(html).toContain(expected)
      })
    })

    it('handles special characters in fullName (e.g., O\'Brien, José)', () => {
      const specialNames = [
        'Patrick O\'Brien',
        'José García',
        'François Lefèvre',
        'O\'Malley & Sons'
      ]

      specialNames.forEach(name => {
        const html = generateDemoEmailHtml(name, mockMagicLinkUrl, mockDemoExpiresAt)

        // Should contain the name with special characters properly rendered
        expect(html).toContain(name)
        // Should not escape HTML entities (names are not HTML)
        expect(html).not.toContain('&apos;')
        expect(html).not.toContain('&#39;')
      })
    })

    it('includes all required content sections (header, welcome, CTA, quick start, footer)', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt)

      // Header section
      expect(html).toMatch(/Welcome to PipeTrak/i)

      // Welcome message with brand intro
      expect(html).toMatch(/industrial pipe tracking/i)
      expect(html).toMatch(/brownfield construction/i)

      // CTA button
      expect(html).toContain('Access Your Demo Project')

      // Quick start guide sections (per FR-029)
      expect(html).toMatch(/Progress Dashboard/i)
      expect(html).toContain('200')
      expect(html).toMatch(/Drawing Table/i)
      expect(html).toContain('20')
      expect(html).toMatch(/Test Packages/i)
      expect(html).toContain('10')
      expect(html).toMatch(/Team Management/i)

      // Footer
      expect(html).toMatch(/Questions/i)
      expect(html).toContain('pipetrak.co')
    })

    it('uses inline styles only (no external CSS)', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt)

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
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt)

      // Calculate size in bytes
      const sizeInBytes = new Blob([html]).size
      const sizeInMB = sizeInBytes / (1024 * 1024)

      // Should be well under 1MB (expect <10KB for simple HTML)
      expect(sizeInMB).toBeLessThan(1)
      // Sanity check: should be at least 500 bytes (not empty)
      expect(sizeInBytes).toBeGreaterThan(500)
    })

    it('includes resend login link in footer with default URL', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt)

      // Should include default login URL
      expect(html).toContain('https://pipetrak.co/login')
      // Should mention that link is single-use
      expect(html).toMatch(/single-use|one.time|only be used once/i)
      // Should provide instructions for getting new link
      expect(html).toMatch(/new login link|request another/i)
    })

    it('includes resend login link with custom URL when provided', () => {
      const customLoginUrl = 'https://app.example.com/auth/login'
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, customLoginUrl)

      // Should include custom login URL
      expect(html).toContain('https://app.example.com/auth/login')
      // Should NOT include default URL
      expect(html).not.toContain('https://pipetrak.co/login')
    })

    it('includes "Request New Login Link" button in footer', () => {
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt)

      // Should include button text
      expect(html).toContain('Request New Login Link')
      // Should be a clickable link/button
      expect(html).toMatch(/href=["'][^"']*login[^"']*["']/i)
    })

    it('pre-fills email in login URL when userEmail provided', () => {
      const userEmail = 'test@example.com'
      const loginUrl = 'https://pipetrak.co/login'
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, loginUrl, userEmail)

      // Should include login URL with email parameter
      expect(html).toContain('https://pipetrak.co/login?email=test%40example.com')
      // Should properly URL-encode the email
      expect(html).toContain('%40') // @ symbol encoded
    })

    it('uses plain login URL when userEmail not provided', () => {
      const loginUrl = 'https://pipetrak.co/login'
      const html = generateDemoEmailHtml(mockFullName, mockMagicLinkUrl, mockDemoExpiresAt, loginUrl)

      // Should include login URL without email parameter
      expect(html).toContain('https://pipetrak.co/login')
      // Should NOT have query parameters
      expect(html).not.toContain('https://pipetrak.co/login?email=')
    })
  })
})
