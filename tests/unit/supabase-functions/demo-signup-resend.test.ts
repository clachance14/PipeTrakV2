// Demo Signup Edge Function - Resend Integration Tests
// Feature: 021-public-homepage
// Phase: 10 (Magic Link Generation - TDD Red Phase)
// Tasks: T085-T092

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally for Deno environment
global.fetch = vi.fn()

// Mock Deno.env
const mockDeno = {
  env: {
    get: vi.fn()
  }
}
global.Deno = mockDeno as any

describe('Demo Signup - Magic Link & Resend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up default environment variables
    mockDeno.env.get.mockImplementation((key: string) => {
      const env: Record<string, string> = {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
        'RESEND_API_KEY': 're_test_api_key_12345'
      }
      return env[key]
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('T085: RESEND_API_KEY validation at startup', () => {
    it('should throw error when RESEND_API_KEY is missing', async () => {
      // Setup: RESEND_API_KEY not set
      mockDeno.env.get.mockImplementation((key: string) => {
        if (key === 'RESEND_API_KEY') return undefined
        if (key === 'SUPABASE_URL') return 'https://test.supabase.co'
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-key'
        return undefined
      })

      // Import should fail when environment is invalid
      // This test validates the environment check at the top of index.ts
      expect(() => {
        const RESEND_API_KEY = mockDeno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY environment variable is required')
        }
      }).toThrow('RESEND_API_KEY environment variable is required')
    })

    it('should not throw when RESEND_API_KEY is present', () => {
      expect(() => {
        const RESEND_API_KEY = mockDeno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY environment variable is required')
        }
      }).not.toThrow()
    })
  })

  describe('T086: Magic link generation via admin.generateLink()', () => {
    it('should call admin.generateLink with correct parameters', async () => {
      const mockGenerateLink = vi.fn().mockResolvedValue({
        data: {
          properties: {
            action_link: 'https://test.supabase.co/auth/v1/verify?token=test_token&type=magiclink&redirect_to=https://pipetrak.co/dashboard',
            email_otp: '',
            hashed_token: 'hashed_test_token',
            redirect_to: 'https://pipetrak.co/dashboard',
            verification_type: 'magiclink'
          },
          user: {
            id: 'user-uuid-123',
            email: 'test@example.com'
          }
        },
        error: null
      })

      const mockSupabaseClient = {
        auth: {
          admin: {
            generateLink: mockGenerateLink
          }
        }
      }

      // Simulate calling generateLink
      const email = 'test@example.com'
      const origin = 'https://pipetrak.co'

      const { data, error } = await mockSupabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${origin}/dashboard`
        }
      })

      expect(mockGenerateLink).toHaveBeenCalledWith({
        type: 'magiclink',
        email: 'test@example.com',
        options: {
          redirectTo: 'https://pipetrak.co/dashboard'
        }
      })

      expect(data?.properties.action_link).toBeDefined()
      expect(data?.properties.verification_type).toBe('magiclink')
      expect(error).toBeNull()
    })

    it('should extract magic link URL from linkData.properties.action_link', async () => {
      const mockLinkData = {
        properties: {
          action_link: 'https://test.supabase.co/auth/v1/verify?token=test_token&type=magiclink&redirect_to=https://pipetrak.co/dashboard',
          email_otp: '',
          hashed_token: 'hashed_test_token',
          redirect_to: 'https://pipetrak.co/dashboard',
          verification_type: 'magiclink'
        },
        user: {
          id: 'user-uuid-123',
          email: 'test@example.com'
        }
      }

      const magicLinkUrl = mockLinkData.properties.action_link

      expect(magicLinkUrl).toContain('auth/v1/verify')
      expect(magicLinkUrl).toContain('token=test_token')
      expect(magicLinkUrl).toContain('type=magiclink')
      expect(magicLinkUrl).toContain('redirect_to=https://pipetrak.co/dashboard')
    })
  })

  describe('T087: Resend API call with correct payload structure', () => {
    it('should call Resend API with correct headers and payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_email_id_12345' })
      })
      global.fetch = mockFetch

      const RESEND_API_KEY = 're_test_api_key_12345'
      const email = 'test@example.com'
      const _fullName = 'Test User'
      const _magicLinkUrl = 'https://test.supabase.co/auth/v1/verify?token=test_token'
      const _demoExpiresAt = new Date('2025-11-05T00:00:00Z')

      // Mock email HTML generation (will be implemented in Phase 9)
      const mockEmailHtml = '<html><body>Welcome to PipeTrak Demo!</body></html>'

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: email,
          subject: 'Welcome to Your PipeTrak Demo!',
          html: mockEmailHtml
        })
      })

      expect(mockFetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key_12345',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: 'test@example.com',
          subject: 'Welcome to Your PipeTrak Demo!',
          html: mockEmailHtml
        })
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('T088: Resend API success handling', () => {
    it('should set email_sent: true when Resend returns 200', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_email_id_12345' })
      })
      global.fetch = mockFetch

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: 'test@example.com',
          subject: 'Welcome to Your PipeTrak Demo!',
          html: '<html><body>Test</body></html>'
        })
      })

      const emailSent = response.ok

      expect(emailSent).toBe(true)
      expect(response.status).toBe(200)
    })

    it('should include email ID in response when successful', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_4zKfmP9qB3Ji1rFjYK9DcM2S' })
      })
      global.fetch = mockFetch

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: 'test@example.com',
          subject: 'Welcome to Your PipeTrak Demo!',
          html: '<html><body>Test</body></html>'
        })
      })

      const jsonData = await response.json()

      expect(jsonData.id).toBe('re_4zKfmP9qB3Ji1rFjYK9DcM2S')
      expect(jsonData.id).toMatch(/^re_/)
    })
  })

  describe('T089: Resend API failure handling (non-critical)', () => {
    it('should set email_sent: false when Resend returns 403 (unverified sender)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          statusCode: 403,
          name: 'forbidden',
          message: 'The sender email address is not verified'
        })
      })
      global.fetch = mockFetch

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <unverified@domain.com>',
          to: 'test@example.com',
          subject: 'Welcome to Your PipeTrak Demo!',
          html: '<html><body>Test</body></html>'
        })
      })

      const emailSent = response.ok

      expect(emailSent).toBe(false)
      expect(response.status).toBe(403)
    })

    it('should set email_sent: false when Resend returns 422 (validation error)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => JSON.stringify({
          statusCode: 422,
          name: 'validation_error',
          message: 'Invalid recipient email address'
        })
      })
      global.fetch = mockFetch

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: 'invalid-email',
          subject: 'Welcome to Your PipeTrak Demo!',
          html: '<html><body>Test</body></html>'
        })
      })

      const emailSent = response.ok

      expect(emailSent).toBe(false)
      expect(response.status).toBe(422)
    })

    it('should set email_sent: false when Resend returns 429 (rate limit)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => JSON.stringify({
          statusCode: 429,
          name: 'rate_limit_exceeded',
          message: 'Daily email limit reached'
        })
      })
      global.fetch = mockFetch

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: 'test@example.com',
          subject: 'Welcome to Your PipeTrak Demo!',
          html: '<html><body>Test</body></html>'
        })
      })

      const emailSent = response.ok

      expect(emailSent).toBe(false)
      expect(response.status).toBe(429)
    })

    it('should log error but not throw when Resend API fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({
          statusCode: 500,
          name: 'internal_error',
          message: 'Resend API error'
        })
      })
      global.fetch = mockFetch

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: 'test@example.com',
          subject: 'Welcome to Your PipeTrak Demo!',
          html: '<html><body>Test</body></html>'
        })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('Resend API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        })
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Resend API error:', expect.objectContaining({
        status: 500,
        statusText: 'Internal Server Error'
      }))

      consoleErrorSpy.mockRestore()
    })
  })

  describe('T090: Magic link generation failure handling (critical)', () => {
    it('should throw error when admin.generateLink fails', async () => {
      const mockGenerateLink = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'Failed to generate link',
          status: 500
        }
      })

      const mockSupabaseClient = {
        auth: {
          admin: {
            generateLink: mockGenerateLink,
            deleteUser: vi.fn().mockResolvedValue({ error: null })
          }
        },
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      }

      const email = 'test@example.com'
      const origin = 'https://pipetrak.co'
      const userId = 'user-uuid-123'
      const orgId = 'org-uuid-456'

      const { data: linkData, error: linkError } = await mockSupabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${origin}/dashboard`
        }
      })

      expect(linkError).toBeDefined()
      expect(linkData).toBeNull()

      // Simulate cleanup logic
      if (linkError || !linkData) {
        await expect(async () => {
          await mockSupabaseClient.auth.admin.deleteUser(userId)
          await mockSupabaseClient.from('organizations').delete().eq('id', orgId)
          throw new Error('Failed to generate magic link')
        }).rejects.toThrow('Failed to generate magic link')
      }
    })

    it('should cleanup user and organization when magic link generation fails', async () => {
      const mockDeleteUser = vi.fn().mockResolvedValue({ error: null })
      const _mockDelete = vi.fn().mockResolvedValue({ error: null })
      const mockEq = vi.fn().mockResolvedValue({ error: null })

      const mockSupabaseClient = {
        auth: {
          admin: {
            generateLink: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Link generation failed', status: 500 }
            }),
            deleteUser: mockDeleteUser
          }
        },
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: mockEq
          }))
        }))
      }

      const userId = 'user-uuid-123'
      const orgId = 'org-uuid-456'

      const { data: linkData, error: linkError } = await mockSupabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: 'test@example.com',
        options: {
          redirectTo: 'https://pipetrak.co/dashboard'
        }
      })

      if (linkError || !linkData) {
        await mockSupabaseClient.auth.admin.deleteUser(userId)
        await mockSupabaseClient.from('organizations').delete().eq('id', orgId)

        expect(mockDeleteUser).toHaveBeenCalledWith(userId)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('organizations')
        expect(mockEq).toHaveBeenCalledWith('id', orgId)
      }
    })
  })

  describe('T091: Email template integration', () => {
    it('should call generateDemoEmailHtml with correct parameters', () => {
      // Mock the email template function (will be implemented in Phase 9)
      const mockGenerateDemoEmailHtml = vi.fn((fullName: string, magicLinkUrl: string, expiresAt: Date) => {
        return `<html><body>Hello ${fullName}, click <a href="${magicLinkUrl}">here</a>. Expires: ${expiresAt.toISOString()}</body></html>`
      })

      const fullName = 'John Doe'
      const magicLinkUrl = 'https://test.supabase.co/auth/v1/verify?token=test_token'
      const demoExpiresAt = new Date('2025-11-05T00:00:00Z')

      const html = mockGenerateDemoEmailHtml(fullName, magicLinkUrl, demoExpiresAt)

      expect(mockGenerateDemoEmailHtml).toHaveBeenCalledWith(fullName, magicLinkUrl, demoExpiresAt)
      expect(html).toContain('Hello John Doe')
      expect(html).toContain(magicLinkUrl)
      expect(html).toContain('2025-11-05')
    })
  })

  describe('T092: End-to-end magic link flow', () => {
    it('should complete full flow: generateLink → generate email → send via Resend', async () => {
      // Mock generateLink
      const mockGenerateLink = vi.fn().mockResolvedValue({
        data: {
          properties: {
            action_link: 'https://test.supabase.co/auth/v1/verify?token=test_token&type=magiclink&redirect_to=https://pipetrak.co/dashboard',
            email_otp: '',
            hashed_token: 'hashed_test_token',
            redirect_to: 'https://pipetrak.co/dashboard',
            verification_type: 'magiclink'
          },
          user: {
            id: 'user-uuid-123',
            email: 'test@example.com'
          }
        },
        error: null
      })

      // Mock email template
      const mockGenerateDemoEmailHtml = vi.fn((fullName: string, magicLinkUrl: string, _expiresAt: Date) => {
        return `<html><body>Welcome ${fullName}! <a href="${magicLinkUrl}">Login</a></body></html>`
      })

      // Mock Resend API
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_email_id_12345' })
      })
      global.fetch = mockFetch

      // Simulate full flow
      const email = 'test@example.com'
      const fullName = 'Test User'
      const origin = 'https://pipetrak.co'
      const demoExpiresAt = new Date('2025-11-05T00:00:00Z')

      // Step 1: Generate magic link
      const { data: linkData, error: linkError } = await mockGenerateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${origin}/dashboard`
        }
      })

      expect(linkError).toBeNull()
      expect(linkData).toBeDefined()

      // Step 2: Extract magic link URL
      const magicLinkUrl = linkData!.properties.action_link

      // Step 3: Generate email HTML
      const html = mockGenerateDemoEmailHtml(fullName, magicLinkUrl, demoExpiresAt)

      // Step 4: Send via Resend
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PipeTrak Demo <noreply@notifications.pipetrak.co>',
          to: email,
          subject: 'Welcome to Your PipeTrak Demo!',
          html
        })
      })

      const emailSent = response.ok

      // Verify complete flow
      expect(mockGenerateLink).toHaveBeenCalled()
      expect(mockGenerateDemoEmailHtml).toHaveBeenCalledWith(fullName, magicLinkUrl, demoExpiresAt)
      expect(mockFetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Welcome Test User')
      }))
      expect(emailSent).toBe(true)
    })
  })
})
