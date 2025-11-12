#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env file
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Service role bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log('=== Field Weld Progress Template ===\n')

// Get progress template for field_weld
const { data: template, error: templateError } = await supabase
  .from('progress_templates')
  .select('*')
  .eq('component_type', 'field_weld')
  .single()

if (templateError) {
  console.error('Error fetching template:', templateError)
} else {
  console.log('Component Type:', template.component_type)
  console.log('Milestones:', JSON.stringify(template.milestones, null, 2))
  console.log('Milestone Order:', template.milestone_order)
  console.log('\n')
}

console.log('=== Actual Milestone Names in Components ===\n')

// Get all field weld components and their milestone keys
const { data: components, error: componentsError } = await supabase
  .from('components')
  .select('id, identifier, current_milestones')
  .eq('component_type', 'field_weld')
  .not('current_milestones', 'is', null)

if (componentsError) {
  console.error('Error fetching components:', componentsError)
} else {
  // Collect all unique milestone keys
  const allMilestoneKeys = new Set()

  components.forEach(comp => {
    if (comp.current_milestones) {
      Object.keys(comp.current_milestones).forEach(key => {
        allMilestoneKeys.add(key)
      })
    }
  })

  console.log('Unique milestone keys found in current_milestones:')
  console.log([...allMilestoneKeys].sort())
  console.log('\n')

  // Show a few examples
  console.log('Sample component milestone data (first 3):')
  components.slice(0, 3).forEach(comp => {
    console.log(`\n${comp.identifier}:`)
    console.log(JSON.stringify(comp.current_milestones, null, 2))
  })
}

console.log('\n=== View Definition Check ===\n')

// Get the current view definition
const { data: viewDef, error: viewError } = await supabase
  .rpc('get_view_definition', { view_name: 'vw_field_weld_progress_by_area' })
  .single()

if (viewError) {
  console.log('Could not get view definition via RPC, trying direct query...')

  // Try direct query to pg_views
  const { data: pgViews, error: pgError } = await supabase
    .from('pg_views')
    .select('definition')
    .eq('schemaname', 'public')
    .eq('viewname', 'vw_field_weld_progress_by_area')
    .single()

  if (pgError) {
    console.error('Error:', pgError)
  } else {
    console.log('Current view uses these milestone checks:')
    const def = pgViews.definition
    const milestoneChecks = def.match(/current_milestones->>'[^']+'\s*=\s*'true'/g) || []
    milestoneChecks.forEach(check => console.log('  -', check))
  }
} else {
  console.log('View definition retrieved')
}
