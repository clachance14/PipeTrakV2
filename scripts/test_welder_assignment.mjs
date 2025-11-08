/**
 * Test script to diagnose update_component_milestone RPC error
 * when assigning welders
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file
const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

// Use service role to bypass RLS for debugging
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function testWelderAssignment() {
  console.log('=== Testing Welder Assignment RPC ===\n')

  // Step 1: Find a field weld to test with
  console.log('Step 1: Finding a field weld...')
  const { data: fieldWelds, error: fieldWeldsError } = await supabase
    .from('field_welds')
    .select('id, component_id, project_id, welder_id, date_welded')
    .limit(1)

  if (fieldWeldsError) {
    console.error('Error fetching field welds:', fieldWeldsError)
    return
  }

  if (!fieldWelds || fieldWelds.length === 0) {
    console.log('No field welds found in database')
    return
  }

  const fieldWeld = fieldWelds[0]
  console.log('Found field weld:', fieldWeld)
  console.log()

  // Step 2: Get component details
  console.log('Step 2: Getting component details...')
  const { data: component, error: componentError } = await supabase
    .from('components')
    .select('id, component_type, progress_template_id, current_milestones, percent_complete')
    .eq('id', fieldWeld.component_id)
    .single()

  if (componentError) {
    console.error('Error fetching component:', componentError)
    return
  }

  console.log('Component:', component)
  console.log('Current milestones:', component.current_milestones)
  console.log()

  // Step 3: Get a test user
  console.log('Step 3: Getting a test user...')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .limit(1)

  if (usersError) {
    console.error('Error fetching users:', usersError)
    return
  }

  if (!users || users.length === 0) {
    console.log('No users found in database')
    return
  }

  const testUser = users[0]
  console.log('Test user:', testUser)
  console.log()

  // Step 4: Test calling update_component_milestone for Fit-Up
  console.log('Step 4: Testing update_component_milestone for Fit-Up...')
  const { data: fitUpResult, error: fitUpError } = await supabase.rpc('update_component_milestone', {
    p_component_id: component.id,
    p_milestone_name: 'Fit-Up',
    p_new_value: 1,
    p_user_id: testUser.id,
  })

  if (fitUpError) {
    console.error('ERROR calling update_component_milestone for Fit-Up:')
    console.error('Message:', fitUpError.message)
    console.error('Details:', fitUpError.details)
    console.error('Hint:', fitUpError.hint)
    console.error('Code:', fitUpError.code)
    console.log()
  } else {
    console.log('SUCCESS: Fit-Up milestone updated')
    console.log('Result:', JSON.stringify(fitUpResult, null, 2))
    console.log()
  }

  // Step 5: Test calling update_component_milestone for Weld Made
  console.log('Step 5: Testing update_component_milestone for Weld Made...')
  const { data: weldMadeResult, error: weldMadeError } = await supabase.rpc('update_component_milestone', {
    p_component_id: component.id,
    p_milestone_name: 'Weld Made',
    p_new_value: 1,
    p_user_id: testUser.id,
  })

  if (weldMadeError) {
    console.error('ERROR calling update_component_milestone for Weld Made:')
    console.error('Message:', weldMadeError.message)
    console.error('Details:', weldMadeError.details)
    console.error('Hint:', weldMadeError.hint)
    console.error('Code:', weldMadeError.code)
    console.log()
  } else {
    console.log('SUCCESS: Weld Made milestone updated')
    console.log('Result:', JSON.stringify(weldMadeResult, null, 2))
    console.log()
  }

  // Step 6: Check final component state
  console.log('Step 6: Checking final component state...')
  const { data: finalComponent, error: finalError } = await supabase
    .from('components')
    .select('id, current_milestones, percent_complete')
    .eq('id', component.id)
    .single()

  if (finalError) {
    console.error('Error fetching final component state:', finalError)
    return
  }

  console.log('Final component state:')
  console.log('Milestones:', finalComponent.current_milestones)
  console.log('Percent complete:', finalComponent.percent_complete)
}

testWelderAssignment().catch(console.error)
