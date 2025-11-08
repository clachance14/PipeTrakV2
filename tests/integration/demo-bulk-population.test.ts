/**
 * Integration Tests: Demo Bulk Population Edge Function
 * Feature: 023-demo-data-population
 * Tests: T035-T041
 *
 * Purpose: Verify populate-demo-data Edge Function behavior
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

describe('Demo Bulk Population Edge Function', () => {
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

    // Create skeleton structure first (required for population)
    const { error: skeletonError } = await supabase.rpc('create_demo_skeleton', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy user ID for tests
      p_org_id: testOrgId,
      p_project_id: testProjectId
    })

    if (skeletonError) {
      throw new Error(`Failed to create skeleton: ${skeletonError.message}`)
    }
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

  // T035: Happy path - empty project to full population
  it('should populate empty project with full dataset', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call populate-demo-data Edge Function
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    // Verify response
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)

    // Verify counts
    expect(data.componentsCreated).toBeGreaterThanOrEqual(190) // ~200 components (allow small variance)
    expect(data.componentsCreated).toBeLessThanOrEqual(210)
    expect(data.drawingsCreated).toBe(20) // Exactly 20 drawings
    expect(data.weldsCreated).toBeGreaterThanOrEqual(110) // ~120 welds (allow small variance)
    expect(data.weldsCreated).toBeLessThanOrEqual(130)

    // Verify database counts
    const { count: componentCount } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(componentCount).toBeGreaterThanOrEqual(190)
    expect(componentCount).toBeLessThanOrEqual(210)
  }, 60000) // 60 second timeout for population

  // T036: Exactly 20 drawings
  it('should create exactly 20 drawings', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call populate-demo-data Edge Function
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)
    expect(data.drawingsCreated).toBe(20)

    // Verify database count
    const { count, error: countError } = await supabase
      .from('drawings')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(countError).toBeNull()
    expect(count).toBe(20)
  }, 60000)

  // T037: Exactly 200 components with distribution
  it('should create 200 components with correct distribution', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call populate-demo-data Edge Function
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)

    // Verify total count (allow small variance)
    expect(data.componentsCreated).toBeGreaterThanOrEqual(190)
    expect(data.componentsCreated).toBeLessThanOrEqual(210)

    // Verify distribution by component type
    const { data: spools } = await supabase
      .from('components')
      .select('id')
      .eq('project_id', testProjectId)
      .eq('component_type', 'spool')

    const { data: supports } = await supabase
      .from('components')
      .select('id')
      .eq('project_id', testProjectId)
      .eq('component_type', 'support')

    const { data: valves } = await supabase
      .from('components')
      .select('id')
      .eq('project_id', testProjectId)
      .eq('component_type', 'valve')

    const { data: flanges } = await supabase
      .from('components')
      .select('id')
      .eq('project_id', testProjectId)
      .eq('component_type', 'flange')

    const { data: instruments } = await supabase
      .from('components')
      .select('id')
      .eq('project_id', testProjectId)
      .eq('component_type', 'instrument')

    // Verify approximate distribution (allow 10% variance)
    expect(spools?.length).toBeGreaterThanOrEqual(36) // ~40 spools
    expect(spools?.length).toBeLessThanOrEqual(44)

    expect(supports?.length).toBeGreaterThanOrEqual(72) // ~80 supports
    expect(supports?.length).toBeLessThanOrEqual(88)

    expect(valves?.length).toBeGreaterThanOrEqual(45) // ~50 valves
    expect(valves?.length).toBeLessThanOrEqual(55)

    expect(flanges?.length).toBeGreaterThanOrEqual(18) // ~20 flanges
    expect(flanges?.length).toBeLessThanOrEqual(22)

    expect(instruments?.length).toBeGreaterThanOrEqual(9) // ~10 instruments
    expect(instruments?.length).toBeLessThanOrEqual(11)
  }, 60000)

  // T038: ~120 welds
  it('should create approximately 120 field welds', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call populate-demo-data Edge Function
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)

    // Verify ~120 welds (allow variance)
    expect(data.weldsCreated).toBeGreaterThanOrEqual(110)
    expect(data.weldsCreated).toBeLessThanOrEqual(130)

    // Verify database count
    const { count, error: countError } = await supabase
      .from('field_welds')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    expect(countError).toBeNull()
    expect(count).toBeGreaterThanOrEqual(110)
    expect(count).toBeLessThanOrEqual(130)
  }, 60000)

  // T039: Execution time <45s
  it('should complete in less than 45 seconds', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    const startTime = Date.now()

    // Call populate-demo-data Edge Function
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    const executionTime = Date.now() - startTime

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)

    // Verify execution time from response
    expect(data.executionTimeMs).toBeLessThan(45000) // <45 seconds

    // Also verify actual wall clock time
    expect(executionTime).toBeLessThan(45000)
  }, 60000)

  // T040: All FKs resolved correctly
  it('should have all foreign keys resolved correctly', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call populate-demo-data Edge Function
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)

    // Verify no orphaned components (all have valid drawing_id)
    const { data: orphanedComponents } = await supabase
      .from('components')
      .select('id, tag, drawing_id')
      .eq('project_id', testProjectId)
      .is('drawing_id', null)

    expect(orphanedComponents?.length).toBe(0)

    // Verify all components have valid area_id
    const { data: componentsWithoutArea } = await supabase
      .from('components')
      .select('id, tag, area_id')
      .eq('project_id', testProjectId)
      .is('area_id', null)

    expect(componentsWithoutArea?.length).toBe(0)

    // Verify all components have valid system_id
    const { data: componentsWithoutSystem } = await supabase
      .from('components')
      .select('id, tag, system_id')
      .eq('project_id', testProjectId)
      .is('system_id', null)

    expect(componentsWithoutSystem?.length).toBe(0)

    // Verify all components have valid test_package_id
    const { data: componentsWithoutPackage } = await supabase
      .from('components')
      .select('id, tag, test_package_id')
      .eq('project_id', testProjectId)
      .is('test_package_id', null)

    expect(componentsWithoutPackage?.length).toBe(0)

    // Verify no orphaned welds (all have valid drawing_id)
    const { data: orphanedWelds } = await supabase
      .from('field_welds')
      .select('id, weld_number, drawing_id')
      .eq('project_id', testProjectId)
      .is('drawing_id', null)

    expect(orphanedWelds?.length).toBe(0)
  }, 60000)

  // T041: Welder assignments match "Weld Made"
  it('should assign welders only to completed welds', async () => {
    if (!testProjectId || !testOrgId) {
      throw new Error('Test setup failed: missing project or org ID')
    }

    // Call populate-demo-data Edge Function
    const { data, error } = await supabase.functions.invoke('populate-demo-data', {
      body: {
        projectId: testProjectId,
        organizationId: testOrgId
      }
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.success).toBe(true)

    // Verify welders assigned (~65% of welds per spec)
    expect(data.weldersAssigned).toBeGreaterThan(0)

    // Fetch all welds with welder assignments
    const { data: weldsWithWelders } = await supabase
      .from('field_welds')
      .select('id, weld_number, weld_made, welder_id')
      .eq('project_id', testProjectId)
      .not('welder_id', 'is', null)

    // Verify ALL welds with welders have weld_made = true
    weldsWithWelders?.forEach(weld => {
      expect(weld.weld_made).toBe(true)
    })

    // Fetch all welds without weld_made
    const { data: weldsNotMade } = await supabase
      .from('field_welds')
      .select('id, weld_number, weld_made, welder_id')
      .eq('project_id', testProjectId)
      .eq('weld_made', false)

    // Verify NO welds without weld_made have welders
    weldsNotMade?.forEach(weld => {
      expect(weld.welder_id).toBeNull()
    })

    // Verify approximately 65% of welds have welders (allow 10% variance)
    const { count: totalWelds } = await supabase
      .from('field_welds')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', testProjectId)

    if (totalWelds) {
      const assignmentPercentage = (weldsWithWelders?.length || 0) / totalWelds
      expect(assignmentPercentage).toBeGreaterThanOrEqual(0.55) // 55% minimum
      expect(assignmentPercentage).toBeLessThanOrEqual(0.75) // 75% maximum
    }
  }, 60000)
})
