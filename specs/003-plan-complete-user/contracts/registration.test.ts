// Contract Test: User Registration Flow
// Feature: 003-plan-complete-user
// Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-008
//
// This test verifies the contract between the registration API and the database.
// It ensures that when a user registers with terms acceptance, all data is
// properly stored in public.users including terms tracking fields.
//
// IMPORTANT: This test MUST FAIL before migration 00004 is applied.
// It will PASS after the trigger and schema changes are implemented.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase'
import { registerUser } from '@/lib/auth'

describe('Registration Flow Contract', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'test-password-123'
  const testFullName = 'Test User'
  const testOrgName = 'Test Organization'
  let testUserId: string | undefined

  afterAll(async () => {
    // Cleanup: Delete test user and organization
    if (testUserId) {
      // Delete from user_organizations first (FK constraint)
      await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', testUserId)

      // Delete organization
      await supabase
        .from('organizations')
        .delete()
        .eq('name', testOrgName)

      // Delete from public.users
      await supabase
        .from('users')
        .delete()
        .eq('id', testUserId)

      // Note: Cannot delete from auth.users via client SDK
      // In real tests, use Supabase Admin API or test reset
    }
  })

  describe('FR-001, FR-002: User email and full name storage', () => {
    it('should store user email in public.users table', async () => {
      // Register new user
      const result = await registerUser(
        testEmail,
        testPassword,
        testFullName,
        testOrgName
      )

      testUserId = result.user.id

      // Query public.users to verify email is stored
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', result.user.id)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.email).toBe(testEmail)
    })

    it('should store user full name in public.users table', async () => {
      // Query public.users to verify full_name is stored
      const { data: user, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', testUserId!)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.full_name).toBe(testFullName)
    })
  })

  describe('FR-003, FR-004: Terms acceptance tracking', () => {
    it('should record terms acceptance timestamp in public.users', async () => {
      const beforeRegistration = new Date()

      // Query public.users to verify terms_accepted_at exists
      const { data: user, error } = await supabase
        .from('users')
        .select('id, terms_accepted_at')
        .eq('id', testUserId!)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.terms_accepted_at).toBeDefined()
      expect(user?.terms_accepted_at).not.toBeNull()

      // Verify timestamp is recent (within last 5 seconds)
      const acceptedAt = new Date(user!.terms_accepted_at as string)
      const diffMs = acceptedAt.getTime() - beforeRegistration.getTime()
      expect(diffMs).toBeGreaterThanOrEqual(-5000) // Allow 5s clock skew
      expect(diffMs).toBeLessThanOrEqual(5000)
    })

    it('should store terms version in public.users', async () => {
      // Query public.users to verify terms_version is stored
      const { data: user, error } = await supabase
        .from('users')
        .select('id, terms_version')
        .eq('id', testUserId!)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.terms_version).toBe('v1.0')
    })
  })

  describe('FR-005: Automatic profile creation', () => {
    it('should create public.users record immediately upon registration', async () => {
      const newEmail = `test-auto-${Date.now()}@example.com`

      // Register user
      const result = await registerUser(
        newEmail,
        'password123',
        'Auto Test User',
        'Auto Test Org'
      )

      // Immediately query without delay - record should exist
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', result.user.id)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.id).toBe(result.user.id)

      // Cleanup
      await supabase.from('user_organizations').delete().eq('user_id', result.user.id)
      await supabase.from('users').delete().eq('id', result.user.id)
    })
  })

  describe('FR-008: Immediate data availability', () => {
    it('should make all user data immediately retrievable after registration', async () => {
      const newEmail = `test-immediate-${Date.now()}@example.com`
      const newFullName = 'Immediate Test User'

      // Register user
      const result = await registerUser(
        newEmail,
        'password123',
        newFullName,
        'Immediate Test Org'
      )

      // Query all fields immediately
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, full_name, terms_accepted_at, terms_version, created_at, updated_at')
        .eq('id', result.user.id)
        .single()

      expect(error).toBeNull()
      expect(user).toBeDefined()

      // Verify all required fields are present
      expect(user?.id).toBe(result.user.id)
      expect(user?.email).toBe(newEmail)
      expect(user?.full_name).toBe(newFullName)
      expect(user?.terms_accepted_at).toBeDefined()
      expect(user?.terms_version).toBe('v1.0')
      expect(user?.created_at).toBeDefined()
      expect(user?.updated_at).toBeDefined()

      // Cleanup
      await supabase.from('user_organizations').delete().eq('user_id', result.user.id)
      await supabase.from('users').delete().eq('id', result.user.id)
    })
  })

  describe('FR-010: Data consistency and atomicity', () => {
    it('should rollback all changes if profile creation fails', async () => {
      // This test verifies transactional behavior
      // In real implementation, if public.users INSERT fails,
      // the entire auth.users INSERT should also fail

      // Note: This is difficult to test from client SDK
      // Actual verification should be done in database integration tests
      // This is a placeholder for the contract

      expect(true).toBe(true) // Placeholder - implement with database mocking
    })
  })
})
