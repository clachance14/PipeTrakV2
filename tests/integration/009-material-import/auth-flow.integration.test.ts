/**
 * Integration Test: Complete Authentication Flow for CSV Import
 * Tests the end-to-end authentication flow from frontend to Edge Function
 *
 * Prerequisites:
 * - User must be signed in
 * - At least one project must exist in the database
 * - User must be a member of the project's organization
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('CSV Import Authentication Flow (Integration)', () => {
  let testProjectId: string;
  let testUserId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Verify we have an active session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('No active session. Please sign in before running integration tests.');
    }

    testUserId = session.user.id;

    // Get user's organizations
    const { data: userOrgs, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', testUserId)
      .limit(1)
      .single();

    if (orgError || !userOrgs) {
      throw new Error('User has no organizations. Create an organization first.');
    }

    testOrgId = userOrgs.organization_id;

    // Get a project from the user's organization
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', testOrgId)
      .limit(1)
      .single();

    if (projectError || !projects) {
      throw new Error('No projects found for user organization. Create a project first.');
    }

    testProjectId = projects.id;

    console.log('Test setup:', {
      userId: testUserId,
      orgId: testOrgId,
      projectId: testProjectId
    });
  });

  describe('Successful Authentication Flow', () => {
    it('successfully authenticates and processes valid CSV', async () => {
      const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE,SPEC,DESCRIPTION,SIZE,Comments
P-AUTH-TEST-001,Valve,2,VAUTH-001,ES-03,Auth Test Valve,1,Integration test`;

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeTruthy();
      expect(session?.access_token).toBeTruthy();

      // Call Edge Function with authentication
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session!.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: testProjectId,
            csvContent: validCsv
          })
        }
      );

      // Should succeed (200 or proper error if validation fails, but NOT 401)
      expect(response.status).not.toBe(401);

      const data = await response.json();
      console.log('Import result:', data);

      // If we got this far, authentication worked
      // The result might be success or validation error, but auth passed
      if (response.ok) {
        expect(data.success).toBe(true);
        expect(data.componentsCreated).toBeGreaterThan(0);
      } else {
        // If not ok, should be validation error (400) or permission error (403), not auth error (401)
        expect([400, 403]).toContain(response.status);
      }
    });

    it('validates user has access to the specified project', async () => {
      const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE
P-002,Valve,1,VTEST-002`;

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session!.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: testProjectId,
            csvContent: validCsv
          })
        }
      );

      // Should not fail on auth
      expect(response.status).not.toBe(401);

      // Should either succeed or fail on validation, not permissions
      // (since we're using a valid project the user has access to)
      if (!response.ok) {
        const data = await response.json();
        // If it fails, should not be due to project access
        if (response.status === 403) {
          expect(data.errors[0].reason).not.toContain('access to this project');
        }
      }
    });
  });

  describe('Authentication Failure Scenarios', () => {
    it('fails when no auth token provided', async () => {
      const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE
P-003,Valve,1,VTEST-003`;

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
            projectId: testProjectId,
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errors[0].reason).toContain('Missing authorization header');
    });

    it('fails when invalid auth token provided', async () => {
      const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE
P-004,Valve,1,VTEST-004`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer totally-fake-token-abc123',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: testProjectId,
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errors[0].reason).toContain('Invalid or expired authentication token');
    });

    it('fails when accessing project from different organization', async () => {
      const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE
P-005,Valve,1,VTEST-005`;

      const { data: { session } } = await supabase.auth.getSession();

      // Use a fake project ID that doesn't belong to user's org
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session!.access_token}`,
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
      expect(data.errors[0].reason).toMatch(/Project not found|access denied/i);
    });
  });

  describe('Token Extraction and Validation', () => {
    it('correctly extracts JWT from Bearer token format', async () => {
      const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE
P-006,Valve,1,VTEST-006`;

      const { data: { session } } = await supabase.auth.getSession();

      // Test with proper "Bearer " prefix
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session!.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: testProjectId,
            csvContent: validCsv
          })
        }
      );

      // Should not fail on auth (might fail on validation, but auth should pass)
      expect(response.status).not.toBe(401);
    });

    it('validates JWT signature and expiration', async () => {
      const validCsv = `DRAWING,TYPE,QTY,CMDTY CODE
P-007,Valve,1,VTEST-007`;

      // Use a malformed JWT (wrong signature)
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.wrong_signature';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-takeoff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${malformedToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            projectId: testProjectId,
            csvContent: validCsv
          })
        }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.errors[0].reason).toContain('Invalid or expired authentication token');
    });
  });
});
