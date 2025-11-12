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

console.log('=== Progress Template for field_weld ===\n')

const { data, error } = await supabase
  .from('progress_templates')
  .select('*')
  .eq('component_type', 'field_weld')
  .single()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Component Type:', data.component_type)
  console.log('Milestones Config:', JSON.stringify(data.milestones_config, null, 2))
}

console.log('\n=== Unique Milestone Keys in Actual Data ===\n')

const { data: components, error: compError } = await supabase
  .from('components')
  .select('current_milestones')
  .eq('component_type', 'field_weld')
  .not('current_milestones', 'is', null)

if (compError) {
  console.error('Error:', compError)
} else {
  const allKeys = new Set()
  components.forEach(c => {
    if (c.current_milestones && typeof c.current_milestones === 'object') {
      Object.keys(c.current_milestones).forEach(key => allKeys.add(key))
    }
  })
  console.log('Unique keys found:', [...allKeys].sort())
}
