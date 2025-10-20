/**
 * Contract Test: Edge Function Authentication
 * Tests authentication and authorization for the import-takeoff Edge Function
 *
 * These tests verify:
 * - JWT token validation
 * - Missing/invalid auth headers
 * - Project permission checks
 * - Organization membership validation
 */

import { describe, it, expect } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('Edge Function Authentication Contract', () => {
  const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,1,VTEST-001`;

  describe('Authorization Header Validation', () => {
    it('rejects request with missing Authorization header', async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            // No Authorization header
          },
          body: JSON.stringify({
            projectId: 'fake-project-id',
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(401);

      const data = await response.json();

      // Supabase platform returns {code, message} format for auth errors
      // Our Edge Function returns {success, errors} format
      expect(data.code || (data.success === false ? 401 : 200)).toBe(401);

      if (data.message) {
        // Platform-level error
        expect(data.message).toContain('authorization');
      } else if (data.errors) {
        // Edge Function error
        expect(data.success).toBe(false);
        expect(data.errors[0].reason).toContain('Missing authorization header');
      }
    });

    it('rejects request with invalid JWT token', async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid-token-12345',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: 'fake-project-id',
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(401);

      const data = await response.json();

      // Accept either Supabase platform error or Edge Function error format
      if (data.message) {
        expect(data.message).toMatch(/Invalid|expired|authorization/i);
      } else if (data.errors) {
        expect(data.success).toBe(false);
        expect(data.errors[0].reason).toContain('Invalid or expired authentication token');
      }
    });

    it('rejects request with expired JWT token', async () => {
      // This is a token that was valid in the past but is now expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj0CQ1BbH6T5K_jLQYJxZ6sU3JZi1n3bVN7HcYV4';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${expiredToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: 'fake-project-id',
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(401);

      const data = await response.json();

      // Accept either Supabase platform error or Edge Function error format
      if (data.message) {
        expect(data.message).toMatch(/Invalid|expired|authorization/i);
      } else if (data.errors) {
        expect(data.success).toBe(false);
        expect(data.errors[0].reason).toContain('Invalid or expired authentication token');
      }
    });
  });

  describe('Valid Authentication Flow', () => {
    it('accepts request with valid JWT token', async () => {
      // Get a real session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.warn('Skipping test: No active session. Sign in first.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: 'fake-project-id', // Will fail on project validation, but auth should pass
            csvContent: validCsv
          })
        }
      );

      // Should get past auth (401) but fail on project validation (403)
      expect(response.status).not.toBe(401);

      const data = await response.json();

      // If we got 403, auth worked but project validation failed (expected)
      // If we got 400, auth worked but CSV validation failed (also acceptable)
      if (response.status === 403) {
        expect(data.errors[0].reason).toContain('Project not found or access denied');
      }
    });
  });

  describe('Project Permission Validation', () => {
    it('rejects request for non-existent project', async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.warn('Skipping test: No active session. Sign in first.');
        return;
      }

      const fakeProjectId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: fakeProjectId,
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errors[0].reason).toContain('Project not found or access denied');
    });

    it('rejects request when user not member of project organization', async () => {
      // This test would require setting up a second organization and project
      // For now, we document the expected behavior:
      // - User authenticates successfully
      // - Project exists but belongs to different organization
      // - Edge Function checks user_organizations membership
      // - Returns 403 Unauthorized with "You do not have access to this project"

      // Implementation when multi-org test data available:
      // 1. Create org A with user1
      // 2. Create org B with user2 and project1
      // 3. Attempt import as user1 to project1
      // 4. Expect 403 with specific error message
    });
  });

  describe('CORS Headers', () => {
    it('handles OPTIONS preflight request', async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization, content-type'
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
    });

    it('includes CORS headers in error responses', async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            // No auth header - will trigger 401
          },
          body: JSON.stringify({
            projectId: 'fake',
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(401);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });
});
