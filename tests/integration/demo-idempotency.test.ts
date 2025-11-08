/**
 * Integration Tests: Demo Population Idempotency
 * Feature: 023-demo-data-population
 * Tests: T048-T051
 *
 * Purpose: Verify retry scenarios without duplicates
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

describe('Demo Population Idempotency', () => {
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

  // T048: Skeleton retry creates no duplicates
  it('should not create duplicates when skeleton called twice', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // First skeleton call
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

    // Verify initial creation
    expect(areaCount1).toBe(5)
    expect(systemCount1).toBe(5)
    expect(packageCount1).toBe(10)
    expect(welderCount1).toBe(4)

    // Second skeleton call (retry)
    const { error: error2 } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(error2).toBeNull()

    // Get counts after retry
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

    // Verify NO duplicates (counts unchanged)
    expect(areaCount2).toBe(5)
    expect(systemCount2).toBe(5)
    expect(packageCount2).toBe(10)
    expect(welderCount2).toBe(4)

    // Verify exact same counts
    expect(areaCount2).toBe(areaCount1)
    expect(systemCount2).toBe(systemCount1)
    expect(packageCount2).toBe(packageCount1)
    expect(welderCount2).toBe(welderCount1)
  })

  // T049: Population retry creates no duplicates
  it('should not create duplicates when population called twice', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Create skeleton first
    const { error: skeletonError } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(skeletonError).toBeNull()

    // First population call
    const { data: data1, error: error1 } = await supabase.functions.invoke(
      'populate-demo-data',
      {
        body: {
          projectId: testProjectId,
          organizationId: testOrgId
        }
      }
    )

    expect(error1).toBeNull()
    expect(data1?.success).toBe(true)

    // Get counts after first population
    const { count: componentCount1 } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: drawingCount1 } = await supabase
      .from('drawings')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: weldCount1 } = await supabase
      .from('field_welds')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    // Verify initial population
    expect(componentCount1).toBeGreaterThan(0)
    expect(drawingCount1).toBeGreaterThan(0)
    expect(weldCount1).toBeGreaterThan(0)

    // Second population call (retry)
    const { data: data2, error: error2 } = await supabase.functions.invoke(
      'populate-demo-data',
      {
        body: {
          projectId: testProjectId,
          organizationId: testOrgId
        }
      }
    )

    expect(error2).toBeNull()
    expect(data2?.success).toBe(true)

    // Get counts after retry
    const { count: componentCount2 } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: drawingCount2 } = await supabase
      .from('drawings')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    const { count: weldCount2 } = await supabase
      .from('field_welds')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    // Verify NO duplicates (counts unchanged)
    expect(componentCount2).toBe(componentCount1)
    expect(drawingCount2).toBe(drawingCount1)
    expect(weldCount2).toBe(weldCount1)

    // Verify response shows 0 created (all skipped due to idempotency)
    expect(data2.componentsCreated).toBe(0)
    expect(data2.drawingsCreated).toBe(0)
    expect(data2.weldsCreated).toBe(0)
  }, 120000) // 2 minute timeout for two population calls

  // T050: Partial + retry completes dataset
  it('should complete dataset after partial population', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Create skeleton first
    const { error: skeletonError } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(skeletonError).toBeNull()

    // Simulate partial success by manually creating only some components
    // First, get skeleton lookups
    const { data: areas } = await supabase
      .from('areas')
      .select('id, name')
      .eq('project_id', testProjectId)

    const { data: systems } = await supabase
      .from('systems')
      .select('id, name')
      .eq('project_id', testProjectId)

    const { data: packages } = await supabase
      .from('test_packages')
      .select('id, name')
      .eq('project_id', testProjectId)

    // Create a single test drawing
    const { data: drawing } = await supabase
      .from('drawings')
      .insert({
        project_id: testProjectId,
        organization_id: testOrgId,
        drawing_no_norm: 'TEST-DWG-001',
        drawing_number: 'TEST-DWG-001',
        revision: 'A',
        area_id: areas?.[0]?.id,
        system_id: systems?.[0]?.id
      })
      .select()
      .single()

    // Create a few test components (simulating partial population)
    const partialComponents = Array.from({ length: 10 }, (_, i) => ({
      project_id: testProjectId,
      organization_id: testOrgId,
      component_type: 'spool',
      tag: `PARTIAL-${String(i + 1).padStart(3, '0')}`,
      identity_key: `partial-spool-${i + 1}`,
      drawing_id: drawing?.id,
      area_id: areas?.[0]?.id,
      system_id: systems?.[0]?.id,
      test_package_id: packages?.[0]?.id
    }))

    await supabase.from('components').insert(partialComponents)

    // Verify partial state
    const { count: partialCount } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(partialCount).toBe(10)

    // Now call full population (should add remaining components)
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    expect(error).toBeNull()
    expect(data?.success).toBe(true)

    // Verify full dataset completed
    const { count: finalCount } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    // Should have original 10 + ~200 from seed data (allow variance)
    // Note: Some seed data components might conflict with partial components
    expect(finalCount).toBeGreaterThanOrEqual(190)
    expect(finalCount).toBeLessThanOrEqual(220)

    // Verify retry creates no duplicates
    const { data: retryData, error: retryError } = await supabase.functions.invoke(
      'populate-demo-data',
      {
        body: {
          projectId: testProjectId,
          organizationId: testOrgId
        }
      }
    )

    expect(retryError).toBeNull()
    expect(retryData?.success).toBe(true)

    const { count: retryCount } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    // Count should be unchanged
    expect(retryCount).toBe(finalCount)
  }, 120000)

  // T051: Error recovery scenarios
  it('should handle and recover from errors', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Test 1: Call population WITHOUT skeleton (should fail gracefully)
    const { data: noSkeletonData, error: noSkeletonError } = await supabase.functions.invoke(
      'populate-demo-data',
      {
        body: {
          projectId: testProjectId,
          organizationId: testOrgId
        }
      }
    )

    // Should return error indicating skeleton not found
    expect(noSkeletonData?.success).toBe(false)
    expect(noSkeletonData?.errors).toBeDefined()
    expect(noSkeletonData?.errors?.length).toBeGreaterThan(0)
    expect(noSkeletonData?.errors?.[0]).toMatch(/No (areas|systems|packages|welders) found/)

    // Test 2: Create skeleton and verify recovery
    const { error: skeletonError } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    expect(skeletonError).toBeNull()

    // Test 3: Now population should succeed
    const { data: successData, error: successError } = await supabase.functions.invoke(
      'populate-demo-data',
      {
        body: {
          projectId: testProjectId,
          organizationId: testOrgId
        }
      }
    )

    expect(successError).toBeNull()
    expect(successData?.success).toBe(true)
    expect(successData?.componentsCreated).toBeGreaterThan(0)
    expect(successData?.drawingsCreated).toBeGreaterThan(0)

    // Test 4: Call with invalid project ID (should fail gracefully)
    const { data: invalidData } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: '00000000-0000-0000-0000-000000000000',
        organizationId: testOrgId
      }
    })

    // Should fail but not throw exception
    expect(invalidData?.success).toBe(false)
    expect(invalidData?.errors).toBeDefined()

    // Test 5: Call with missing parameters (should fail gracefully)
    const { data: missingData } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId
        // Missing organizationId
      }
    })

    // Should fail with validation error
    expect(missingData?.success).toBe(false)
    expect(missingData?.error).toBeDefined()
    expect(missingData?.error).toMatch(/Missing required fields/)
  }, 120000)
})
