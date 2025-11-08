/**
 * Integration Tests: Demo Skeleton Creation SQL Function
 * Feature: 023-demo-data-population
 * Tests: T042-T047
 *
 * Purpose: Verify create_demo_skeleton SQL function behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Use service role for admin access (bypasses RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// Test data cleanup tracking
let testOrgId: string | null = null
let testProjectId: string | null = null

describe('Demo Skeleton Creation SQL Function', () => {
  beforeEach(async () => {
    // Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: `Test Org ${Date.now()}` })
      .select()
      .single()

    if (orgError) throw new Error(`Failed to create test org: ${orgError.message}`)
    testOrgId = org.id

    // Create test project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        organization_id: testOrgId,
        name: `Test Project ${Date.now()}`
      })
      .select()
      .single()

    if (projectError) throw new Error(`Failed to create test project: ${projectError.message}`)
    testProjectId = project.id
  })

  afterEach(async () => {
    // Cleanup test data (cascade delete via FK constraints)
    if (testProjectId) {
      await supabase.from('projects').delete().eq('id', testProjectId)
    }
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId)
    }

    testOrgId = null
    testProjectId = null
  })

  // T042: Exactly 5 areas
  it('should create exactly 5 areas', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call create_demo_skeleton function
    const { error } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy user ID for tests
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(error).toBeNull()

    // Verify exactly 5 areas created
    const { count, error: countError } = await supabase
      .from('areas')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(countError).toBeNull()
    expect(count).toBe(5)

    // Verify area names
    const { data: areas } = await supabase
      .from('areas')
      .select('name')
      .eq('project_id', testProjectId)
      .order('name')

    const expectedAreas = [
      'Containment Area',
      'Cooling Tower',
      'ISBL',
      'Pipe Rack',
      'Water Process'
    ]

    expect(areas?.map(a => a.name).sort()).toEqual(expectedAreas.sort())
  })

  // T043: Exactly 5 systems
  it('should create exactly 5 systems', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call create_demo_skeleton function
    const { error } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(error).toBeNull()

    // Verify exactly 5 systems created
    const { count, error: countError } = await supabase
      .from('systems')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(countError).toBeNull()
    expect(count).toBe(5)

    // Verify system names
    const { data: systems } = await supabase
      .from('systems')
      .select('name')
      .eq('project_id', testProjectId)
      .order('name')

    const expectedSystems = [
      'Air',
      'Condensate',
      'Nitrogen',
      'Process',
      'Steam'
    ]

    expect(systems?.map(s => s.name).sort()).toEqual(expectedSystems.sort())
  })

  // T044: Exactly 10 packages
  it('should create exactly 10 test packages', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call create_demo_skeleton function
    const { error } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(error).toBeNull()

    // Verify exactly 10 packages created
    const { count, error: countError } = await supabase
      .from('test_packages')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(countError).toBeNull()
    expect(count).toBe(10)

    // Verify package names
    const { data: packages } = await supabase
      .from('test_packages')
      .select('name')
      .eq('project_id', testProjectId)
      .order('name')

    const expectedPackages = [
      'TP-01', 'TP-02', 'TP-03', 'TP-04', 'TP-05',
      'TP-06', 'TP-07', 'TP-08', 'TP-09', 'TP-10'
    ]

    expect(packages?.map(p => p.name).sort()).toEqual(expectedPackages.sort())
  })

  // T045: Exactly 4 welders
  it('should create exactly 4 welders', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call create_demo_skeleton function
    const { error } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(error).toBeNull()

    // Verify exactly 4 welders created
    const { count, error: countError } = await supabase
      .from('welders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(countError).toBeNull()
    expect(count).toBe(4)

    // Verify welder stencils and names
    const { data: welders } = await supabase
      .from('welders')
      .select('stencil, stencil_norm, name')
      .eq('project_id', testProjectId)
      .order('stencil')

    const expectedWelders = [
      { stencil: 'JD-123', stencil_norm: 'JD-123', name: 'John Davis' },
      { stencil: 'KL-012', stencil_norm: 'KL-012', name: 'Kim Lee' },
      { stencil: 'SM-456', stencil_norm: 'SM-456', name: 'Sarah Miller' },
      { stencil: 'TR-789', stencil_norm: 'TR-789', name: 'Tom Rodriguez' }
    ]

    expect(welders?.sort((a, b) => a.stencil.localeCompare(b.stencil))).toEqual(
      expectedWelders.sort((a, b) => a.stencil.localeCompare(b.stencil))
    )
  })

  // T046: Completes in <2s
  it('should complete in less than 2 seconds', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    const startTime = Date.now()

    // Call create_demo_skeleton function
    const { error } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    const executionTime = Date.now() - startTime

    expect(error).toBeNull()

    // Verify execution time <2 seconds
    expect(executionTime).toBeLessThan(2000)

    // Verify all data created
    const { count: areaCount } = await supabase
      .from('areas')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(areaCount).toBe(5)
  })

  // T047: Idempotent (safe to retry)
  it('should be idempotent on retry', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // First call
    const { error: error1 } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(error1).toBeNull()

    // Get counts after first call
    const { count: areaCount1 } = await supabase
      .from('areas')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: systemCount1 } = await supabase
      .from('systems')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: packageCount1 } = await supabase
      .from('test_packages')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: welderCount1 } = await supabase
      .from('welders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(areaCount1).toBe(5)
    expect(systemCount1).toBe(5)
    expect(packageCount1).toBe(10)
    expect(welderCount1).toBe(4)

    // Second call (retry)
    const { error: error2 } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(error2).toBeNull()

    // Get counts after second call - should be SAME (no duplicates)
    const { count: areaCount2 } = await supabase
      .from('areas')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: systemCount2 } = await supabase
      .from('systems')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: packageCount2 } = await supabase
      .from('test_packages')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: welderCount2 } = await supabase
      .from('welders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    // Verify no duplicates created
    expect(areaCount2).toBe(5)
    expect(systemCount2).toBe(5)
    expect(packageCount2).toBe(10)
    expect(welderCount2).toBe(4)

    // Verify counts unchanged
    expect(areaCount2).toBe(areaCount1)
    expect(systemCount2).toBe(systemCount1)
    expect(packageCount2).toBe(packageCount1)
    expect(welderCount2).toBe(welderCount1)
  })
})
