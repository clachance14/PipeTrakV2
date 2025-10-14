/**
 * Test Factories for Feature 004 (Single-Org Model)
 *
 * Creates test fixtures with required organization_id and role fields
 */

import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

export interface MockUser {
  id: string
  email: string
  full_name?: string | null
  organization_id: string
  role: UserRole
  terms_accepted_at?: string | null
  terms_version?: string | null
  created_at?: string
}

export interface MockOrganization {
  id: string
  name: string
  created_at?: string
  updated_at?: string | null
  deleted_at?: string | null
}

export interface MockSession {
  user: {
    id: string
    email: string
  }
  access_token: string
  token_type: string
  expires_in: number
  expires_at: number
  refresh_token: string
}

/**
 * Create a mock user with single-org model fields
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: overrides?.id || '123',
    email: overrides?.email || 'test@example.com',
    full_name: overrides?.full_name || 'Test User',
    organization_id: overrides?.organization_id || 'org-123',
    role: overrides?.role || 'owner',
    terms_accepted_at: overrides?.terms_accepted_at || new Date().toISOString(),
    terms_version: overrides?.terms_version || '1.0.0',
    created_at: overrides?.created_at || new Date().toISOString(),
  }
}

/**
 * Create a mock organization
 */
export function createMockOrganization(overrides?: Partial<MockOrganization>): MockOrganization {
  return {
    id: overrides?.id || 'org-123',
    name: overrides?.name || 'Test Organization',
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || null,
    deleted_at: overrides?.deleted_at || null,
  }
}

/**
 * Create a mock Supabase session
 */
export function createMockSession(overrides?: Partial<MockSession>): MockSession {
  const userId = overrides?.user?.id || '123'
  const userEmail = overrides?.user?.email || 'test@example.com'

  return {
    user: { id: userId, email: userEmail },
    access_token: overrides?.access_token || 'mock-access-token',
    token_type: overrides?.token_type || 'bearer',
    expires_in: overrides?.expires_in || 3600,
    expires_at: overrides?.expires_at || Date.now() + 3600000,
    refresh_token: overrides?.refresh_token || 'mock-refresh-token',
  }
}

/**
 * Create multiple mock users with different roles
 */
export function createMockUsers(count: number, organizationId: string = 'org-123'): MockUser[] {
  const roles: UserRole[] = ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer']

  return Array.from({ length: count }, (_, i) => {
    const role = roles[i % roles.length]
    return createMockUser({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      full_name: `User ${i + 1}`,
      organization_id: organizationId,
      role,
    })
  })
}

/**
 * Create a mock user with specific role
 */
export function createOwnerUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({ ...overrides, role: 'owner' })
}

export function createAdminUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({ ...overrides, role: 'admin' })
}

export function createViewerUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({ ...overrides, role: 'viewer' })
}

export function createWelderUser(overrides?: Partial<MockUser>): MockUser {
  return createMockUser({ ...overrides, role: 'welder' })
}
