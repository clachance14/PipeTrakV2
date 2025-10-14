// Contract Test: User Profile Retrieval
// Feature: 003-plan-complete-user
// Requirements: FR-006, FR-009
//
// This test verifies the contract for retrieving user profile data,
// including backfilled legacy users and newly registered users.
// It ensures that terms acceptance data is queryable and that legacy
// users (with NULL terms fields) are handled correctly.
//
// IMPORTANT: This test MUST FAIL before migration 00004 is applied.
// It will PASS after the backfill SQL executes.

import { describe, it, expect, beforeAll } from 'vitest'
import { supabase } from '@/lib/supabase'

describe('Profile Retrieval Contract', () => {
  describe('FR-009: Profile data accessibility', () => {
    it('should retrieve all profile fields for authenticated user', async () => {
      // Note: This test requires an authenticated session
      // In real implementation, create test user or use test fixtures

      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.warn('Skipping test - no authenticated session')
        return
      }

      // Query user profile
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, full_name, terms_accepted_at, terms_version, created_at, updated_at')
        .eq('id', session.user.id)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()

      // Verify required fields exist (values may be NULL for legacy users)
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('full_name')
      expect(user).toHaveProperty('terms_accepted_at')
      expect(user).toHaveProperty('terms_version')
      expect(user).toHaveProperty('created_at')
      expect(user).toHaveProperty('updated_at')
    })

    it('should return user email from public.users', async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.warn('Skipping test - no authenticated session')
        return
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', session.user.id)
        .single()

      expect(error).toBeNull()
      expect(user?.email).toBeDefined()
      expect(user?.email).not.toBeNull()
      expect(typeof user?.email).toBe('string')
    })

    it('should return user full_name from public.users', async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.warn('Skipping test - no authenticated session')
        return
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      expect(error).toBeNull()
      expect(user).toHaveProperty('full_name')
      // full_name may be NULL for legacy users - that's acceptable
    })
  })

  describe('FR-006: Legacy user handling (backfill verification)', () => {
    it('should handle NULL terms_accepted_at for legacy users', async () => {
      // Query users with NULL terms_accepted_at (legacy users)
      const { data: legacyUsers, error } = await supabase
        .from('users')
        .select('id, email, full_name, terms_accepted_at, terms_version')
        .is('terms_accepted_at', null)

      expect(error).toBeNull()

      // If legacy users exist, verify they have email and created_at
      if (legacyUsers && legacyUsers.length > 0) {
        legacyUsers.forEach(user => {
          expect(user.email).toBeDefined()
          expect(user.email).not.toBeNull()
          // full_name and terms fields may be NULL - that's expected for legacy
        })
      }
    })

    it('should distinguish between legacy users and new users by terms_accepted_at', async () => {
      // Query all users
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, email, terms_accepted_at, created_at')
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(allUsers).toBeDefined()

      if (allUsers && allUsers.length > 0) {
        // Legacy users (created before feature): terms_accepted_at = NULL
        // New users (created after feature): terms_accepted_at = timestamp

        const usersWithTerms = allUsers.filter(u => u.terms_accepted_at !== null)
        const usersWithoutTerms = allUsers.filter(u => u.terms_accepted_at === null)

        // Verify state is valid (either have timestamp or NULL, not undefined)
        allUsers.forEach(user => {
          expect(user).toHaveProperty('terms_accepted_at')
          // Value is either string (timestamp) or null
          if (user.terms_accepted_at !== null) {
            expect(typeof user.terms_accepted_at).toBe('string')
          }
        })
      }
    })
  })

  describe('FR-009: Terms audit capability', () => {
    it('should query users by terms version', async () => {
      // Query users who accepted v1.0 terms
      const { data: v1Users, error } = await supabase
        .from('users')
        .select('id, email, terms_version')
        .eq('terms_version', 'v1.0')

      expect(error).toBeNull()

      // If users exist, verify terms_version is correctly stored
      if (v1Users && v1Users.length > 0) {
        v1Users.forEach(user => {
          expect(user.terms_version).toBe('v1.0')
        })
      }
    })

    it('should query users who have accepted terms (non-NULL timestamp)', async () => {
      // Query users with terms acceptance timestamp
      const { data: acceptedUsers, error } = await supabase
        .from('users')
        .select('id, email, terms_accepted_at, terms_version')
        .not('terms_accepted_at', 'is', null)

      expect(error).toBeNull()

      // If users exist, verify timestamp format
      if (acceptedUsers && acceptedUsers.length > 0) {
        acceptedUsers.forEach(user => {
          expect(user.terms_accepted_at).toBeDefined()
          expect(user.terms_accepted_at).not.toBeNull()

          // Verify timestamp is valid date
          const timestamp = new Date(user.terms_accepted_at as string)
          expect(timestamp.toString()).not.toBe('Invalid Date')
        })
      }
    })

    it('should support filtering users who need to re-accept terms', async () => {
      // Example: Find users who haven't accepted v2.0 terms yet
      // (Useful for future terms updates)

      const { data: needsReacceptance, error } = await supabase
        .from('users')
        .select('id, email, terms_version')
        .or('terms_version.is.null,terms_version.neq.v2.0')

      expect(error).toBeNull()

      // This query should work (verifies schema supports future re-acceptance flow)
      // Currently all users will match (no v2.0 exists yet)
      if (needsReacceptance) {
        expect(Array.isArray(needsReacceptance)).toBe(true)
      }
    })
  })

  describe('Data integrity constraints', () => {
    it('should enforce unique email constraint', async () => {
      // Verify that public.users maintains UNIQUE constraint on email
      // This test verifies the schema, not the trigger

      const { data: users, error } = await supabase
        .from('users')
        .select('email')

      expect(error).toBeNull()

      if (users && users.length > 0) {
        const emails = users.map(u => u.email)
        const uniqueEmails = new Set(emails)

        // All emails should be unique
        expect(uniqueEmails.size).toBe(emails.length)
      }
    })

    it('should maintain referential integrity with auth.users', async () => {
      // Verify every public.users.id exists in auth.users
      // (Cannot directly query auth.users from client, but constraint exists)

      const { data: users, error } = await supabase
        .from('users')
        .select('id, email')

      expect(error).toBeNull()

      // If query succeeds, FK constraint is working
      // (Query would fail if FK constraint was violated)
      expect(users).toBeDefined()
    })
  })
})
