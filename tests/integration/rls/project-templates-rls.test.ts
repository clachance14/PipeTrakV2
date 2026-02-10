/**
 * RLS Policy Integration Tests: project_progress_templates and project_template_changes
 * Feature: 026-editable-milestone-templates
 * Task: T014
 *
 * Tests verify that Row Level Security policies correctly enforce:
 * - Organization isolation (users can only access their org's templates)
 * - Role-based permissions (only admin/PM can modify templates)
 * - Audit log immutability (no updates/deletes allowed)
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// Test configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client (bypasses RLS for test setup)
let serviceClient: SupabaseClient<Database>

// User clients (subject to RLS policies)
let adminClient: SupabaseClient<Database>
let viewerClient: SupabaseClient<Database>
let outsiderClient: SupabaseClient<Database>

// Test data IDs
let orgId: string
let otherOrgId: string
let projectId: string
let otherProjectId: string
let adminUserId: string
let viewerUserId: string
let outsiderUserId: string

// Cleanup any straggler test users after all tests complete
afterAll(async () => {
  const serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // Delete any @test.com users from users table
  await serviceClient
    .from('users')
    .delete()
    .ilike('email', '%@test.com')

  // List and delete auth users with @test.com emails
  const { data: authUsers } = await serviceClient.auth.admin.listUsers()
  if (authUsers?.users) {
    const testUsers = authUsers.users.filter(u => u.email?.includes('@test.com'))
    for (const user of testUsers) {
      await serviceClient.auth.admin.deleteUser(user.id)
    }
  }
})

describe('RLS Policies: project_progress_templates', () => {
  beforeEach(async () => {
    // Initialize service client (bypasses RLS)
    serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // Create test organizations
    const { data: org1, error: org1Error } = await serviceClient
      .from('organizations')
      .insert({ name: 'Test Org 1' })
      .select('id')
      .single()

    if (org1Error) throw org1Error
    orgId = org1.id

    const { data: org2, error: org2Error } = await serviceClient
      .from('organizations')
      .insert({ name: 'Test Org 2' })
      .select('id')
      .single()

    if (org2Error) throw org2Error
    otherOrgId = org2.id

    // Create test users
    const { data: { user: admin }, error: adminError } = await serviceClient.auth.admin.createUser({
      email: `admin-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true
    })
    if (adminError || !admin) throw adminError || new Error('Admin user creation failed')
    adminUserId = admin.id

    const { data: { user: viewer }, error: viewerError } = await serviceClient.auth.admin.createUser({
      email: `viewer-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true
    })
    if (viewerError || !viewer) throw viewerError || new Error('Viewer user creation failed')
    viewerUserId = viewer.id

    const { data: { user: outsider }, error: outsiderError } = await serviceClient.auth.admin.createUser({
      email: `outsider-${Date.now()}@test.com`,
      password: 'test123456',
      email_confirm: true
    })
    if (outsiderError || !outsider) throw outsiderError || new Error('Outsider user creation failed')
    outsiderUserId = outsider.id

    // Insert users into users table with roles
    await serviceClient.from('users').insert([
      { id: adminUserId, email: `admin-${Date.now()}@test.com`, organization_id: orgId, role: 'admin' },
      { id: viewerUserId, email: `viewer-${Date.now()}@test.com`, organization_id: orgId, role: 'viewer' },
      { id: outsiderUserId, email: `outsider-${Date.now()}@test.com`, organization_id: otherOrgId, role: 'admin' }
    ])

    // Create test projects
    const { data: project, error: projectError } = await serviceClient
      .from('projects')
      .insert({ name: 'Test Project 1', organization_id: orgId })
      .select('id')
      .single()

    if (projectError) throw projectError
    projectId = project.id

    const { data: otherProject, error: otherProjectError } = await serviceClient
      .from('projects')
      .insert({ name: 'Test Project 2', organization_id: otherOrgId })
      .select('id')
      .single()

    if (otherProjectError) throw otherProjectError
    otherProjectId = otherProject.id

    // Seed templates for both projects
    await serviceClient.from('project_progress_templates').insert([
      {
        project_id: projectId,
        component_type: 'Field Weld',
        milestone_name: 'Fit-Up',
        weight: 10,
        milestone_order: 1,
        is_partial: false,
        requires_welder: true
      },
      {
        project_id: projectId,
        component_type: 'Field Weld',
        milestone_name: 'Weld Made',
        weight: 90,
        milestone_order: 2,
        is_partial: true,
        requires_welder: true
      },
      {
        project_id: otherProjectId,
        component_type: 'Valve',
        milestone_name: 'Receive',
        weight: 100,
        milestone_order: 1,
        is_partial: false,
        requires_welder: false
      }
    ])

    // Get auth tokens for user clients
    const { data: _adminSession } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: `admin-${Date.now()}@test.com`
    })

    // Create authenticated clients (subject to RLS)
    adminClient = createClient<Database>(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false
      }
    })
    await adminClient.auth.signInWithPassword({
      email: `admin-${Date.now()}@test.com`,
      password: 'test123456'
    })

    viewerClient = createClient<Database>(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false
      }
    })
    await viewerClient.auth.signInWithPassword({
      email: `viewer-${Date.now()}@test.com`,
      password: 'test123456'
    })

    outsiderClient = createClient<Database>(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false
      }
    })
    await outsiderClient.auth.signInWithPassword({
      email: `outsider-${Date.now()}@test.com`,
      password: 'test123456'
    })
  })

  afterEach(async () => {
    // Cleanup test data
    if (serviceClient) {
      await serviceClient.from('project_progress_templates').delete().eq('project_id', projectId)
      await serviceClient.from('project_progress_templates').delete().eq('project_id', otherProjectId)
      await serviceClient.from('projects').delete().eq('id', projectId)
      await serviceClient.from('projects').delete().eq('id', otherProjectId)
      await serviceClient.from('users').delete().eq('id', adminUserId)
      await serviceClient.from('users').delete().eq('id', viewerUserId)
      await serviceClient.from('users').delete().eq('id', outsiderUserId)
      await serviceClient.from('organizations').delete().eq('id', orgId)
      await serviceClient.from('organizations').delete().eq('id', otherOrgId)

      // Delete auth users
      await serviceClient.auth.admin.deleteUser(adminUserId)
      await serviceClient.auth.admin.deleteUser(viewerUserId)
      await serviceClient.auth.admin.deleteUser(outsiderUserId)
    }
  })

  it('allows org members to view templates in their organization', async () => {
    const { data, error } = await adminClient
      .from('project_progress_templates')
      .select('*')
      .eq('project_id', projectId)

    expect(error).toBeNull()
    expect(data).toHaveLength(2)
    expect(data![0].component_type).toBe('Field Weld')
  })

  it('blocks users from viewing templates in other organizations', async () => {
    const { data, error: _error } = await outsiderClient
      .from('project_progress_templates')
      .select('*')
      .eq('project_id', projectId)

    expect(data).toHaveLength(0) // RLS filters out rows from other orgs
  })

  it('allows admins to update templates in their organization', async () => {
    const { data, error } = await adminClient
      .from('project_progress_templates')
      .update({ weight: 20 })
      .eq('project_id', projectId)
      .eq('milestone_name', 'Fit-Up')
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].weight).toBe(20)
  })

  it('blocks viewers from updating templates', async () => {
    const { error } = await viewerClient
      .from('project_progress_templates')
      .update({ weight: 20 })
      .eq('project_id', projectId)
      .eq('milestone_name', 'Fit-Up')

    expect(error).not.toBeNull()
    expect(error?.message).toContain('new row violates row-level security policy')
  })

  it('blocks users from updating templates in other organizations', async () => {
    const { error } = await outsiderClient
      .from('project_progress_templates')
      .update({ weight: 20 })
      .eq('project_id', projectId)
      .eq('milestone_name', 'Fit-Up')

    expect(error).not.toBeNull()
  })

  it('allows admins to insert templates', async () => {
    const { data, error } = await adminClient
      .from('project_progress_templates')
      .insert({
        project_id: projectId,
        component_type: 'Valve',
        milestone_name: 'Receive',
        weight: 100,
        milestone_order: 1,
        is_partial: false,
        requires_welder: false
      })
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('blocks viewers from inserting templates', async () => {
    const { error } = await viewerClient
      .from('project_progress_templates')
      .insert({
        project_id: projectId,
        component_type: 'Valve',
        milestone_name: 'Install',
        weight: 100,
        milestone_order: 2,
        is_partial: false,
        requires_welder: false
      })

    expect(error).not.toBeNull()
  })

  it('blocks all users from deleting templates (immutable)', async () => {
    const { error } = await adminClient
      .from('project_progress_templates')
      .delete()
      .eq('project_id', projectId)
      .eq('milestone_name', 'Fit-Up')

    expect(error).not.toBeNull()
    expect(error?.message).toContain('row-level security policy')
  })
})

describe('RLS Policies: project_template_changes', () => {
  beforeEach(async () => {
    // Reuse setup from previous describe block
    serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // Seed audit log entry
    await serviceClient.from('project_template_changes').insert({
      project_id: projectId,
      component_type: 'Field Weld',
      changed_by: adminUserId,
      old_weights: [{ milestone_name: 'Fit-Up', weight: 10 }],
      new_weights: [{ milestone_name: 'Fit-Up', weight: 20 }],
      applied_to_existing: false,
      affected_component_count: 0
    })
  })

  it('allows org members to view audit log in their organization', async () => {
    const { data, error } = await adminClient
      .from('project_template_changes')
      .select('*')
      .eq('project_id', projectId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].component_type).toBe('Field Weld')
  })

  it('blocks users from viewing audit log in other organizations', async () => {
    const { data, error: _error } = await outsiderClient
      .from('project_template_changes')
      .select('*')
      .eq('project_id', projectId)

    expect(data).toHaveLength(0)
  })

  it('blocks all users from updating audit records (immutable)', async () => {
    const { error } = await adminClient
      .from('project_template_changes')
      .update({ affected_component_count: 10 })
      .eq('project_id', projectId)

    expect(error).not.toBeNull()
  })

  it('blocks all users from deleting audit records (immutable)', async () => {
    const { error } = await adminClient
      .from('project_template_changes')
      .delete()
      .eq('project_id', projectId)

    expect(error).not.toBeNull()
  })
})
